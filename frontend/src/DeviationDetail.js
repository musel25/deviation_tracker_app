// deviation_tracker_app/frontend/src/DeviationDetail.js (FINALIZED - Optimized for no refresh on update, responsible users fix)

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ActionForm from './ActionForm';
import { useAuth } from './AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Helper functions
const displayValue = (value) => value !== null && value !== undefined && value !== '' ? value.toString() : 'N/A';

const displayDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const parts = dateString.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for displayDate:", dateString);
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US');
  } catch (e) {
    console.error("Error parsing date for display:", dateString, e);
    return 'Invalid Date';
  }
};

function DeviationDetail({ onDataChanged }) {
    const { devNumber } = useParams();
    const [deviation, setDeviation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // `refreshActionsTrigger` removed as we are now updating actions optimistically in DeviationDetail.
    // This prevents full page reloads on action updates/status changes/reorders.
    const [showAddActionForm, setShowAddActionForm] = useState(false);
    const [editActionId, setEditActionId] = useState(null);
    const navigate = useNavigate();
    const { accessToken, isAuthenticated } = useAuth();

    const calculateDeviationStatus = (actions) => {
        if (!actions || actions.length === 0) {
            return "Not Started";
        }

        const allActionsNotStarted = actions.every(action => action.status === "Not Started");
        if (allActionsNotStarted) {
            return "Not Started";
        }

        const anyActionInProgress = actions.some(action => action.status === "In Progress");
        if (anyActionInProgress) {
            return "In Progress";
        }

        const allActionsDone = actions.every(action => action.status === "Done");
        if (allActionsDone) {
            return "Done";
        }

        return "In Progress";
    };

    // Main data fetching effect for the deviation details (runs only if devNumber, token, auth changes)
    useEffect(() => {
        if (!isAuthenticated || !accessToken) {
            setLoading(false);
            setError(new Error("Not authenticated to view details. Please log in."));
            return;
        }

        fetch(`/api/deviations/${devNumber}/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Authentication failed or token expired. Please log in again.");
                }
                if (response.status === 404) {
                    throw new Error(`Deviation with DEV Number ${devNumber} not found.`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            setDeviation(data);
            setLoading(false);
        })
        .catch(error => {
            console.error("Error fetching deviation details:", error);
            setError(error);
            setLoading(false);
        });
    // Removed refreshActionsTrigger from dependencies. This ensures the component
    // state is updated optimistically for actions, preventing full re-fetches.
    }, [devNumber, accessToken, isAuthenticated]);

    const handleDeleteDeviation = async () => {
        if (!isAuthenticated || !accessToken) { alert("Not authenticated."); return; }
        if (window.confirm(`Are you sure you want to delete deviation ${devNumber}? This action cannot be undone.`)) {
            try {
                const response = await fetch(`/api/deviations/${devNumber}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}. Failed to delete deviation.`);
                }

                alert(`Deviation ${devNumber} deleted successfully.`);
                // Notify parent component (DeviationsList) as the deviation list itself changes
                if (onDataChanged) {
                    onDataChanged();
                }
                navigate('/'); // Navigate back to the list after deleting the deviation
            } catch (error) {
                console.error("Error deleting deviation:", error);
                alert(`Failed to delete deviation: ${error.message}`);
            }
        }
    };

    // This function is passed down to ActionForm and is called when an action is successfully submitted (added or updated)
    const handleActionSubmitted = (submittedAction) => {
        // Update the deviation state with the new/updated action optimistically
        setDeviation(prevDeviation => {
            if (!prevDeviation) return prevDeviation;

            let updatedActions;
            const existsInList = prevDeviation.actions.some(action => action.id === submittedAction.id);

            if (existsInList) {
                // If the submitted action already exists (it's an edit), update it in the list
                updatedActions = prevDeviation.actions.map(action =>
                    action.id === submittedAction.id ? submittedAction : action
                );
            } else {
                // If it's a new action, add it to the list
                updatedActions = [...prevDeviation.actions, submittedAction];
            }

            // Always re-sort to maintain order after add/update
            updatedActions.sort((a, b) => a.order - b.order);

            // Recalculate deviation status based on updated actions
            const newDeviationStatus = calculateDeviationStatus(updatedActions);

            return {
                ...prevDeviation,
                actions: updatedActions,
                deviation_status: newDeviationStatus // Update overall deviation status
            };
        });

        // Conditionally close the form based on whether it was an edit or an add
        if (submittedAction.id === editActionId) { // This means an existing action was just edited
            setEditActionId(null); // Close the edit form by clearing its ID
        } else { // This means a new action was just added
            setShowAddActionForm(false); // Close the "add new action" form
        }

        // IMPORTANT: We do NOT call `onDataChanged()` here for action edits or adds.
        // This is the key to preventing the full page refresh (as `onDataChanged` likely
        // triggers a re-fetch in the parent `DeviationsList` component).
        // The `DeviationDetail` component manages its own action list state updates.
    };

    const handleEditAction = (actionId) => {
        setEditActionId(actionId); // Set the ID of the action to be edited
        setShowAddActionForm(false); // Ensure the "Add New Action" form is closed
    };

    const handleCancelEdit = () => {
        setEditActionId(null); // Clear the edit ID to hide the edit form
    };

    const handleDeleteAction = async (actionId, actionDescription) => {
        if (!isAuthenticated || !accessToken) { alert("Not authenticated."); return; }
        if (window.confirm(`Are you sure you want to delete action: "${actionDescription}"?`)) {
            try {
                const response = await fetch(`/api/deviations/${devNumber}/actions/${actionId}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}. Details: ${JSON.stringify(await response.json())}`);
                }

                alert(`Action "${actionDescription}" deleted successfully.`);
                // Filter out the deleted action from the local state (optimistic update for delete)
                setDeviation(prevDeviation => {
                    if (!prevDeviation) return prevDeviation;
                    const updatedActions = prevDeviation.actions.filter(action => action.id !== actionId);
                    const newDeviationStatus = calculateDeviationStatus(updatedActions);
                    return {
                        ...prevDeviation,
                        actions: updatedActions,
                        deviation_status: newDeviationStatus
                    };
                });

                // Since a deletion changes the total number of actions and potentially overall deviation status,
                // it's appropriate to notify the parent list component for re-evaluation.
                if (onDataChanged) {
                    onDataChanged();
                }
            } catch (error) {
                console.error("Error deleting action:", error);
                alert(`Failed to delete action: ${error.message}`);
            }
        }
    };

    const handleStatusChange = async (actionId, newStatus) => {
        if (!isAuthenticated || !accessToken) { alert("Not authenticated."); return; }

        // Optimistically update the UI first
        setDeviation(prevDeviation => {
            if (!prevDeviation) return prevDeviation;

            const updatedActions = prevDeviation.actions.map(action =>
                action.id === actionId ? { ...action, status: newStatus } : action
            );
            const newDeviationStatus = calculateDeviationStatus(updatedActions);

            return {
                ...prevDeviation,
                actions: updatedActions,
                deviation_status: newDeviationStatus
            };
        });

        // Then send the update to the backend
        try {
            const response = await fetch(`/api/deviations/${devNumber}/actions/${actionId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! Status: ${response.status}. Details: ${JSON.stringify(errorData)}`);
            }

            console.log(`Action ${actionId} status updated to ${newStatus} (API confirmed).`);
            // No need to call `onDataChanged()` here as the DeviationDetail handles its own state.
        } catch (error) {
            console.error("Error updating action status:", error);
            alert(`Failed to update action status: ${error.message}`);
            // If the API call fails, consider re-fetching to revert to the actual backend state
            // or implement a more robust rollback of the optimistic update.
            // For simplicity, a full re-fetch (if `refreshActionsTrigger` were active)
            // could be a fallback here, but for now we rely on the error message.
        }
    };

    const renderAttachmentPreview = (attachmentUrl) => {
        if (!attachmentUrl) {
            return <div className="no-attachment-preview">No attachment to preview.</div>;
        }

        const lowerCaseUrl = attachmentUrl.toLowerCase();

        if (lowerCaseUrl.endsWith('.pdf')) {
            return (
                <iframe
                    src={attachmentUrl}
                    title="PDF Preview"
                    className="pdf-preview"
                    frameBorder="0"
                    scrolling="no"
                    seamless
                >
                    <p>Your browser does not support PDFs. <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">Download the PDF</a> instead.</p>
                </iframe>
            );
        } else if (lowerCaseUrl.endsWith('.png') || lowerCaseUrl.endsWith('.jpg') || lowerCaseUrl.endsWith('.jpeg') || lowerCaseUrl.endsWith('.gif') || lowerCaseUrl.endsWith('.bmp') || lowerCaseUrl.endsWith('.webp')) {
            return (
                <img
                    src={attachmentUrl}
                    alt="Attachment Preview"
                    className="image-preview"
                    onError={(e) => { e.target.onerror = null; e.target.src="/path/to/placeholder-image.png"; e.target.alt="Image failed to load"; }}
                />
            );
        } else {
            const fileName = attachmentUrl.split('/').pop();
            return (
                <div className="generic-file-preview">
                    <p>File type not directly previewable.</p>
                    <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <i className="fas fa-file-download"></i> Download: {fileName}
                    </a>
                </div>
            );
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination || result.destination.index === result.source.index) {
            return;
        }

        if (!deviation || !deviation.actions || !Array.isArray(deviation.actions)) {
            return;
        }

        const reorderedActions = Array.from(deviation.actions);
        const [movedAction] = reorderedActions.splice(result.source.index, 1);
        reorderedActions.splice(result.destination.index, 0, movedAction);

        // Prepare the payload for the backend with new 'order' values
        const newOrderPayload = reorderedActions.map((action, index) => ({
            id: action.id,
            order: index + 1
        }));

        // Optimistically update the UI
        setDeviation(prevDeviation => ({
            ...prevDeviation,
            actions: newOrderPayload.map(newAction => {
                const originalAction = prevDeviation.actions.find(act => act.id === newAction.id);
                return { ...originalAction, order: newAction.order };
            })
        }));

        try {
            await updateActionOrderOnBackend(devNumber, newOrderPayload, accessToken);
            console.log("Action order updated on backend.");
            // No need to call `onDataChanged()` here as the DeviationDetail handles its own state.
        } catch (error) {
            console.error("Failed to update action order on backend:", error);
            alert("Failed to save new action order. Please refresh and try again.");
            // Revert UI if backend update failed
            setDeviation(prevDeviation => ({
                ...prevDeviation,
                actions: deviation.actions // Revert to previous order
            }));
        }
    };

    const updateActionOrderOnBackend = async (devNum, newOrderPayload, token) => {
        console.log(`Sending new order for DEV ${devNum}:`, newOrderPayload);
        const response = await fetch(`/api/deviations/${devNum}/reorder_actions/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ new_order: newOrderPayload }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to reorder actions: ${response.status}. Details: ${JSON.stringify(errorData)}`);
        }
        return response.json();
    };

    if (loading) {
        return <div className="App">Loading deviation details...</div>;
    }
    if (error) {
        return (
            <div className="App">
                <h2>Error: {error.message}</h2>
                <Link to="/">Back to Deviations List</Link>
            </div>
        );
    }
    if (!deviation) {
        return (
            <div className="App">
                <h2>No deviation data available.</h2>
                <Link to="/">Back to Deviations List</Link>
            </div>
        );
    }

    return (
        <div className="App">
            <header className="App-header-custom">
                <h1>Deviation Details: {displayValue(deviation.dev_number)}</h1>
            </header>
            <main className="deviation-detail-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <Link to="/" className="back-link" onClick={onDataChanged}>
                        Back to All Deviations
                    </Link>
                    <div className="deviation-actions-group">
                        <Link to={`/deviations/${deviation.dev_number}/edit`} className="edit-link">Edit Deviation</Link>
                        <button onClick={handleDeleteDeviation} className="delete-button">Delete Deviation</button>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>General Information</h3>
                    <div className="general-info-layout">
                        <div className="general-info-text">
                            <p><strong>Primary Column:</strong> {displayValue(deviation.primary_column)}</p>
                            <p><strong>Year:</strong> {displayValue(deviation.year)}</p>
                            <p><strong>Created By:</strong> {displayValue(deviation.created_by)}</p>
                            <p><strong>Owner Plant:</strong> {displayValue(deviation.owner_plant)}</p>
                            <p><strong>Affected Plant:</strong> {displayValue(deviation.affected_plant)}</p>
                            <p><strong>SBU:</strong> {displayValue(deviation.sbu)}</p>
                            <p><strong>Release Date:</strong> {displayDate(deviation.release_date)}</p>
                            <p><strong>Effectivity Date:</strong> {displayDate(deviation.effectivity_date)}</p>
                            <p><strong>Expiration Date:</strong> {displayDate(deviation.expiration_date)}</p>
                            <p><strong>Drawing Number:</strong> {displayValue(deviation.drawing_number)}</p>
                            <p><strong>Back-to-Back Deviation:</strong> {deviation.back_to_back_deviation ? 'Yes' : 'No'}</p>
                            <p><strong>Defect Category:</strong> {displayValue(deviation.defect_category)}</p>
                            <p><strong>Assembly Defect Type:</strong> {displayValue(deviation.assembly_defect_type)}</p>
                            <p><strong>Molding Defect Type:</strong> {displayValue(deviation.molding_defect_type)}</p>
                            <p>
                                <strong>Attachment:</strong>{' '}
                                {deviation.attachment ? (
                                    <a href={deviation.attachment} target="_blank" rel="noopener noreferrer" className="view-attachment-link">
                                        View Attachment
                                    </a>
                                ) : (
                                    'No attachment'
                                )}
                            </p>
                        </div>

                        <div className="attachment-preview-container">
                            <h4>File Preview</h4>
                            {renderAttachmentPreview(deviation.attachment)}
                        </div>
                    </div>
                </div>

                <div className="detail-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3>Actions ({deviation.actions ? deviation.actions.length : 0})</h3>
                        {/* Only show "Add" button if not currently editing an action */}
                        {editActionId === null && (
                            <button onClick={() => setShowAddActionForm(!showAddActionForm)} className="add-action-button">
                                {showAddActionForm ? 'Cancel Add Action' : 'Add New Action'}
                            </button>
                        )}
                    </div>

                    {/* Conditional rendering for Add Action Form */}
                    {showAddActionForm && editActionId === null && (
                        <ActionForm onActionSubmitted={handleActionSubmitted} />
                    )}

                    {deviation.actions && deviation.actions.length > 0 ? (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="actions">
                                {(provided) => (
                                    <ul
                                        className="action-list"
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {/* Sort actions by the 'order' field before mapping */}
                                        {deviation.actions
                                            .sort((a, b) => a.order - b.order)
                                            .map((action, index) => (
                                                <React.Fragment key={action.id}>
                                                    <Draggable
                                                        key={action.id}
                                                        draggableId={String(action.id)}
                                                        index={index}
                                                    >
                                                        {(provided) => (
                                                            <li
                                                                className="action-item"
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                }}
                                                            >
                                                                <div className="action-item-details">
                                                                    <p><strong>Action {displayValue(action.order)}</strong></p>
                                                                    <p><strong>Description:</strong> {displayValue(action.action_description)}</p>
                                                                    {/* Display action_responsible_users (full names) */}
                                                                    <p>
                                                                        <strong>Responsible:</strong>{" "}
                                                                        {action.action_responsible_users && action.action_responsible_users.length > 0
                                                                            ? action.action_responsible_users.join(', ')
                                                                            : 'N/A' // Fallback for no assigned users
                                                                        }
                                                                    </p>
                                                                    <p><strong>Expiration Date:</strong> {displayDate(action.action_expiration_date)}</p>
                                                                    <p><strong>Reminder Sent:</strong> {action.reminder_sent ? 'Yes' : 'No'}</p>
                                                                    <p>
                                                                        <strong>Status:</strong>{' '}
                                                                        <select
                                                                            value={action.status}
                                                                            onChange={(e) => handleStatusChange(action.id, e.target.value)}
                                                                            className={`action-status-select status-${action.status.toLowerCase().replace(/\s/g, '-')}`}
                                                                        >
                                                                            <option value="Not Started">Not Started</option>
                                                                            <option value="In Progress">In Progress</option>
                                                                            <option value="Done">Done</option>
                                                                        </select>
                                                                    </p>
                                                                </div>
                                                                <div className="action-buttons-group">
                                                                    <button onClick={() => handleEditAction(action.id)} className="action-edit-button">Edit</button>
                                                                    <button onClick={() => handleDeleteAction(action.id, action.action_description)} className="action-delete-button">Delete</button>
                                                                </div>
                                                            </li>
                                                        )}
                                                    </Draggable>
                                                    {/* Render the ActionForm directly below the action if it's being edited */}
                                                    {editActionId === action.id && (
                                                        <ActionForm
                                                            onActionSubmitted={handleActionSubmitted}
                                                            actionIdToEdit={action.id}
                                                            onCancelEdit={handleCancelEdit}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        {provided.placeholder}
                                    </ul>
                                )}
                            </Droppable>
                        </DragDropContext>
                    ) : (
                        <p>No actions found for this deviation.</p>
                    )}
                </div>
            </main>
        </div>
    );
}

export default DeviationDetail;