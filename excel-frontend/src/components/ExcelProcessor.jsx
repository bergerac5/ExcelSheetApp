// src/components/ExcelProcessor.jsx
import React, { useState } from 'react';
import axios from 'axios';
import '../css/ExcelProcessor.css'

const ExcelProcessor = () => {
  const [jsonData, setJsonData] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleExcelToJson = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3000/api/excel/to-json', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setJsonData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJsonToExcel = async () => {
    if (!jsonData) {
      setError('No JSON data available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://localhost:3000/api/excel/to-excel',
        { data: jsonData },
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'converted.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-processor">
      <h1>Excel Processor</h1>
      
      <div className="section">
        <h2>Excel to JSON</h2>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
        <button onClick={handleExcelToJson} disabled={loading}>
          {loading ? 'Processing...' : 'Convert to JSON'}
        </button>
      </div>

      <div className="section">
        <h2>JSON to Excel</h2>
        <button onClick={handleJsonToExcel} disabled={!jsonData || loading}>
          {loading ? 'Processing...' : 'Convert to Excel'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {jsonData && (
        <div className="json-result">
          <h3>JSON Result:</h3>
          <pre>{JSON.stringify(jsonData, null, 2)}</pre>
        </div>
      )}

      
    </div>
  );
};

export default ExcelProcessor;