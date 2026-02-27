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

// Get all reports
export const getReports = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Update report status (admin use)
export const updateReportStatus = async (reportId, status) => {
  const response = await axios.put(`${API_URL}/${reportId}/status`, { status });
  return response.data;
};