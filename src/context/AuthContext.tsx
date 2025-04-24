'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth'; // Import getRedirectResult
import { auth } from '@/lib/firebase/config'; // Adjust path if needed, assuming src is aliased to @

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until auth state is determined

  useEffect(() => {
    // Check for redirect result first when the app loads
    getRedirectResult(auth)
      .then((result) => {
        // If result exists, user signed in via redirect.
        // onAuthStateChanged will also handle setting the user state,
        // but calling this ensures the redirect is processed.
        // console.log("Redirect result:", result); // Optional: for debugging
      })
      .catch((error) => {
        // Handle errors from getRedirectResult, e.g., network error
        console.error("Error getting redirect result:", error);
      })
      .finally(() => {
        // Subscribe to Firebase auth state changes *after* checking redirect result.
        // This ensures we have the latest state whether from redirect or existing session.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser); // Set user to null if logged out, or User object if logged in
          setLoading(false); // Auth state determined (or confirmed), stop loading
          // console.log("Auth state changed:", currentUser); // Optional: for debugging
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
      });

    // Note: The cleanup function returned here might need adjustment
    // depending on how the promise interacts with the unsubscribe logic.
    // However, for this common pattern, returning the unsubscribe function
    // from the `finally` block (or the `onAuthStateChanged` call itself)
    // is generally correct. We only want one active listener.

  }, []); // Empty dependency array ensures this runs only once on mount

  // Provide the auth state to children components
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {/* Always render children; components consuming context handle their own loading state */}
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook for easy context consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
