import apiClient from './client';

export const booksAPI = {
  getAll: async (skip = 0, limit = 100, search = null) => {
    const params = { skip, limit };
    if (search) {
      params.search = search;
    }
    const response = await apiClient.get('/api/books', { params });
    return response.data;
  },

  getById: async (bookId) => {
    const response = await apiClient.get(`/api/books/${bookId}`);
    return response.data;
  },

  create: async (bookData) => {
    const response = await apiClient.post('/api/books', bookData);
    return response.data;
  },

  update: async (bookId, bookData) => {
    const response = await apiClient.put(`/api/books/${bookId}`, bookData);
    return response.data;
  },

  delete: async (bookId) => {
    await apiClient.delete(`/api/books/${bookId}`);
  },
};
