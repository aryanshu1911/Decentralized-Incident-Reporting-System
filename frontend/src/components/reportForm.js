import { useState, useRef } from 'react';
import { submitReport } from '../utils/api';

export default function ReportForm({ onReportSubmitted }) {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [reportId, setReportId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description || !location || !category || !file) {
      setMessage('All fields and file are required.');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('description', description);
    formData.append('location', location);
    formData.append('category', category);
    formData.append('file', file);

    try {
      const data = await submitReport(formData);
      setReportId(data.reportId);
      setMessage('Report submitted successfully!');
      setMessageType('success');
      setDescription('');
      setLocation('');
      setCategory('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Trigger auto-refresh of report list
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Error submitting report.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2><span className="icon">📝</span> Submit a Report</h2>

      {message && (
        <div className={`message ${messageType}`}>{message}</div>
      )}
      {reportId && (
        <div className="report-id-display">
          Your Report ID: <strong>{reportId}</strong>
        </div>
      )}

      <form className="report-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category...</option>
            <option value="Theft">Theft</option>
            <option value="Assault">Assault</option>
            <option value="Vandalism">Vandalism</option>
            <option value="Fraud">Fraud</option>
            <option value="Harassment">Harassment</option>
            <option value="Drug Activity">Drug Activity</option>
            <option value="Traffic Violation">Traffic Violation</option>
            <option value="Public Disturbance">Public Disturbance</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            placeholder="Describe the incident in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            placeholder="e.g. 123 Main Street, City"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Evidence (Image)</label>
          <div className="file-upload">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file ? (
              <p className="file-name">📎 {file.name}</p>
            ) : (
              <p className="upload-text">
                <span className="highlight">Click to upload</span> or drag & drop<br />
                JPEG, JPG, PNG (max 2MB)
              </p>
            )}
          </div>
        </div>

        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}