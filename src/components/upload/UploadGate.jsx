// src/components/upload/UploadGate.jsx
import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useTrades } from '../../hooks/useTrades';

export default function UploadGate() {
  const { loadWorkbook, fileStatus, isUploadGateVisible } = useTrades();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    if (!file) return;
    const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
    if (!isXlsx) {
      setError('Please select an .xlsx or .xls file.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: false });
        const sheetNames = wb.SheetNames;
        if (sheetNames.length === 0) {
          setError('The workbook contains no sheets.');
          return;
        }
        // Load the first sheet
        const result = loadWorkbook(wb, sheetNames[0]);
        if (!result.success) {
          setError(result.error);
        }
      } catch (err) {
        setError('Could not parse file: ' + err.message);
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be uploaded again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // If upload gate is hidden (file loaded), return null so the parent shows dashboard
  if (!isUploadGateVisible) return null;

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          background: '#11151F',
          border: isDragging ? '1px solid #FFB020' : '1px dashed #212836',
          borderRadius: '16px',
          padding: '52px 40px',
          transition: '0.2s',
          boxShadow: isDragging ? '0 0 40px rgba(255,176,32,0.08)' : 'none',
          background: isDragging ? '#151A26' : '#11151F',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: '#0D1119',
          border: '1px solid #1A2029',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          color: '#FFB020',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          ⇪
        </div>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '19px',
          fontWeight: 600,
          marginBottom: '10px',
          color: '#E7E9EE',
        }}>
          Load your trade log to begin
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: '#8892A3',
          lineHeight: '1.7',
          marginBottom: '26px',
        }}>
          Drop an .xlsx file here, or click to browse.<br />
          Expected columns: Date · Entry Time · Exit Time · Direction · Filters (Columns that will be used for filtering) · MAE · MFE · Notes
        </div>
        <label
          htmlFor="fileInput"
          style={{
            display: 'inline-block',
            padding: '12px 22px',
            fontSize: '12.5px',
            border: '1px dashed #8A5F17',
            borderRadius: '6px',
            background: '#11151F',
            color: '#FFB020',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: '0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,176,32,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#11151F'; }}
        >
          ⇪ Choose .xlsx file
        </label>
        <input
          type="file"
          id="fileInput"
          ref={fileInputRef}
          accept=".xlsx,.xls"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {error && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11.5px',
            color: '#FF5C5C',
            marginTop: '16px',
            minHeight: '16px',
          }}>
            {error}
          </div>
        )}
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: '#545E6E',
          marginTop: '12px',
        }}>
          {fileStatus}
        </div>
      </div>
    </div>
  );
}