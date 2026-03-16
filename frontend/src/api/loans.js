import apiClient from './client';

export const loansAPI = {
  reserve: async (bookId) => {
    const response = await apiClient.post('/api/loans/reserve', { book_id: bookId });
    return response.data;
  },
  assign: async (bookId, userId) => {
    const response = await apiClient.post('/api/loans/assign', {
      book_id: bookId,
      user_id: userId,
    });
    return response.data;
  },

  confirmPickup: async (loanId) => {
    const response = await apiClient.post(`/api/loans/${loanId}/pickup`);
    return response.data;
  },

  return: async (loanId) => {
    const response = await apiClient.post(`/api/loans/${loanId}/return`);
    return response.data;
  },

  cancel: async (loanId) => {
    const response = await apiClient.post(`/api/loans/${loanId}/cancel`);
    return response.data;
  },

  getMyLoans: async () => {
    const response = await apiClient.get('/api/loans/my-loans');
    return response.data;
  },

  getAll: async (skip = 0, limit = 100) => {
    const response = await apiClient.get('/api/loans', {
      params: { skip, limit },
    });
    return response.data;
  },
};
