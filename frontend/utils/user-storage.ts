import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "user_id";
const SETUP_COMPLETED_KEY = "setup_completed";

export interface UserData {
  user_id: number;
  account_id: string;
  display_name: string;
  icon_asset_url?: string;
  profile_text?: string;
}

/**
 * 保存されているユーザーIDを取得
 */
export const getUserId = async (): Promise<number | null> => {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    return userId ? parseInt(userId, 10) : null;
  } catch (error) {
    console.error("Failed to get user ID from storage:", error);
    return null;
  }
};

/**
 * ユーザーIDを保存
 */
export const saveUserId = async (userId: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_ID_KEY, userId.toString());
  } catch (error) {
    console.error("Failed to save user ID to storage:", error);
    throw error;
  }
};

/**
 * ユーザーIDを削除（ログアウト時など）
 */
export const removeUserId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
    await AsyncStorage.removeItem(SETUP_COMPLETED_KEY);
  } catch (error) {
    console.error("Failed to remove user ID from storage:", error);
    throw error;
  }
};

/**
 * セットアップ完了状態を確認
 */
export const isSetupCompleted = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(SETUP_COMPLETED_KEY);
    return completed === "true";
  } catch (error) {
    console.error("Failed to get setup status from storage:", error);
    return false;
  }
};

/**
 * セットアップ完了状態を保存
 */
export const setSetupCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETUP_COMPLETED_KEY, "true");
  } catch (error) {
    console.error("Failed to save setup status to storage:", error);
    throw error;
  }
};

/**
 * 新しいユーザーを作成（モック実装）
 * 実際のアプリでは POST /api/user/create を呼び出す
 */
export const createUser = async (userData: {
  account_id: string;
  display_name: string;
  icon_image?: any;
  face_image?: any;
  profile_text?: string;
}): Promise<number> => {
  try {
    // TODO: 実際のAPI呼び出しに置き換える
    // const response = await fetch('/api/user/create', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(userData),
    // });
    // const result = await response.json();
    // return result.user_id;

    // モック実装: 常にuser_id=1を返す
    console.log("Creating user with data:", userData);
    return 1;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
};

/**
 * アプリ初期化時のユーザー確認・作成処理
 */
export const initializeUser = async (): Promise<{
  userId: number;
  needsSetup: boolean;
}> => {
  try {
    // 既存のユーザーIDを確認
    let userId = await getUserId();
    const setupCompleted = await isSetupCompleted();

    if (userId && setupCompleted) {
      console.log("Existing user found:", userId);
      return { userId, needsSetup: false };
    }

    // ユーザーIDがないか、セットアップが未完了の場合
    if (!userId) {
      console.log("No user found, needs setup...");
      return { userId: 0, needsSetup: true };
    } else {
      console.log("User found but setup incomplete:", userId);
      return { userId, needsSetup: true };
    }
  } catch (error) {
    console.error("Failed to initialize user:", error);
    throw error;
  }
};

/**
 * セットアップを完了する（ユーザー作成とセットアップ完了フラグの設定）
 */
export const completeSetup = async (userData: {
  account_id: string;
  display_name: string;
  icon_image?: any;
  face_image?: any;
  profile_text?: string;
}): Promise<number> => {
  try {
    // ユーザーを作成
    const userId = await createUser(userData);

    // ユーザーIDとセットアップ完了状態を保存
    await saveUserId(userId);
    await setSetupCompleted();

    console.log("Setup completed for user:", userId);
    return userId;
  } catch (error) {
    console.error("Failed to complete setup:", error);
    throw error;
  }
};
