import { useEffect, useState } from "react";
import { getUserId } from "@/utils/user-storage";

/**
 * 現在のユーザーIDを取得するカスタムフック
 */
export const useUserId = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        setLoading(true);
        setError(null);
        const id = await getUserId();
        setUserId(id);
      } catch (err) {
        console.error("Failed to fetch user ID:", err);
        setError("ユーザーIDの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  const refreshUserId = async () => {
    try {
      setLoading(true);
      setError(null);
      const id = await getUserId();
      setUserId(id);
    } catch (err) {
      console.error("Failed to refresh user ID:", err);
      setError("ユーザーIDの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return {
    userId,
    loading,
    error,
    refreshUserId,
  };
};
