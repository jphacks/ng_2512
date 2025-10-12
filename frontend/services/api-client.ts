import { getUserId } from "@/utils/user-storage";

// 環境変数からAPIエンドポイントを取得
const API_BASE_URL = process.env.API_ENDPOINT || "https://api.example.com";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
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
  const result = await withUserId(async (userId) => {
    return apiClient.get<NotificationData>("/api/notification", {
      user_id: userId,
    });
  });

  return result.data || null;
};
