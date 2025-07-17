// client/src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',        // CRA proxy
  withCredentials: true,  // send/receive cookies
});

// interceptor to catch 401 and refresh the access token once
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      // call refresh endpoint
      const { data } = await api.post('/auth/refresh');
      // update header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      // retry original request
      original.headers['Authorization'] = `Bearer ${data.accessToken}`;
      return api(original);
    }
    return Promise.reject(err);
  }
);

export default api;
