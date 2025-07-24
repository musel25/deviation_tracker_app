// deviation_tracker_app/frontend/src/App.js (UPDATED - Login Redirect Fix - Final)

import rainbirdLogo from './assets/rainbird_logo.png';
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import DeviationList from './DeviationList';
import DeviationForm from './DeviationForm';
import DeviationDetail from './DeviationDetail';
import Login from './Login'; // Corrected import name: Login
import { AuthProvider, useAuth } from './AuthContext';
import NewDeviationFormTest from './NewDeviationFormTest';
 

// PrivateRoute component to protect routes
// eslint-disable-next-line no-unused-vars
function PrivateRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="App">Checking authentication status...</div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// AppContent component to use useAuth hook
const AppContent = () => {
  const { user, isAuthenticated, logout, accessToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deviations, setDeviations] = useState([]);
  const [deviationDataLoading, setDeviationDataLoading] = useState(true);
  const [deviationDataError, setDeviationDataError] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'my'

  // Function to fetch deviation data - Wrapped in useCallback
  const fetchDeviations = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setDeviationDataLoading(false);
      return;
    }

    setDeviationDataLoading(true);
    setDeviationDataError(null);

    let url = '/api/deviations/';
    if (filterMode === 'my') {
      url += '?my_deviations=true';
    }

    try {
      const response = await fetch(url, {
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
      setDeviations(data);
    } catch (error) {
      console.error("Error fetching deviations:", error);
      setDeviationDataError(error);
    } finally {
      setDeviationDataLoading(false);
    }
  }, [isAuthenticated, accessToken, filterMode]);

  useEffect(() => {
    if (isAuthenticated && accessToken && !authLoading) {
      fetchDeviations();
    } else if (!isAuthenticated && !authLoading) {
      setDeviationDataLoading(false);
    }
  }, [isAuthenticated, accessToken, authLoading, fetchDeviations]);

  const handleRefresh = () => {
    fetchDeviations();
  };

  const handleViewAllDeviations = () => {
    setFilterMode('all');
    navigate('/');
  };

  const handleViewMyDeviations = () => {
    setFilterMode('my');
    navigate('/');
  };

  // --- REFINED RENDERING LOGIC ---
  // If authentication is still loading, show a loading message
  if (authLoading) {
    return <div className="App">Checking authentication status...</div>;
  }

  // If NOT authenticated, render ONLY the login route. No header or other app content.
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Redirect any other path to login if not authenticated */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If authenticated, render the main application layout
  return (
    <div className="App">
      <header className="App-header-custom">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={rainbirdLogo} alt="Rain Bird Logo" className="rainbird-logo" />
          <h1>Deviation Tracker</h1>
        </div>
        <nav>
          {/* These buttons are only shown if isAuthenticated is true, which it is here */}
          <>
            {/* Button for View All Deviations */}
            <button
              onClick={handleViewAllDeviations}
              className="nav-link"
              style={{ backgroundColor: filterMode === 'all' ? '#017537' : 'rgba(255, 255, 255, 0.15)' }}
            >
              View All Deviations
            </button>

            {/* Button for View My Deviations */}
            <button
              onClick={handleViewMyDeviations}
              className="nav-link"
              style={{ backgroundColor: filterMode === 'my' ? '#017537' : 'rgba(255, 255, 255, 0.15)' }}
            >
              View My Deviations
            </button>

            {/* ORIGINAL "Add New Deviation" button (functional) */}
            <Link to="/deviations/new" className="nav-link">Add New Deviation</Link>

            {/* NEW "Create New Deviation (Mock)" button (for mock-up) */}
            <Link to="/deviations/new-form-test" className="nav-link">Create New Deviation (Mock)</Link>


            <span className="user-info">
              Hello, {user ? user.username : 'Guest'}!
              <button onClick={logout} className="logout-button">Logout</button>
            </span>
          </>
        </nav>
      </header>
      <main>
        {/* Conditional rendering for deviation data loading/error within the main content area */}
        {deviationDataLoading ? (
            <div className="App">Loading deviation data...</div>
        ) : deviationDataError ? (
            <div className="App">Error: {deviationDataError.message}. Please ensure your Django backend is running on http://127.0.0.1:8000/ and try again.</div>
        ) : (
            <Routes>
                {/* All protected routes are now children of the main authenticated branch */}
                <Route path="/" element={<DeviationList deviations={deviations} loading={deviationDataLoading} error={deviationDataError} onDataChanged={handleRefresh} filterMode={filterMode} />} />
                <Route path="/deviations/new" element={<PrivateRoute><DeviationForm onDeviationCreatedOrUpdated={handleRefresh} /></PrivateRoute>} />
                <Route path="/deviations/:devNumber" element={<PrivateRoute><DeviationDetail onDataChanged={handleRefresh} /></PrivateRoute>} />
                <Route path="/deviations/:devNumber/edit" element={<PrivateRoute><DeviationForm onDeviationCreatedOrUpdated={handleRefresh} /></PrivateRoute>} />
                <Route path="/deviations/new-form-test" element={<PrivateRoute><NewDeviationFormTest /></PrivateRoute>} />
                
                {/* Fallback for any other unmatched routes when authenticated */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        )}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
