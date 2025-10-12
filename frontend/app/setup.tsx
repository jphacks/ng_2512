import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { completeSetup } from "@/utils/user-storage";
import * as ImagePicker from "expo-image-picker";

interface SetupScreenProps {
  onSetupComplete: () => void;
}

export default function SetupScreen({ onSetupComplete }: SetupScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // フォームデータ
  const [formData, setFormData] = useState({
    account_id: "",
    display_name: "",
    profile_text: "",
    icon_image: null as any,
    face_image: null as any,
  });

  const updateFormData = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const pickIconImage = async () => {
    Alert.alert("画像を選択", "アイコン画像の選択方法を選んでください", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "カメラで撮影",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("エラー", "カメラの使用許可が必要です");
            return;
          }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            });          if (!result.canceled && result.assets[0]) {
            updateFormData("icon_image", result.assets[0]);
          }
        },
      },
      {
        text: "ライブラリから選択",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            updateFormData("icon_image", result.assets[0]);
          }
        },
      },
    ]);
  };

  const pickFaceImage = async () => {
    Alert.alert("写真を選択", "顔写真の選択方法を選んでください", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "カメラで撮影",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("エラー", "カメラの使用許可が必要です");
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            updateFormData("face_image", result.assets[0]);
          }
        },
      },
      {
        text: "ライブラリから選択",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            updateFormData("face_image", result.assets[0]);
          }
        },
      },
    ]);
  };

  const completeUserSetup = async () => {
    if (!formData.account_id.trim() || !formData.display_name.trim()) {
      Alert.alert("エラー", "アカウントIDと表示名は必須です。");
      return;
    }

    if (!formData.face_image) {
      Alert.alert("エラー", "顔写真の登録は必須です。");
      return;
    }

    setLoading(true);
    try {
      await completeSetup({
        account_id: formData.account_id.trim(),
        display_name: formData.display_name.trim(),
        profile_text: formData.profile_text.trim() || undefined,
        icon_image: formData.icon_image,
        face_image: formData.face_image,
      });

      Alert.alert("完了", "アカウントが作成されました！", [
        {
          text: "OK",
          onPress: onSetupComplete,
        },
      ]);
    } catch (error) {
      console.error("Setup failed:", error);
      Alert.alert(
        "エラー",
        "アカウント作成に失敗しました。もう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = formData.account_id.trim().length > 0;
  const canProceedStep2 = formData.display_name.trim().length > 0;
  const canProceedStep3 = formData.face_image !== null;

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepIndicatorContainer}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  step <= currentStep ? colors.primary : colors.border,
              },
            ]}
          >
            {step < currentStep ? (
              <IconSymbol name="checkmark" size={12} color="#fff" />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  { color: step === currentStep ? "#fff" : colors.text },
                ]}
              >
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor:
                    step < currentStep ? colors.primary : colors.border,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <IconSymbol name="at" size={32} color={colors.primary} />
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          アカウントIDを設定
        </Text>
        <Text style={[styles.stepDescription, { color: colors.placeholder }]}>
          他のユーザーがあなたを見つけるための一意なIDです
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          アカウントID
        </Text>
        <View
          style={[
            styles.textInputContainer,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.inputPrefix, { color: colors.placeholder }]}>
            @
          </Text>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={formData.account_id}
            onChangeText={(text) => updateFormData("account_id", text)}
            placeholder="英数字とアンダースコアのみ"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Text style={[styles.inputHint, { color: colors.placeholder }]}>
          3-20文字、英数字と_のみ使用可能
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <IconSymbol name="person.fill" size={32} color={colors.primary} />
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          表示名とプロフィール
        </Text>
        <Text style={[styles.stepDescription, { color: colors.placeholder }]}>
          友達に表示される名前と自己紹介を設定しましょう
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          表示名 *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textInputFull,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
            },
          ]}
          value={formData.display_name}
          onChangeText={(text) => updateFormData("display_name", text)}
          placeholder="友達に表示される名前"
          placeholderTextColor={colors.placeholder}
          maxLength={30}
        />

        <Text
          style={[styles.inputLabel, { color: colors.text, marginTop: 24 }]}
        >
          自己紹介（任意）
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
            },
          ]}
          value={formData.profile_text}
          onChangeText={(text) => updateFormData("profile_text", text)}
          placeholder="趣味や興味について教えてください"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          maxLength={200}
          textAlignVertical="top"
        />
        <Text style={[styles.characterCount, { color: colors.placeholder }]}>
          {formData.profile_text.length}/200
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <IconSymbol name="camera.fill" size={32} color={colors.primary} />
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          顔写真を登録
        </Text>
        <Text style={[styles.stepDescription, { color: colors.placeholder }]}>
          本人確認のため顔写真が必要です（他のユーザーには表示されません）
        </Text>
      </View>

      <View style={styles.imageUploadContainer}>
        <TouchableOpacity
          style={[
            styles.faceImagePlaceholder,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          onPress={pickFaceImage}
        >
          {formData.face_image ? (
            <Image
              source={{ uri: formData.face_image.uri }}
              style={styles.faceImage}
            />
          ) : (
            <>
              <IconSymbol
                name="person.fill"
                size={40}
                color={colors.placeholder}
              />
              <Text style={[styles.uploadText, { color: colors.placeholder }]}>
                タップして写真を選択
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.uploadHints}>
          <Text style={[styles.uploadHint, { color: colors.placeholder }]}>
            • 顔がはっきり写っている写真を選択してください
          </Text>
          <Text style={[styles.uploadHint, { color: colors.placeholder }]}>
            • 他のユーザーには表示されません
          </Text>
          <Text style={[styles.uploadHint, { color: colors.placeholder }]}>
            • 後から変更することも可能です
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <IconSymbol name="photo.fill" size={32} color={colors.primary} />
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          アイコンを設定（任意）
        </Text>
        <Text style={[styles.stepDescription, { color: colors.placeholder }]}>
          プロフィールに表示されるアイコンを設定できます
        </Text>
      </View>

      <View style={styles.imageUploadContainer}>
        <TouchableOpacity
          style={[
            styles.iconImagePlaceholder,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          onPress={pickIconImage}
        >
          {formData.icon_image ? (
            <Image
              source={{ uri: formData.icon_image.uri }}
              style={styles.iconImage}
            />
          ) : (
            <>
              <IconSymbol
                name="photo.fill"
                size={32}
                color={colors.placeholder}
              />
              <Text style={[styles.uploadText, { color: colors.placeholder }]}>
                タップして画像を選択
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text
          style={[
            styles.uploadHint,
            { color: colors.placeholder, textAlign: "center", marginTop: 16 },
          ]}
        >
          アイコンは後からでも設定できます
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            アカウント作成
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
            ステップ {currentStep} / 4
          </Text>
        </View>

        {renderStepIndicator()}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.backButton,
                { borderColor: colors.border },
              ]}
              onPress={prevStep}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>
                戻る
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              {
                backgroundColor:
                  (currentStep === 1 && canProceedStep1) ||
                  (currentStep === 2 && canProceedStep2) ||
                  (currentStep === 3 && canProceedStep3) ||
                  currentStep === 4
                    ? colors.primary
                    : colors.placeholder,
              },
              currentStep === 1 && { flex: 1 },
            ]}
            onPress={currentStep === 4 ? completeUserSetup : nextStep}
            disabled={
              loading ||
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2) ||
              (currentStep === 3 && !canProceedStep3)
            }
          >
            <Text style={styles.nextButtonText}>
              {loading ? "作成中..." : currentStep === 4 ? "完了" : "次へ"}
            </Text>
            {!loading && currentStep < 4 && (
              <IconSymbol name="chevron.right" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginVertical: 24,
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  stepLine: {
    width: 24,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    paddingBottom: 24,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputPrefix: {
    fontSize: 16,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
  textInputFull: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 100,
  },
  inputHint: {
    fontSize: 14,
    marginTop: 4,
  },
  characterCount: {
    fontSize: 14,
    textAlign: "right",
    marginTop: 4,
  },
  imageUploadContainer: {
    alignItems: "center",
    gap: 24,
  },
  faceImagePlaceholder: {
    width: 160,
    height: 200,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  faceImage: {
    width: 156,
    height: 196,
    borderRadius: 10,
  },
  iconImagePlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  iconImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  uploadText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  uploadHints: {
    gap: 4,
  },
  uploadHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  navigation: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
