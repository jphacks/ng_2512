import React from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <ActivityIndicator size="large" style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <Text style={styles.title}>Welcome</Text>
          <Text>{user.displayName}</Text>
          <Text>{user.email}</Text>
          <Button title="Sign Out" onPress={signOut} />
        </>
      ) : (
        <>
          <Text style={styles.title}>Please Sign In</Text>
          <Button title="Sign in with Google" onPress={signInWithGoogle} />
        </>
      )}
      {error && (
        <Text style={styles.error}>Error: {error.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginTop: 16,
  }
});
