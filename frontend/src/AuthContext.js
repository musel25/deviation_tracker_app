// deviation_tracker_app/frontend/src/AuthContext.js (WITH DEBUGGING CONSOLE LOGS)

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const [loading, setLoading] = useState(true); // Initial loading state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const decodeJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error("AuthContext: Error decoding JWT:", e);
      return null;
    }
  };

  const clearAuth = useCallback(() => {
    console.log("AuthContext: Clearing authentication state.");
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    // setLoading(false); // Do NOT set loading here. It's handled by initializeAuth finally.
    console.log("AuthContext: Logged out / Auth state cleared.");
  }, []);

  const fetchCurrentUser = useCallback(async (token) => {
    console.log("AuthContext: fetchCurrentUser called.");
    if (!token) {
      console.log("AuthContext: fetchCurrentUser - No token provided, returning null.");
      return null;
    }
    try {
      const response = await fetch('/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.warn(`AuthContext: fetchCurrentUser failed with status ${response.status}.`);
        if (response.status === 401 || response.status === 403) {
          console.warn("AuthContext: Token invalid or expired. Clearing auth.");
          clearAuth();
        }
        throw new Error(`Failed to fetch current user: ${response.status}`);
      }
      const data = await response.json();
      setUser(data);
      setIsAuthenticated(true);
      console.log("AuthContext: fetchCurrentUser successful, user set:", data.username);
      return data;
    } catch (error) {
      console.error("AuthContext: Error in fetchCurrentUser:", error);
      clearAuth();
      return null;
    }
  }, [clearAuth]); // Dependency: clearAuth

  const refreshAccessToken = useCallback(async () => {
    console.log("AuthContext: refreshAccessToken called.");
    if (!refreshToken) {
      console.log("AuthContext: refreshAccessToken - No refresh token, clearing auth.");
      clearAuth();
      return null;
    }
    try {
      const response = await fetch('/api/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!response.ok) {
        console.warn(`AuthContext: refreshAccessToken failed with status ${response.status}.`);
        clearAuth();
        throw new Error(`Failed to refresh token: ${response.status}`);
      }
      const data = await response.json();
      setAccessToken(data.access);
      localStorage.setItem('accessToken', data.access);
      console.log("AuthContext: Access token refreshed successfully.");
      return data.access;
    } catch (error) {
      console.error("AuthContext: Error in refreshAccessToken:", error);
      clearAuth();
      return null;
    }
  }, [refreshToken, clearAuth]); // Dependencies: refreshToken, clearAuth

  // Initial check on app load - this useEffect runs once
  useEffect(() => {
    console.log("AuthContext: useEffect (initial check) triggered.");
    const initializeAuth = async () => {
      console.log("AuthContext: initializeAuth function started.");

      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      console.log("AuthContext: Stored AccessToken at init:", storedAccessToken ? "found" : "null");
      console.log("AuthContext: Stored RefreshToken at init:", storedRefreshToken ? "found" : "null");

      if (storedAccessToken) {
        console.log("AuthContext: Stored access token found, setting state and attempting validation.");
        // Set state to trigger derived state/effects based on these values
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken); 

        const decodedToken = decodeJwt(storedAccessToken);
        console.log("AuthContext: Decoded token (from stored):", decodedToken);

        if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
          console.log("AuthContext: Stored access token is valid and not expired. Fetching user.");
          await fetchCurrentUser(storedAccessToken); // Await this call
        } else {
          console.log("AuthContext: Stored access token is expired or invalid. Attempting refresh.");
          const newAccessToken = await refreshAccessToken(); // Await this call
          if (newAccessToken) {
            console.log("AuthContext: Refresh successful, fetching user with new token.");
            await fetchCurrentUser(newAccessToken); // Await this call
          } else {
            console.log("AuthContext: Refresh failed, no new token. Clearing auth.");
            clearAuth(); // Explicitly clear if refresh failed
          }
        }
      } else {
        console.log("AuthContext: No stored access token found. User is not initially authenticated.");
        clearAuth(); // Ensure auth state is clean if no tokens
      }

      console.log("AuthContext: initializeAuth function finished. Setting loading to false.");
      setLoading(false); // This MUST be reached
    };

    initializeAuth();
  }, [fetchCurrentUser, refreshAccessToken, clearAuth]); // Dependencies for initializeAuth to be stable


  const login = useCallback(async (username, password) => {
    console.log("AuthContext: login function called.");
    setLoading(true); // Show loading while trying to log in
    try {
      const response = await fetch('/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Login failed with status: ${response.status}`);
      }

      const data = await response.json();
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);

      await fetchCurrentUser(data.access);
      setIsAuthenticated(true);
      console.log("AuthContext: Login successful.");
      return { success: true };
    } catch (error) {
      console.error("AuthContext: Login error:", error);
      clearAuth();
      return { success: false, error: error.message };
    } finally {
      setLoading(false); // Set loading to false after login attempt
    }
  }, [fetchCurrentUser, clearAuth]); // Dependencies: fetchCurrentUser, clearAuth

  const authValue = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    loading,
    login,
    logout: clearAuth,
    fetchCurrentUser,
    refreshAccessToken,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};