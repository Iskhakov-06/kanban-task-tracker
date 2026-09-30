import api from './axios';

//  Auth 
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword:  (data)  => api.post('/auth/forgot-password', data),
  resetPassword:   (data)  => api.post('/auth/reset-password', data),
};

//  Boards 
export const boardsApi = {
  getAll: (params) => api.get('/boards', { params }),
  getOne: (id) => api.get(`/boards/${id}`),
  create: (data) => api.post('/boards', data),
  update: (id, data) => api.put(`/boards/${id}`, data),
  delete: (id) => api.delete(`/boards/${id}`),
  addMember: (id, data) => api.post(`/boards/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/boards/${id}/members/${userId}`),
};

//  Columns 
export const columnsApi = {
  getAll: (boardId) => api.get(`/boards/${boardId}/columns`),
  create: (boardId, data) => api.post(`/boards/${boardId}/columns`, data),
  update: (boardId, colId, data) => api.put(`/boards/${boardId}/columns/${colId}`, data),
  move: (boardId, colId, data) => api.patch(`/boards/${boardId}/columns/${colId}/move`, data),
  delete: (boardId, colId) => api.delete(`/boards/${boardId}/columns/${colId}`),
};

//  Tasks 
export const tasksApi = {
  getAll: (boardId, colId, params) =>
    api.get(`/boards/${boardId}/columns/${colId}/tasks`, { params }),
  getOne: (boardId, colId, taskId) =>
    api.get(`/boards/${boardId}/columns/${colId}/tasks/${taskId}`),
  create: (boardId, colId, data) =>
    api.post(`/boards/${boardId}/columns/${colId}/tasks`, data),
  update: (boardId, colId, taskId, data) =>
    api.put(`/boards/${boardId}/columns/${colId}/tasks/${taskId}`, data),
  move: (boardId, colId, taskId, data) =>
    api.patch(`/boards/${boardId}/columns/${colId}/tasks/${taskId}/move`, data),
  delete: (boardId, colId, taskId) =>
    api.delete(`/boards/${boardId}/columns/${colId}/tasks/${taskId}`),
  addComment: (boardId, colId, taskId, data) =>
    api.post(`/boards/${boardId}/columns/${colId}/tasks/${taskId}/comments`, data),
  deleteComment: (boardId, colId, taskId, commentId) =>
    api.delete(`/boards/${boardId}/columns/${colId}/tasks/${taskId}/comments/${commentId}`),
  getHistory: (boardId, colId, taskId) =>
    api.get(`/boards/${boardId}/columns/${colId}/tasks/${taskId}/history`),
};

//  Users 
export const usersApi = {
  search:  (query) => api.get('/users', { params: { search: query, limit: 10 } }),
  getOne:  (id)    => api.get(`/users/${id}`),
};