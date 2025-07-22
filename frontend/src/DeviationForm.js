// deviation_tracker_app/frontend/src/DeviationForm.js (FINAL, FULLY MODIFIED CODE - Date Formatting Fix)

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Helper function for date formatting (REVISED for robust YYYY-MM-DD handling)
const formatDateForInput = (isoDateString) => {
  if (!isoDateString) return '';
  try {
    // If the string is already in 'YYYY-MM-DD' format, return it directly.
    if (isoDateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return isoDateString;
    }

    // For ISO strings (e.g., '2025-07-08T00:00:00Z' or '2025-07-08T10:30:00'),
    // parse it. If it's a 'Z' (UTC) string, Date constructor will treat it as UTC.
    // To avoid local timezone shifts for display, we need to extract components carefully.
    const date = new Date(isoDateString);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for formatting:", isoDateString);
      return '';
    }

    // Get year, month, and day components in the local timezone of the Date object.
    // This is generally safer than toISOString() for display in date inputs.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Error formatting date for input:", isoDateString, e);
    return '';
  }
};


function DeviationForm({ onDeviationCreatedOrUpdated }) {
  const { devNumber } = useParams();
  const isEditMode = !!devNumber;

  const [formData, setFormData] = useState({
    primary_column: '', year: '', dev_number: '', created_by: '', created_by_user: null,
    owner_plant: '', affected_plant: '', sbu: '',
    release_date: '', effectivity_date: '', expiration_date: '',
    drawing_number: '', back_to_back_deviation: false,
    defect_category: '', assembly_defect_type: '', molding_defect_type: ''
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState(null);

  const [submitStatus, setSubmitStatus] = useState(null);
  const [loadingInitialData, setLoadingInitialData] = useState(isEditMode);
  const [errorInitialData, setErrorInitialData] = useState(null);
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();

  const [allUsers, setAllUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const createdByInputRef = useRef(null);


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


  // Effect to fetch existing deviation data if in edit mode, and populate with full name
  useEffect(() => {
    if (isEditMode) {
      if (!isAuthenticated || !accessToken) {
          setLoadingInitialData(false);
          setErrorInitialData(new Error("Not authenticated to view/edit this form. Please log in."));
          return;
      }

      const fetchDeviationData = async () => {
        try {
          const response = await fetch(`/api/deviations/${devNumber}/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              throw new Error("Authentication failed or token expired. Please log in.");
            }
            if (response.status === 404) {
              throw new Error(`Deviation with DEV Number ${devNumber} not found.`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          const initialFormData = {
            ...data,
            // Apply the revised formatDateForInput here for initial display
            release_date: formatDateForInput(data.release_date),
            effectivity_date: formatDateForInput(data.effectivity_date),
            expiration_date: formatDateForInput(data.expiration_date),
          };

          if (data.created_by_user && allUsers.length > 0) {
            const linkedUser = allUsers.find(user => user.id === data.created_by_user);
            if (linkedUser) {
              initialFormData.created_by = `${linkedUser.first_name || ''} ${linkedUser.last_name || ''}`.trim();
            } else {
              initialFormData.created_by = data.created_by;
            }
            initialFormData.created_by_user = data.created_by_user;
          } else {
            initialFormData.created_by = data.created_by;
            initialFormData.created_by_user = data.created_by_user;
          }

          setFormData(initialFormData);
          setExistingAttachmentUrl(data.attachment);
          setLoadingInitialData(false);
        } catch (error) {
          console.error("Error fetching initial deviation data:", error);
          setErrorInitialData(error);
          setLoadingInitialData(false);
        }
      };

      if (allUsers.length > 0) {
        fetchDeviationData();
      } else {
        setLoadingInitialData(true);
      }

    } else {
      setLoadingInitialData(false);
    }
  }, [isEditMode, devNumber, accessToken, isAuthenticated, allUsers]);


  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setAttachmentFile(files[0]);
    } else {
      setFormData(prevData => ({
        ...prevData,
        // For date inputs, 'value' is already 'YYYY-MM-DD', which is what Django's DateField expects
        // when USE_TZ=False. No further conversion needed here.
        [name]: type === 'checkbox' ? checked : value
      }));

      if (name === 'created_by') {
        if (value.length > 1) {
          const filtered = allUsers.filter(user =>
            user.username.toLowerCase().includes(value.toLowerCase()) ||
            (user.first_name && user.first_name.toLowerCase().includes(value.toLowerCase())) ||
            (user.last_name && user.last_name.toLowerCase().includes(value.toLowerCase()))
          );
          setSuggestedUsers(filtered);
        } else {
          setSuggestedUsers([]);
        }
        if (value === '') {
            setFormData(prevData => ({ ...prevData, created_by_user: null }));
        }
      }
    }
  };

  const handleSuggestionClick = (name, suggestedUser) => {
    setFormData(prevData => ({
      ...prevData,
      [name]: `${suggestedUser.first_name || ''} ${suggestedUser.last_name || ''}`.trim(),
      [`${name}_user`]: suggestedUser.id
    }));
    setSuggestedUsers([]);
    if (name === 'created_by' && createdByInputRef.current) {
        createdByInputRef.current.blur();
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Prevented default form submission. Starting submission process...");

    if (!isAuthenticated || !accessToken) {
      alert("Not authenticated. Please log in.");
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('submitting');

    if (!formData.dev_number) {
      setSubmitStatus('error');
      alert("DEV Number is required!");
      return;
    }

    const url = isEditMode ? `/api/deviations/${devNumber}/` : '/api/deviations/';
    const method = isEditMode ? 'PATCH' : 'POST';

    const formToSend = new FormData();
    for (const key in formData) {
      const value = formData[key];
      // Skip the 'attachment' key here, as we handle it separately below.
      if (key === 'attachment') {
        continue;
      }

      if (value !== null && value !== undefined) {
        if (key === 'created_by_user') {
          formToSend.append(key, formData.created_by === '' ? '' : value);
        }
        else if (typeof value === 'boolean') {
          formToSend.append(key, value ? 'true' : 'false');
        } else if (key.includes('_date') && value === '') {
          formToSend.append(key, '');
        }
        else {
          formToSend.append(key, value);
        }
      }
    }

    // --- REFINED ATTACHMENT HANDLING FOR ALL CASES ---
    if (attachmentFile) {
        // Case 1: A new file was selected by the user. Append it.
        formToSend.append('attachment', attachmentFile);
    } else if (isEditMode && existingAttachmentUrl && attachmentFile === null) {
        // Case 2: In edit mode, there was an existing file, and the user did NOT select a new file.
        // Also, the "Clear Existing Attachment" button was NOT pressed (attachmentFile is still null).
        // In this case, we DO NOT append the 'attachment' field to FormData.
        // This tells Django REST Framework to KEEP the current file.
        // Do nothing here.
    } else if (isEditMode && attachmentFile instanceof File && attachmentFile.size === 0) {
        // Case 3: In edit mode, the "Clear Existing Attachment" button was pressed.
        // attachmentFile was explicitly set to an empty File object.
        formToSend.append('attachment', ''); // Send empty string to explicitly clear the file on the backend.
    }
    // For new creation mode (not isEditMode), if no file is selected, attachmentFile is null,
    // and none of these conditions are met, so 'attachment' is correctly not appended.
    // --- END REFINED ATTACHMENT HANDLING ---

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: formToSend, // FormData does not need 'Content-Type': 'application/json'
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
      console.log('Operation successful:', responseData);
      setSubmitStatus('success');

      if (onDeviationCreatedOrUpdated) {
        onDeviationCreatedOrUpdated();
      }

      const targetDevNumber = isEditMode ? devNumber : responseData.dev_number;

      if (!targetDevNumber) {
        console.error("Error: Target DEV number for navigation is missing after successful operation.", responseData);
        alert("Deviation saved successfully, but could not navigate to details page automatically. Please go back to the list and select it.");
        setSubmitStatus(null);
        return;
      }

      console.log(`Navigating to /deviations/${targetDevNumber} in 1.5 seconds...`);
      setTimeout(() => {
        navigate(`/deviations/${targetDevNumber}`);
      }, 1500);

    } catch (error) {
      console.error("Error during deviation operation:", error);
      setSubmitStatus('error');
      alert(`Failed to ${isEditMode ? 'update' : 'create'} deviation: ${error.message || 'Check console for details.'}`);
    }
  };

  if (loadingInitialData) {
    return <div className="App">Loading form data...</div>;
  }

  if (errorInitialData) {
    return <div className="App">Error loading deviation: {errorInitialData.message}. <Link to="/">Back to List</Link></div>;
  }

  return (
    <div className="App">
      <header className="App-header-custom">
        <h1>{isEditMode ? `Edit Deviation: ${devNumber}` : 'Create New Deviation'}</h1>
      </header>
      <main className="deviation-form-container">
        <Link to={isEditMode ? `/deviations/${devNumber}` : '/'} className="back-link">
          {isEditMode ? 'Back to Deviation Details' : 'Back to All Deviations'}
        </Link>

        <form onSubmit={handleSubmit} className="deviation-form">
          <h3>General Information</h3>
          <div className="form-group">
            <label>DEV Number: <span className="required-field">*</span></label>
            <input
              type="text"
              name="dev_number"
              value={formData.dev_number}
              onChange={handleChange}
              required
              readOnly={isEditMode}
              style={isEditMode ? { backgroundColor: '#e9e9e9' } : {}}
            />
          </div>
          <div className="form-group">
            <label>Primary Column:</label>
            <input type="text" name="primary_column" value={formData.primary_column} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Year:</label>
            <input type="number" name="year" value={formData.year} onChange={handleChange} />
          </div>
          <div className="form-group autocomplete-container">
            <label>Created By:</label>
            <input
              type="text"
              name="created_by"
              value={formData.created_by}
              onChange={handleChange}
              ref={createdByInputRef}
              autoComplete="off"
            />
            {suggestedUsers.length > 0 && (
              <ul className="suggestions-list">
                {suggestedUsers.map(user => (
                  <li key={user.id} onClick={() => handleSuggestionClick('created_by', user)}>
                    {user.first_name} {user.last_name} ({user.username})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label>Owner Plant:</label>
            <input type="text" name="owner_plant" value={formData.owner_plant} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Affected Plant:</label>
            <input type="text" name="affected_plant" value={formData.affected_plant} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>SBU:</label>
            <input type="text" name="sbu" value={formData.sbu} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Release Date:</label>
            <input type="date" name="release_date" value={formData.release_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Effectivity Date:</label>
            <input type="date" name="effectivity_date" value={formData.effectivity_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Expiration Date:</label>
            <input type="date" name="expiration_date" value={formData.expiration_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Drawing Number:</label>
            <input type="text" name="drawing_number" value={formData.drawing_number} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Back-to-Back Deviation:</label>
            <input type="checkbox" name="back_to_back_deviation" checked={formData.back_to_back_deviation} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Defect Category:</label>
            <input type="text" name="defect_category" value={formData.defect_category} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Assembly Defect Type:</label>
            <input type="text" name="assembly_defect_type" value={formData.assembly_defect_type} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Molding Defect Type:</label>
            <input type="text" name="molding_defect_type" value={formData.molding_defect_type} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Attachment:</label>
            <input type="file" name="attachment" onChange={handleChange} />
            {isEditMode && existingAttachmentUrl && (
                <p className="existing-attachment-info">
                    Existing: <a href={existingAttachmentUrl} target="_blank" rel="noopener noreferrer">View Current File</a>
                    <br/>(Uploading a new file will replace the existing one.)
                </p>
            )}
            {isEditMode && !existingAttachmentUrl && attachmentFile === null && (
                <p className="existing-attachment-info">No current attachment.</p>
            )}
            {isEditMode && existingAttachmentUrl && (
              <button
                type="button"
                className="clear-attachment-button"
                onClick={() => {
                  setAttachmentFile(new File([], ''));
                  setExistingAttachmentUrl(null);
                  alert("Attachment will be cleared on next update. Click 'Update Deviation' to apply.");
                }}
                disabled={attachmentFile instanceof File && attachmentFile.size === 0}
              >
                Clear Existing Attachment
              </button>
            )}
          </div>

          <button type="submit" disabled={submitStatus === 'submitting'}>
            {submitStatus === 'submitting' ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Deviation' : 'Create Deviation')}
          </button>
          {submitStatus === 'success' && <p className="submit-message success">Deviation {isEditMode ? 'updated' : 'created'} successfully!</p>}
          {submitStatus === 'error' && <p className="submit-message error">Failed to {isEditMode ? 'update' : 'create'} deviation. Please try again.</p>}
        </form>
      </main>
    </div>
  );
}

export default DeviationForm;
