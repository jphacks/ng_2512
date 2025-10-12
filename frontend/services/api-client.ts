import { getUserId } from "@/utils/user-storage";
import Constants from "expo-constants";

// 環境変数からAPIエンドポイントを取得（優先順位: .env > app.json > デフォルト）
const getApiBaseUrl = () => {
  // 1. process.env（.envファイル）を最優先
  if (process.env.EXPO_PUBLIC_API_ENDPOINT) {
    return process.env.EXPO_PUBLIC_API_ENDPOINT;
  }

  // 2. app.jsonのextraフィールド
  if (Constants.expoConfig?.extra?.apiEndpoint) {
    return Constants.expoConfig.extra.apiEndpoint;
  }

  // 3. 旧形式のmanifest
  if (Constants.manifest?.extra?.apiEndpoint) {
    return Constants.manifest.extra.apiEndpoint;
  }

  // 4. デフォルト値
  return "http://localhost:8000";
};

const API_BASE_URL = getApiBaseUrl();

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log("API Base URL:", this.baseUrl);
    console.log("Environment variables check:");
    console.log(
      "- EXPO_PUBLIC_API_ENDPOINT:",
      process.env.EXPO_PUBLIC_API_ENDPOINT
    );
    console.log(
      "- Constants.expoConfig?.extra?.apiEndpoint:",
      Constants.expoConfig?.extra?.apiEndpoint
    );
    console.log(
      "- Constants.manifest?.extra?.apiEndpoint:",
      Constants.manifest?.extra?.apiEndpoint
    );
  }

  /**
   * 共通のHTTPリクエスト処理
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config: RequestInit = {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      };

      console.log(`API Request: ${config.method || "GET"} ${url}`);

      // ボディがある場合はその内容をログ出力
      if (config.body) {
        console.log("Request Body:", config.body);
        // JSONとして解析可能な場合は整形して表示
        try {
          const parsedBody = JSON.parse(config.body as string);
          console.log(
            "Request Body (parsed):",
            JSON.stringify(parsedBody, null, 2)
          );
        } catch (e) {
          // JSON以外のボディの場合はそのまま表示
          console.log("Request Body (raw):", config.body);
        }
      }

      const response = await fetch(url, config);
      const status = response.status;

      if (response.ok) {
        const data = await response.json();
        return { data, status };
      } else {
        const errorText = await response.text();
        console.error(`API Error: ${status} - ${errorText}`);
        return { error: errorText || "Network error", status };
      }
    } catch (error) {
      console.error("API Request failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }

  /**
   * GETリクエスト
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    return this.request<T>(
      endpoint + (url.search ? `?${url.searchParams}` : "")
    );
  }

  /**
   * POSTリクエスト
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUTリクエスト
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * UPDATEリクエスト（PATCHメソッド）
   */
  async update<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETEリクエスト
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * ファイルアップロード用POSTリクエスト
   */
  async postWithFile<T>(
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`API File Upload: POST ${url}`);

      // FormDataの内容をログ出力（React Native環境対応）
      console.log("FormData body:", formData);
      console.log("FormData type:", typeof formData);

      // FormData._partsプロパティが存在する場合（React Native環境）
      if ((formData as any)._parts) {
        console.log("FormData parts:");
        (formData as any)._parts.forEach(([key, value]: [string, any]) => {
          if (value && typeof value === "object" && value.uri) {
            // ファイルの場合
            console.log(`  ${key}:`, {
              name: value.name || "unknown",
              type: value.type || "unknown",
              uri: value.uri,
            });
          } else {
            // 通常の値の場合
            console.log(`  ${key}:`, value);
          }
        });
      }

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const status = response.status;

      if (response.ok) {
        const data = await response.json();
        return { data, status };
      } else {
        const errorText = await response.text();
        console.error(`API Error: ${status} - ${errorText}`);
        return { error: errorText || "Upload failed", status };
      }
    } catch (error) {
      console.error("File upload failed:", error);
      return {
        error: error instanceof Error ? error.message : "Upload error",
        status: 0,
      };
    }
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// API呼び出し用のヘルパー関数
export const withUserId = async <T>(
  apiCall: (userId: number) => Promise<ApiResponse<T>>
): Promise<ApiResponse<T>> => {
  const userId = await getUserId();
  if (!userId) {
    return { error: "User not authenticated", status: 401 };
  }
  return apiCall(userId);
};

