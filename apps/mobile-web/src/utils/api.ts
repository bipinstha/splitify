const BASE_URL = 'https://k34yr3amve.execute-api.us-east-1.amazonaws.com/prod';

export const api = {
  getBalances: async (userId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/balances?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch balances');
      return await response.json();
    } catch (error) {
      console.error('API Error (getBalances):', error);
      throw error;
    }
  },

  createExpense: async (expenseData: any) => {
    try {
      const response = await fetch(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${BASE_URL}/expenses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${BASE_URL}/expenses?id=${id}&groupId=${groupId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete expense');
      return await response.json();
    } catch (error) {
      console.error('API Error (deleteExpense):', error);
      throw error;
    }
  },

  getUploadUrl: async (fileName: string, contentType: string, expenseId?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/attachments/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${BASE_URL}/expenses?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return await response.json();
    } catch (error) {
      console.error('API Error (listExpenses):', error);
      throw error;
    }
  },

  createGroup: async (groupData: any) => {
    try {
      const response = await fetch(`${BASE_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${BASE_URL}/groups?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      return await response.json();
    } catch (error) {
      console.error('API Error (listGroups):', error);
      throw error;
    }
  },

  listActivities: async (userId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/activities?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return await response.json();
    } catch (error) {
      console.error('API Error (listActivities):', error);
      throw error;
    }
  },

  inviteMember: async (groupId: string, email: string) => {
    try {
      const response = await fetch(`${BASE_URL}/groups/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, email }),
      });
      if (!response.ok) throw new Error('Failed to invite member');
      return await response.json();
    } catch (error) {
      console.error('API Error (inviteMember):', error);
      throw error;
    }
  },
};
