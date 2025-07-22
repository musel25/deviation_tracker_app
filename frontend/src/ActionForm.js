// deviation_tracker_app/frontend/src/ActionForm.js (FINALIZED - Optimized for no refresh on update, responsible users fix, ESLint cleanup)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom'; // Removed useNavigate as it's not used here
import { useAuth } from './AuthContext';

// Move initialFormState outside the component to ensure it's a stable reference (Fixes ESLint warning)
const initialFormState = {
    action_description: '',
    action_responsible: '',
    action_responsible_users: [],
    action_expiration_date: '',
    reminder_sent: false,
};

// Helper function for date formatting
const formatDateForInput = (isoDateString) => {
    if (!isoDateString) return '';
    try {
        if (isoDateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return isoDateString;
        }
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) {
            console.error("Invalid date string for formatting:", isoDateString);
            return '';
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date for input:", isoDateString, e);
        return '';
    }
};


function ActionForm({ onActionSubmitted, actionIdToEdit, onCancelEdit }) {
    const { devNumber } = useParams();
    const isEditMode = !!actionIdToEdit;

    const [formData, setFormData] = useState(initialFormState);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [loadingInitialData, setLoadingInitialData] = useState(isEditMode);
    const [errorInitialData, setErrorInitialData] = useState(null);

    const { accessToken, isAuthenticated } = useAuth();

    const [allUsers, setAllUsers] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [responsibleSearchTerm, setResponsibleSearchTerm] = useState('');
    const [selectedResponsibleUsers, setSelectedResponsibleUsers] = useState([]);
    const responsibleInputRef = useRef(null);

    // Effect to fetch all users for autocomplete suggestions
    useEffect(() => {
        if (isAuthenticated && accessToken) {
            fetch('/api/users/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            })
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    setAllUsers(data);
                })
                .catch(error => {
                    console.error("Error fetching users for autocomplete:", error);
                });
        }
    }, [isAuthenticated, accessToken]);

    // Effect to fetch existing action data if in edit mode
    useEffect(() => {
        if (!isEditMode) {
            // Reset form state for "Add New Action" mode
            setFormData(initialFormState);
            setSelectedResponsibleUsers([]);
            setResponsibleSearchTerm('');
            setLoadingInitialData(false);
            setErrorInitialData(null); // Clear any previous errors
            return; // Exit early if not in edit mode
        }

        // Only proceed if in edit mode and we have the necessary context
        // Crucially, `allUsers.length > 0` ensures users are loaded before populating form data
        if (isEditMode && devNumber && actionIdToEdit && isAuthenticated && accessToken && allUsers.length > 0) {
            setLoadingInitialData(true); // Set loading to true when starting fetch

            const fetchActionData = async () => {
                try {
                    const response = await fetch(`/api/deviations/${devNumber}/actions/${actionIdToEdit}/`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });
                    if (!response.ok) {
                        if (response.status === 401 || response.status === 403) {
                            throw new Error("Authentication failed or token expired. Please log in again.");
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    const initialFormData = {
                        ...data,
                        action_expiration_date: formatDateForInput(data.action_expiration_date),
                        action_responsible_users: [], // Will be populated with IDs below
                    };

                    // Populate selectedResponsibleUsers for display and formData.action_responsible_users for submission
                    const responsibleUserIDs = [];
                    const responsibleUsersForDisplay = [];

                    // The backend's ActionSerializer.to_representation sends full names/usernames.
                    // We need to match these back to user IDs from our `allUsers` list.
                    if (data.action_responsible_users && Array.isArray(data.action_responsible_users)) {
                        data.action_responsible_users.forEach(apiResponsibleName => {
                            const foundUser = allUsers.find(user => {
                                const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                return userFullName === apiResponsibleName || user.username === apiResponsibleName;
                            });
                            if (foundUser) {
                                responsibleUserIDs.push(foundUser.id);
                                responsibleUsersForDisplay.push(foundUser);
                            } else {
                                console.warn(`User with name/username "${apiResponsibleName}" from API not found in local user list.`);
                            }
                        });
                    }

                    // Fallback to the old `action_responsible` string field if `action_responsible_users` is empty
                    // This helps with older data that hasn't been re-saved using the new multi-select.
                    if (responsibleUserIDs.length === 0 && data.action_responsible && typeof data.action_responsible === 'string') {
                        const responsibleNamesFromOldField = data.action_responsible.split(',').map(name => name.trim());
                        responsibleNamesFromOldField.forEach(oldName => {
                            const foundUser = allUsers.find(user => {
                                const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                return userFullName === oldName || user.username === oldName;
                            });
                             if (foundUser) {
                                responsibleUserIDs.push(foundUser.id);
                                responsibleUsersForDisplay.push(foundUser);
                            } else {
                                console.warn(`User with old name "${oldName}" from 'action_responsible' not found in local user list.`);
                            }
                        });
                    }

                    setSelectedResponsibleUsers(responsibleUsersForDisplay);
                    setFormData(prevData => ({
                        ...initialFormData, // Apply all initial data
                        action_responsible_users: responsibleUserIDs, // Set the actual user IDs for submission
                    }));
                    setLoadingInitialData(false);
                    setErrorInitialData(null); // Clear errors once data is loaded
                } catch (error) {
                    console.error("Error fetching initial action data:", error);
                    setErrorInitialData(error);
                    setLoadingInitialData(false);
                }
            };

            fetchActionData(); // Call fetch inside the conditional block

        } else if (isEditMode) {
             // If in edit mode but required dependencies (like allUsers) are not yet ready,
             // indicate loading. This state handles the brief moment before allUsers is populated.
             setLoadingInitialData(true);
             setErrorInitialData(null); // Clear errors from previous fetches
        }

    }, [isEditMode, devNumber, actionIdToEdit, accessToken, isAuthenticated, allUsers]); // initialFormState removed from here


    // Memoized handlers for performance (optional, but good practice)
    const handleResponsibleInputChange = useCallback((e) => {
        const value = e.target.value;
        setResponsibleSearchTerm(value);

        if (value.length > 1) {
            const filtered = allUsers.filter(user =>
                // Filter out users already selected and match by username, first_name, or last_name
                !selectedResponsibleUsers.some(selectedUser => selectedUser.id === user.id) &&
                (user.username.toLowerCase().includes(value.toLowerCase()) ||
                    (user.first_name && user.first_name.toLowerCase().includes(value.toLowerCase())) ||
                    (user.last_name && user.last_name.toLowerCase().includes(value.toLowerCase())))
            );
            setSuggestedUsers(filtered);
        } else {
            setSuggestedUsers([]);
        }
    }, [allUsers, selectedResponsibleUsers]);

    const handleSelectResponsible = useCallback((user) => {
        setSelectedResponsibleUsers(prevSelected => [...prevSelected, user]);
        setFormData(prevData => ({
            ...prevData,
            action_responsible_users: [...prevData.action_responsible_users, user.id]
        }));
        setResponsibleSearchTerm('');
        setSuggestedUsers([]);
        if (responsibleInputRef.current) {
            responsibleInputRef.current.blur();
        }
    }, []);

    const handleRemoveResponsible = useCallback((userIdToRemove) => {
        setSelectedResponsibleUsers(prevSelected =>
            prevSelected.filter(user => user.id !== userIdToRemove)
        );
        setFormData(prevData => ({
            ...prevData,
            action_responsible_users: prevData.action_responsible_users.filter(id => id !== userIdToRemove)
        }));
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        if (name !== 'responsible_search') { // Exclude the search input from generic handleChange
            setFormData(prevData => ({
                ...prevData,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus('submitting');

        if (!isAuthenticated || !accessToken) { alert("Not authenticated."); setSubmitStatus(null); return; }

        // Validate against `formData.action_responsible_users` which holds the actual IDs for submission
        if (!formData.action_description || formData.action_responsible_users.length === 0) {
            setSubmitStatus('error');
            alert("Action Description and at least one Responsible user are required!");
            setTimeout(() => setSubmitStatus(null), 3000); // Clear error message after 3 seconds
            return;
        }

        const url = isEditMode ? `/api/deviations/${devNumber}/actions/${actionIdToEdit}/` : `/api/deviations/${devNumber}/actions/`;
        const method = isEditMode ? 'PUT' : 'POST';

        const dataToSend = { ...formData };
        // Populate the old `action_responsible` CharField for backward compatibility or display on backend
        // Use full name as preferred, fallback to username
        dataToSend.action_responsible = selectedResponsibleUsers.map(user =>
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
        ).join(', ');


        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                    console.error("API Error Details:", errorData);
                } catch (jsonError) {
                    errorData = { detail: "An unknown error occurred. Server response not JSON." };
                }
                throw new Error(`HTTP error! Status: ${response.status}. Details: ${JSON.stringify(errorData)}`);
            }

            const responseData = await response.json();
            console.log('Action operation successful:', responseData);
            setSubmitStatus('success');

            if (onActionSubmitted) {
                onActionSubmitted(responseData); // Notify parent with the updated/added action
            }

            // After successful submission:
            if (isEditMode) {
                // If in edit mode, call onCancelEdit to close the form without page refresh
                if (onCancelEdit) {
                    onCancelEdit();
                }
            } else {
                // If adding a new action, clear the form for next entry
                setFormData(initialFormState); // Reset form fields to empty
                setSelectedResponsibleUsers([]); // Clear selected users
                setResponsibleSearchTerm(''); // Clear search term
                // If you uncomment the navigate below, it will jump to the top of the deviation page
                // navigate(`/deviations/${devNumber}`);
            }

            // Clear success status message after a short delay
            setTimeout(() => setSubmitStatus(null), 2000);

        } catch (error) {
            console.error("Error during action operation:", error);
            setSubmitStatus('error');
            alert(`Failed to ${isEditMode ? 'update' : 'create'} action: ${error.message || 'Check console for details.'}`);
            // Clear error status message after a longer delay
            setTimeout(() => setSubmitStatus(null), 5000);
        }
    };

    if (loadingInitialData) {
        return <div>Loading action form...</div>;
    }

    if (errorInitialData) {
        return <div>Error loading action: {errorInitialData.message}</div>;
    }

    return (
        <div className="action-form-container">
            <h3>{isEditMode ? 'Edit Action' : 'Add New Action'}</h3>
            <form onSubmit={handleSubmit} className="action-form">
                <div className="form-group">
                    <label>Description: <span className="required-field">*</span></label>
                    <textarea name="action_description" value={formData.action_description} onChange={handleChange} required rows="3"></textarea>
                </div>
                <div className="form-group autocomplete-container">
                    <label>Responsible(s): <span className="required-field">*</span></label>
                    <div className="selected-users-tags">
                        {selectedResponsibleUsers.map(user => (
                            <span key={user.id} className="user-tag">
                                {user.first_name || user.username} {user.last_name}
                                <button type="button" onClick={() => handleRemoveResponsible(user.id)} className="remove-tag-button">x</button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        name="responsible_search"
                        value={responsibleSearchTerm}
                        onChange={handleResponsibleInputChange}
                        placeholder="Search and add responsible users..."
                        ref={responsibleInputRef}
                        autoComplete="off"
                    />
                    {suggestedUsers.length > 0 && (
                        <ul className="suggestions-list">
                            {suggestedUsers.map(user => (
                                <li key={user.id} onClick={() => handleSelectResponsible(user)}>
                                    {user.first_name} {user.last_name} ({user.username})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="form-group">
                    <label>Expiration Date:</label>
                    <input type="date" name="action_expiration_date" value={formData.action_expiration_date} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Reminder Sent:</label>
                    <input type="checkbox" name="reminder_sent" checked={formData.reminder_sent} onChange={handleChange} />
                </div>
                <div className="form-buttons-group">
                    <button type="submit" disabled={submitStatus === 'submitting'}>
                        {submitStatus === 'submitting' ? (isEditMode ? 'Updating Action...' : 'Adding Action...') : (isEditMode ? 'Update Action' : 'Add Action')}
                    </button>
                    {isEditMode && (
                        <button type="button" className="cancel-button" onClick={onCancelEdit}>
                            Cancel
                        </button>
                    )}
                </div>
                {submitStatus === 'success' && <p className="submit-message success">Action {isEditMode ? 'updated' : 'added'} successfully!</p>}
                {submitStatus === 'error' && <p className="submit-message error">Failed to {isEditMode ? 'update' : 'add'} action. Please try again.</p>}
            </form>
        </div>
    );
}

export default ActionForm;