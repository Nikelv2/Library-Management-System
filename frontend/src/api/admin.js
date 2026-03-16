import apiClient from './client';

export const adminAPI = {
  getAllUsers: async () => {
    const response = await apiClient.get('/api/admin/users');
    return response.data;
  },

  promoteToLibrarian: async (userId) => {
    const response = await apiClient.post(`/api/admin/users/${userId}/promote`);
    return response.data;
  },

  demoteToMember: async (userId) => {
    const response = await apiClient.post(`/api/admin/users/${userId}/demote`);
    return response.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await apiClient.post('/api/admin/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  changeUserPassword: async (userId, newPassword) => {
    const response = await apiClient.post(`/api/admin/users/${userId}/password`, {
      new_password: newPassword,
    });
    return response.data;
  },
};
