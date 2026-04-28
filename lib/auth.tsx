'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  userCurrency: string;
  userCountry: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const provider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrency] = useState('MWK');
  const [userCountry, setUserCountry] = useState('Malawi');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserCurrency(data.currency);
            setUserCountry(data.country);
          } else {
             await setDoc(userDocRef, {
               currency: 'MWK',
               country: 'Malawi',
               createdAt: Date.now()
             });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, 'users');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
       await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut, userCurrency, userCountry }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
