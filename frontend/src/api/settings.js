import apiClient from './client';

export const settingsAPI = {
  get: async () => {
    const response = await apiClient.get('/api/settings');
    return response.data;
  },
  update: async (payload) => {
    const response = await apiClient.put('/api/settings', payload);
    return response.data;
  },
};
