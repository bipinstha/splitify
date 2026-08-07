import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { useState, useEffect } from 'react';

export interface UserSession {
  userId: string;
  username: string;
  email?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const { userId, username } = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({ userId, username, email: attributes.email });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return { user, loading, refreshUser: checkUser };
};
