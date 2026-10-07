import axios from 'axios';

const getFastApiUrl = () => process.env.FASTAPI_URL || 'http://localhost:8000';

export const callProcessVideo = async (videoId, apiKey = null) => {
  const url = `${getFastApiUrl()}/process`;
  try {
    const headers = {};
    if (apiKey) headers['x-openai-api-key'] = apiKey;

    const response = await axios.post(
      url,
      { videoId, apiKey },
      { headers, timeout: 120000 } // 2 minutes timeout for large transcripts
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      const detail = error.response.data?.detail || error.response.data?.message || 'Processing service error';
      const status = error.response.status;
      const err = new Error(detail);
      err.statusCode = status;
      throw err;
    }
    const err = new Error('Processing service is unreachable. Please ensure the Python FastAPI service is running on port 8000.');
    err.statusCode = 502;
    throw err;
  }
};

export const callAskQuestion = async (videoId, question, apiKey = null) => {
  const url = `${getFastApiUrl()}/ask`;
  try {
    const headers = {};
    if (apiKey) headers['x-openai-api-key'] = apiKey;

    const response = await axios.post(
      url,
      { videoId, question, apiKey },
      { headers, timeout: 60000 }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      const detail = error.response.data?.detail || error.response.data?.message || 'Q&A service error';
      const status = error.response.status;
      const err = new Error(detail);
      err.statusCode = status;
      throw err;
    }
    const err = new Error('Processing service is unreachable. Please ensure the Python FastAPI service is running on port 8000.');
    err.statusCode = 502;
    throw err;
  }
};

export const callDeleteVideo = async (videoId) => {
  const url = `${getFastApiUrl()}/video/${videoId}`;
  try {
    const response = await axios.delete(url, { timeout: 15000 });
    return response.data;
  } catch (error) {
    // Non-fatal if chroma collection cleanup fails
    console.warn(`[FastAPI Warning] Could not delete ChromaDB collection for ${videoId}:`, error.message);
    return { status: 'skipped' };
  }
};