// user_idをクエリパラメータに含めてAPIを呼び出すヘルパー関数
export const withUserIdInQuery = async <T>(
  endpoint: string,
  additionalParams?: any
): Promise<ApiResponse<T>> => {
  const userId = await getUserId();
  if (!userId) {
    return { error: "User not authenticated", status: 401 };
  }

  const params = {
    user_id: userId,
    ...additionalParams,
  };

  return apiClient.get<T>(endpoint, params);
};

// 型定義
export interface User {
  user_id: number;
  account_id: string;
  display_name: string;
  icon_asset_url: string;
  updated_at?: string;
}

export interface Participant {
  user_id: number;
  account_id: string;
  status: "pending" | "accepted" | "rejected";
  display_name: string;
  icon_asset_url: string;
}

export interface Proposal {
  id: number;
  title: string;
  event_date: string;
  location: string;
  creator_id: number;
  created_at: string;
  deadline_at: string;
  status: string;
  participants: Participant[];
}

export interface ChatGroup {
  chat_groupe_id: number;
  title: string;
  icon_url: string;
  last_message: string;
  last_message_date: string;
  new_chat_num: number;
}

export interface ChatMessage {
  chat_id: number;
  sender_id: number;
  sender_name: string;
  sender_icon_url: string;
  body: string;
  image_url: string;
  posted_at: string;
}

export interface Album {
  album_id: number;
  title: string;
  last_uploaded_image_url: string;
  image_num: number;
  shared_user_num: number;
}

export interface AlbumImage {
  is_creator: boolean;
  image_id: number;
  image_url: string;
}

export interface FriendData {
  friend: User[];
  friend_requested: User[];
  friend_recommended: User[];
  friend_requesting: User[];
  friend_blocked: User[];
}

export interface NotificationData {
  proposal_num: number;
  new_chat_num: number;
  friend_request_num: number;
}

// API呼び出し用のヘルパー関数
export const getNotifications = async (): Promise<NotificationData | null> => {
  const result = await withUserIdInQuery<NotificationData>("/api/notification");
  return result.data || null;
};

// Proposal関連のAPI呼び出し
export const getProposals = async (): Promise<Proposal[] | null> => {
  const result = await withUserIdInQuery<Proposal[]>("/api/proposal");
  return result.data || null;
};

// Friend関連のAPI呼び出し
export const getFriends = async (): Promise<FriendData | null> => {
  const result = await withUserIdInQuery<FriendData>("/api/friend");
  return result.data || null;
};

export const searchFriends = async (
  searchText: string
): Promise<User[] | null> => {
  console.log("searchFriends called with:", searchText);
  const result = await apiClient.post<User[]>("/api/friend/search", {
    input_text: searchText,
  });
  console.log("searchFriends result:", result);
  return result.data || null;
};

// フレンド申請を送る
export const sendFriendRequest = async (
  targetUserId: number
): Promise<boolean> => {
  const result = await withUserId(async (userId) => {
    return apiClient.put("/api/friend/request", {
      user_id: userId,
      friend_user_id: targetUserId,
      updated_status: "requested", // 2: "requested"
    });
  });

  if (result.error) {
    console.error("Friend request failed:", result.error);
    return false;
  }

  return true;
};

// フレンド申請を承認・拒否する
export const respondToFriendRequest = async (
  friendUserId: number,
  action: "accept" | "reject"
): Promise<boolean> => {
  const result = await withUserId(async (userId) => {
    return apiClient.put("/api/friend/request", {
      user_id: userId,
      friend_user_id: friendUserId,
      updated_status: action === "accept" ? "accepted" : "declined", // 1: "accepted", 0: "declined"
    });
  });

  if (result.error) {
    console.error("Friend request response failed:", result.error);
    return false;
  }

  return true;
};

// Album関連のAPI呼び出し
export const getAlbums = async (
  oldestAlbumId?: number
): Promise<Album[] | null> => {
  const result = await withUserIdInQuery<Album[]>("/api/album", {
    oldest_album_id: oldestAlbumId || null,
  });
  return result.data || null;
};
