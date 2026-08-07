import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = 'https://9rp3icsdy5.execute-api.us-east-1.amazonaws.com/prod';

const getHeaders = async () => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const api = {
  getBalances: async (userId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/balances?userId=${userId}&t=${Date.now()}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch balances');
      return await response.json();
    } catch (error) {
      console.error('API Error (getBalances):', error);
      throw error;
    }
  },

  createExpense: async (expenseData: any) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) throw new Error('Failed to create expense');
      return await response.json();
    } catch (error) {
      console.error('API Error (createExpense):', error);
      throw error;
    }
  },

  updateExpense: async (expenseData: any) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/expenses`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) throw new Error('Failed to update expense');
      return await response.json();
    } catch (error) {
      console.error('API Error (updateExpense):', error);
      throw error;
    }
  },

  deleteExpense: async (id: string, groupId: string) => {
    try {
      const headers = await getHeaders();
      const url = `${BASE_URL}/expenses?id=${id}&groupId=${groupId}`;
      console.log(`[API] Deleting expense via: ${url}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[API] Failed to delete expense. Status: ${response.status}. Error body: ${errText}`);
        throw new Error(`Failed to delete expense: ${response.status} - ${errText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error (deleteExpense):', error);
      throw error;
    }
  },

  getUploadUrl: async (fileName: string, contentType: string, expenseId?: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/attachments/upload-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileName, contentType, expenseId }),
      });
      if (!response.ok) throw new Error('Failed to get upload URL');
      return await response.json();
    } catch (error) {
      console.error('API Error (getUploadUrl):', error);
      throw error;
    }
  },

  uploadFile: async (url: string, fileUri: string, contentType: string) => {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
    } catch (error) {
      console.error('File Upload Error:', error);
      throw error;
    }
  },

  listExpenses: async (userId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/expenses?userId=${userId}&t=${Date.now()}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return await response.json();
    } catch (error) {
      console.error('API Error (listExpenses):', error);
      throw error;
    }
  },

  createGroup: async (groupData: any) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify(groupData),
      });
      if (!response.ok) throw new Error('Failed to create group');
      return await response.json();
    } catch (error) {
      console.error('API Error (createGroup):', error);
      throw error;
    }
  },

  listGroups: async (userId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/groups?userId=${userId}&t=${Date.now()}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch groups');
      return await response.json();
    } catch (error) {
      console.error('API Error (listGroups):', error);
      throw error;
    }
  },

  listActivities: async (userId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/activities?userId=${userId}&t=${Date.now()}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return await response.json();
    } catch (error) {
      console.error('API Error (listActivities):', error);
      throw error;
    }
  },

  savePushToken: async (userId: string, pushToken: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/users/push-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, pushToken }),
      });
      if (!response.ok) throw new Error('Failed to save push token');
      return await response.json();
    } catch (error) {
      console.error('API Error (savePushToken):', error);
      throw error;
    }
  },

  inviteMember: async (groupId: string, emailOrPhone: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/groups/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ groupId, emailOrPhone }),
      });
      if (!response.ok) throw new Error('Failed to invite member');
      return await response.json();
    } catch (error) {
      console.error('API Error (inviteMember):', error);
      throw error;
    }
  },

  updateGroup: async (groupId: string, data: { name?: string, type?: string }) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/groups?groupId=${groupId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update group');
      return await response.json();
    } catch (error) {
      console.error('API Error (updateGroup):', error);
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/groups?groupId=${groupId}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete group');
      return await response.json();
    } catch (error) {
      console.error('API Error (deleteGroup):', error);
      throw error;
    }
  },

  addComment: async (expenseId: string, text: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expenseId, text }),
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return await response.json();
    } catch (error) {
      console.error('API Error (addComment):', error);
      throw error;
    }
  },

  listComments: async (expenseId: string) => {
    try {
      const headers = await getHeaders();
      const url = `${BASE_URL}/comments?expenseId=${expenseId}&t=${Date.now()}`;
      console.log(`[API] Fetching comments from: ${url}`);
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[API] Failed to fetch comments. Status: ${response.status}. Error body: ${errText}`);
        throw new Error(`Failed to fetch comments: ${response.status} - ${errText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error (listComments):', error);
      throw error;
    }
  },

  settleUp: async (toUserId: string, amount: string, groupId?: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/settlements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ toUserId, amount, groupId }),
      });
      if (!response.ok) throw new Error('Failed to record settlement');
      return await response.json();
    } catch (error) {
      console.error('API Error (settleUp):', error);
      throw error;
    }
  },

  getGroupAnalytics: async (groupId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/groups/analytics?groupId=${groupId}&t=${Date.now()}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return await response.json();
    } catch (error) {
      console.error('API Error (getGroupAnalytics):', error);
      throw error;
    }
  },

  getUserProfile: async (userId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/users/profile?userId=${userId}&t=${Date.now()}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return await response.json();
    } catch (error) {
      console.error('API Error (getUserProfile):', error);
      return { userId, email: userId, phone: userId };
    }
  },
};
