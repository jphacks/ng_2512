import React from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function SettingsScreen() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);

  const onPressSignIn = async () => {
    await signInWithGoogle();
  };

  const onPressSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#4C6EF5" />
        ) : user ? (
          <View style={styles.card}>
            <View style={styles.row}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {user.displayName?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user.displayName || "Signed in user"}</Text>
                <Text style={styles.email}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}> 
              <Text style={styles.infoLabel}>UID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{user.uid}</Text>
            </View>
            <View style={styles.infoRow}> 
              <Text style={styles.infoLabel}>Username</Text>
              {profileLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.infoValue}>{profile?.username ?? "未設定"}</Text>
              )}
            </View>

            <View style={{ height: 16 }} />

            <Pressable
              onPress={onPressSignOut}
              style={({ pressed }) => [styles.button, styles.signOutButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>サインアウト</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.placeholderText}>サインインして機能を利用できます。</Text>
            {error ? <Text style={styles.errorText}>{String(error?.message || error)}</Text> : null}
            <View style={{ height: 16 }} />
            <Pressable
              disabled={loading}
              onPress={onPressSignIn}
              style={({ pressed }) => [styles.button, styles.signInButton, (pressed || loading) && styles.buttonPressed]}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>Google でサインイン</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212529",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    ...(Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
    }) as any),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dee2e6",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontWeight: "700",
    color: "#495057",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
  },
  email: {
    fontSize: 14,
    color: "#495057",
  },
  divider: {
    height: 1,
    backgroundColor: "#e9ecef",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: "#495057",
  },
  infoValue: {
    fontSize: 14,
    color: "#212529",
    flex: 1,
    textAlign: "right",
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  signInButton: {
    backgroundColor: "#4C6EF5",
  },
  signOutButton: {
    backgroundColor: "#f1f3f5",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
});
