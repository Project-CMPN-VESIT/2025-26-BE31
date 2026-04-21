import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../services/auth';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  refreshUser: async () => { },
});

/**
 * AuthProvider Component
 * Manages authentication state and user profile
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile from Firestore
   */
  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  /**
   * Refresh user profile data
   */
  const refreshUser = async () => {
    if (firebaseUser) {
      const profile = await fetchUserProfile(firebaseUser.uid);
      setUser(profile);
    }
  };

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Fetch user profile from Firestore
        const profile = await fetchUserProfile(fbUser.uid);
        // Batch state updates to prevent intermediate navigation states
        setFirebaseUser(fbUser);
        setUser(profile);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
