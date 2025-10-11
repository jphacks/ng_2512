import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppConfig } from "@/hooks/useAppConfig";
import PrimaryButton from "@/components/ui/PrimaryButton";

const HomeScreen = (): JSX.Element => {
  const config = useAppConfig();
  const emulatorLabel = config.useFirebaseEmulators ? "Emulators enabled" : "Emulators disabled";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recall Prototype</Text>
      <Text style={styles.subtitle}>A lightweight Expo shell for upcoming RN tasks.</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>API Base URL</Text>
        <Text testID="api-base-url" style={styles.cardValue}>
          {config.apiBaseUrl}
        </Text>
        <Text style={styles.cardEmulatorHint}>{emulatorLabel}</Text>
      </View>
      <PrimaryButton
        accessibilityLabel="Open React Native docs"
        label="View Docs"
        onPress={() => {
          /* placeholder */
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1f2933"
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#52606d"
  },
  card: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 4
  },
  cardLabel: {
    fontSize: 14,
    color: "#7b8794"
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "500",
    color: "#102a43"
  },
  cardEmulatorHint: {
    fontSize: 12,
    color: "#7b8794"
  }
});

export default HomeScreen;
