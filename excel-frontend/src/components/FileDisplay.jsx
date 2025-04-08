import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const FileDisplay = () => {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);

  // Fetch list of uploaded files
  const fetchFiles = async () => {
    try {
      setError(null);
      const response = await axios.get('http://localhost:3000/api/excel/files');
      if (response.data?.files) {
        setFiles(response.data.files);
      } else {
        setError('Received unexpected response format');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load files. Is the backend running?');
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3000/api/excel/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        setSuccess('File uploaded successfully!');
        await fetchFiles();
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Upload failed. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (filename) => {
    try {
      setError(null);
      const response = await axios.delete(`http://localhost:3000/api/excel/delete/${filename}`);
      
      if (response.data.success) {
        setSuccess(`File ${filename} deleted successfully!`);
        await fetchFiles(); // Refresh the file list
      } else {
        setError(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || 'Failed to delete file');
    }
  };

  // Display file content in table format
  const handleDisplayContent = async (filename) => {
    try {
      setError(null);
      const response = await axios.get(`http://localhost:3000/api/excel/read/${filename}`);
      
      if (response.data.success) {
        let content = response.data.content;
        
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch (e) {
            console.error('Failed to parse content:', e);
          }
        }
        
        if (Array.isArray(content)) {
          setFileContent(content);
        } 
        else if (content && content.data && Array.isArray(content.data)) {
          setFileContent(content.data);
        }
        else {
          setFileContent([content]);
        }
        
        setViewingFile(filename);
      } else {
        setError(response.data.message || 'Failed to display file content');
      }
    } catch (error) {
      console.error('Content display error:', error);
      setError(error.response?.data?.message || 'Failed to display file content');
    }
  };
  
  // Render file content as HTML table
  const renderTableContent = () => {
    if (!fileContent) {
      return <p>Loading content...</p>;
    }
  
    const contentArray = Array.isArray(fileContent) ? fileContent : [fileContent];
  
    if (contentArray.length === 0) {
      return <p>No data available</p>;
    }
  
    const allKeys = contentArray.reduce((keys, row) => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(key => {
          if (!keys.includes(key)) keys.push(key);
        });
      }
      return keys;
    }, []);
  
    if (allKeys.length === 0) {
      return (
        <pre className="file-content">
          {JSON.stringify(fileContent, null, 2)}
        </pre>
      );
    }
  
    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {allKeys.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contentArray.map((row, index) => (
              <tr key={index}>
                {allKeys.map(col => (
                  <td key={`${index}-${col}`}>
                    {row && row[col] !== undefined ? String(row[col]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Download file
  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/excel/download/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      setError('Download failed');
    }
  };

  // Close file viewer
  const closeViewer = () => {
    setViewingFile(null);
    setFileContent(null);
  };

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="file-display">
      <h1>File Upload System</h1>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      <div className="upload-section">
        <h2>Upload File</h2>
        <input 
          type="file" 
          onChange={handleFileUpload}
          disabled={isUploading}
          accept=".xlsx,.xls,.csv"
        />
        {isUploading && (
          <div className="progress-bar">
            <div 
              className="progress" 
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress}%
            </div>
          </div>
        )}
      </div>
      
      <div className="file-list">
        <h2>Uploaded Files</h2>
        {files.length === 0 ? (
          <p>No files uploaded yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.filename}>
                  <td>{file.filename}</td>
                  <td>{(file.size / 1024).toFixed(2)} KB</td>
                  <td>{new Date(file.createdAt).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleDisplayContent(file.filename)}>
                      View Table
                    </button>
                    <button onClick={() => handleDownload(file.filename)}>
                      Download
                    </button>
                    <button 
                      onClick={() => handleDeleteFile(file.filename)}
                      style={{ backgroundColor: '#f44336' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewingFile && (
        <div className="file-viewer-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Viewing: {viewingFile}</h3>
              <button onClick={closeViewer} className="close-button">×</button>
            </div>
            {renderTableContent()}
          </div>
        </div>
      )}

      <style jsx>{`
        .file-display {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          position: relative;
        }
        
        .file-viewer-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 5px;
          width: 80%;
          max-width: 1200px;
          max-height: 90vh;
          overflow: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
        
        .file-content {
          white-space: pre-wrap;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          max-height: 70vh;
          overflow: auto;
        }
        
        .table-container {
          max-height: 70vh;
          overflow: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        
        .data-table th, .data-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        .data-table th {
          background-color: #f2f2f2;
          position: sticky;
          top: 0;
        }
        
        .data-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .error {
          color: red;
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid red;
          border-radius: 4px;
          background-color: #ffeeee;
        }
        
        .success {
          color: green;
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid green;
          border-radius: 4px;
          background-color: #eeffee;
        }
        
        .upload-section, .file-list {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .progress-bar {
          width: 100%;
          background-color: #f1f1f1;
          margin-top: 10px;
          border-radius: 4px;
        }
        
        .progress {
          height: 20px;
          background-color: #4CAF50;
          text-align: center;
          line-height: 20px;
          color: white;
          border-radius: 4px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        button {
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          margin-right: 5px;
          margin-bottom: 5px;
        }
        
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default FileDisplay;