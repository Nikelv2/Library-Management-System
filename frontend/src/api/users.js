import apiClient from './client';

export const usersAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/users');
    return response.data;
  },
  getById: async (userId) => {
    const response = await apiClient.get(`/api/users/${userId}`);
    return response.data;
  },
  getLoans: async (userId) => {
    const response = await apiClient.get(`/api/users/${userId}/loans`);
    return response.data;
  },
  ban: async (userId) => {
    const response = await apiClient.post(`/api/users/${userId}/ban`);
    return response.data;
  },

  unban: async (userId) => {
    const response = await apiClient.post(`/api/users/${userId}/unban`);
    return response.data;
  },
};
