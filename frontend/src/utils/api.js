import axios from 'axios';

const API_URL = 'http://localhost:5000/reports'; // Backend API URL

// Submit report with image
export const submitReport = async (data) => {
  const response = await axios.post(API_URL, data, {
    headers: {
      'Content-Type': 'multipart/form-data', // Necessary for file upload
    },
  });
  return response.data;
};

// Get all reports (public summary-only fields)
export const getReports = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Get all reports with full details (admin/investigator use)
export const getAllReports = async () => {
  const response = await axios.get(`${API_URL}/all`);
  return response.data;
};

// Get trending reports
export const getTrendingReports = async (lat, lng, radius = 10000, limit = 10) => {
  const response = await axios.get(`${API_URL}/trending`, {
    params: { lat, lng, radius, limit }
  });
  return response.data;
};

// Update report status (admin use)
export const updateReportStatus = async (reportId, status) => {
  const response = await axios.put(`${API_URL}/${reportId}/status`, { status });
  return response.data;
};

// Get a single report by ID
export const getReportById = async (reportId) => {
  const response = await axios.get(`${API_URL}/${reportId}`);
  return response.data;
};

// Verify a report on the blockchain
export const verifyReportOnChain = async (reportId) => {
  const response = await axios.get(`${API_URL}/${reportId}/verify`);
  return response.data;
};