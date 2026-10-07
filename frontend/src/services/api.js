import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes
});

// Request interceptor to attach optional user OpenAI API key from localStorage
apiClient.interceptors.request.use(
  (config) => {
    try {
      const savedKey = localStorage.getItem('vidqa_openai_key');
      if (savedKey && savedKey.trim()) {
        config.headers['x-openai-api-key'] = savedKey.trim();
      }
    } catch {
      // localStorage may fail in private mode
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred.';
    const customError = new Error(message);
    customError.status = error.response?.status;
    return Promise.reject(customError);
  }
);

export const getStoredApiKey = () => {
  try {
    return localStorage.getItem('vidqa_openai_key') || '';
  } catch {
    return '';
  }
};

export const setStoredApiKey = (key) => {
  try {
    if (key && key.trim()) {
      localStorage.setItem('vidqa_openai_key', key.trim());
    } else {
      localStorage.removeItem('vidqa_openai_key');
    }
  } catch {
    // ignore
  }
};

export const checkHealth = async () => {
  try {
    const res = await apiClient.get('/health');
    return res.data;
  } catch {
    return { status: 'offline' };
  }
};

export const processVideo = async (youtubeUrl) => {
  const res = await apiClient.post('/videos', { youtubeUrl });
  return res.data;
};

export const getVideo = async (videoId) => {
  const res = await apiClient.get(`/videos/${videoId}`);
  return res.data;
};

export const askQuestion = async (videoId, question) => {
  const res = await apiClient.post(`/videos/${videoId}/ask`, { question });
  return res.data;
};

export const getHistory = async () => {
  const res = await apiClient.get('/videos/history');
  return res.data;
};

export const deleteVideo = async (videoId) => {
  const res = await apiClient.delete(`/videos/${videoId}`);
  return res.data;
};

export default apiClient;
