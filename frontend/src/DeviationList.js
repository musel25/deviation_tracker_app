// deviation_tracker_app/frontend/src/DeviationList.js (UPDATED - Fixed Date Display)

import React from 'react';
import { Link } from 'react-router-dom';

// Helper function to safely display data
const displayValue = (value) => value !== null && value !== undefined && value !== '' ? value.toString() : 'N/A';

// FIXED: Updated displayDate function to handle timezone issues
const displayDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // Check if it's already in YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // For date-only strings, parse manually to avoid timezone issues
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US');
    }
    
    // For other formats, use regular Date parsing
    const date = new Date(dateString);
    if (isNaN(date)) return 'Invalid Date';
    return date.toLocaleDateString('en-US');
  } catch (e) {
    console.error("Error parsing date:", dateString, e);
    return 'Invalid Date';
  }
};

// NEW PROP: filterMode
function DeviationList({ deviations, loading, error, onDataChanged, filterMode }) {
  if (loading) {
    return <div className="App">Loading deviations...</div>;
  }

  if (error) {
    return <div className="App">Error: {error.message}</div>;
  }

  if (!deviations || deviations.length === 0) {
    // Dynamic message based on filterMode
    if (filterMode === 'my') {
      return <div className="App">You have no deviations assigned.</div>;
    } else {
      return <div className="App">No deviations found. Please check your Excel import or add new deviations.</div>;
    }
  }

  return (
    <div className="deviation-matrix-container">
      <table className="deviation-table">
        <thead>
          <tr>
            <th>DEV Number</th>
            <th>Year</th>
            <th>Created By</th>
            <th>Owner Plant</th>
            <th>Affected Plant</th>
            <th>SBU</th>
            <th>Release Date</th>
            <th>Effectivity Date</th>
            <th>Expiration Date</th>
            <th>Drawing Number</th>
            <th>Back-to-Back</th>
            <th>Defect Category</th>
            <th>Assembly Defect Type</th>
            <th>Molding Defect Type</th>
            <th>Actions Count</th>
            <th>Deviation Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {deviations.map(deviation => (
            <tr key={deviation.dev_number || deviation.id}>
              <td>
                <Link to={`/deviations/${deviation.dev_number}`}>
                  {displayValue(deviation.dev_number)}
                </Link>
              </td>
              <td>{displayValue(deviation.year)}</td>
              <td>{displayValue(deviation.created_by)}</td>
              <td>{displayValue(deviation.owner_plant)}</td>
              <td>{displayValue(deviation.affected_plant)}</td>
              <td>{displayValue(deviation.sbu)}</td>
              <td>{displayDate(deviation.release_date)}</td>
              <td>{displayDate(deviation.effectivity_date)}</td>
              <td>{displayDate(deviation.expiration_date)}</td>
              <td>{displayValue(deviation.drawing_number)}</td>
              <td>{deviation.back_to_back_deviation ? 'Yes' : 'No'}</td>
              <td>{displayValue(deviation.defect_category)}</td>
              <td>{displayValue(deviation.assembly_defect_type)}</td>
              <td>{displayValue(deviation.molding_defect_type)}</td>
              <td>{deviation.actions ? deviation.actions.length : 0}</td>
              <td><span className={`deviation-status status-${deviation.deviation_status.toLowerCase().replace(/\s/g, '-')}`}>{displayValue(deviation.deviation_status)}</span></td>
              <td><strong>{displayValue(deviation.completion_percentage)}%</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DeviationList;