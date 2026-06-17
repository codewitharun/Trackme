import axios from 'axios';
import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = getAuth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const getProfile = () => api.get('/profile').then(r => r.data);
export const registerUser = (data: any) => api.post('/register', data).then(r => r.data);
export const updateFcmToken = (fcmToken: string) => api.put('/profile/fcm', { fcmToken });
export const listUsers = (params?: any) => api.get('/users', { params }).then(r => r.data);
export const updateUser = (uid: string, data: any) => api.put(`/users/${uid}`, data);
export const deactivateUser = (uid: string) => api.delete(`/users/${uid}`);

// ── Check-ins ─────────────────────────────────────────────────────────────────
export const submitCheckin = (formData: FormData) =>
  api.post('/checkins', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const getCheckins = (params?: any) => api.get('/checkins', { params }).then(r => r.data);
export const reviewCheckin = (id: string, data: { status: string; feedback?: string }) =>
  api.put(`/checkins/${id}/review`, data);
export const checkoutCheckin = (id: string) =>
  api.patch(`/checkins/${id}/checkout`, {}).then(r => r.data);
export const triggerCheckinAlert = (message?: string) =>
  api.post('/checkins/alert', { message }).then(r => r.data);

// ── Summaries ─────────────────────────────────────────────────────────────────
export const submitSummary = (data: any) => api.post('/summaries', data).then(r => r.data);
export const getSummaries = (params?: any) => api.get('/summaries', { params }).then(r => r.data);
export const addFeedback = (id: string, data: any) => api.put(`/summaries/${id}/feedback`, data);
export const getMissingSummaries = () => api.get('/summaries/missing').then(r => r.data);

// ── Schedules ─────────────────────────────────────────────────────────────────
export const createSchedule = (data: any) => api.post('/schedules', data).then(r => r.data);
export const getSchedules = () => api.get('/schedules').then(r => r.data);
export const updateSchedule = (id: string, data: any) => api.put(`/schedules/${id}`, data);
export const deleteSchedule = (id: string) => api.delete(`/schedules/${id}`);
export const getAnalytics = (params?: any) => api.get('/analytics', { params }).then(r => r.data);

export default api;

// ── Organisation ─────────────────────────────────────────────────────────────
export const createOrg = (data: any) => api.post('/organisations', data).then(r => r.data);
export const getMyOrg = () => api.get('/organisations/mine').then(r => r.data);
export const updateOrg = (data: any) => api.put('/organisations/mine', data).then(r => r.data);
