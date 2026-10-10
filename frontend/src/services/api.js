import axios from "axios";

// When deployed on Vercel as a unified app, API requests use relative paths
// so the browser calls the same domain without CORS issues.
// In local development, it defaults to the local FastAPI port 8000.
// A custom VITE_API_URL can still be provided to point to any custom backend URL.
const API_BASE_URL =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ""
    ? import.meta.env.VITE_API_URL
    : import.meta.env.PROD
      ? ""
      : "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getPredictionOptions = async () => {
  const response = await api.get("/api/options");
  return response.data;
};

export const predictSales = async (payload) => {
  const response = await api.post("/api/predict", payload);
  return response.data;
};

export const getDashboardSummary = async () => {
  const response = await api.get("/api/summary");
  return response.data;
};

export default api;