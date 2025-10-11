import { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
// You must configure this with your webClientId
// See https://github.com/react-native-google-signin/google-signin#configure
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // Replace with your actual Web Client ID
});

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(userState => {
      setUser(userState);
      setLoading(false);
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the users ID token
      const { idToken } = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (e) {
      setError(e);
      console.error(e);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      setUser(null);
    } catch (e) {
      setError(e);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, signInWithGoogle, signOut };
}
