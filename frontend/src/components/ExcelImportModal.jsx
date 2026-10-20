import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Mail, 
  Users, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Send,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const ExcelImportModal = ({ isOpen, onClose, onRefresh, onShowToast }) => {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [autoVerify, setAutoVerify] = useState(false);
  const [sendAckEmail, setSendAckEmail] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileParse = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    sounds.playClick();

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        throw new Error('No data rows found in the uploaded file.');
      }

      // Smart Column Detection & Normalization
      const normalized = rawJson.map((row, idx) => {
        let name = '', email = '', phone = '', teamName = '', track = '', institution = '', utr = '';
        const formResponses = {};

        for (const [key, val] of Object.entries(row)) {
          const valStr = String(val).trim();
          const kLower = key.toLowerCase().trim();
          formResponses[key] = valStr;

          if (!email && (kLower.includes('email') || kLower.includes('mail') || (valStr.includes('@') && valStr.includes('.')))) {
            email = valStr;
          } else if (!name && (kLower.includes('name') || kLower.includes('student') || kLower.includes('participant') || kLower.includes('candidate')) && !kLower.includes('team')) {
            name = valStr;
          } else if (!phone && (kLower.includes('phone') || kLower.includes('contact') || kLower.includes('mobile') || kLower.includes('whatsapp'))) {
            phone = valStr;
          } else if (!teamName && kLower.includes('team')) {
            teamName = valStr;
          } else if (!track && (kLower.includes('track') || kLower.includes('category') || kLower.includes('domain'))) {
            track = valStr;
          } else if (!institution && (kLower.includes('college') || kLower.includes('inst') || kLower.includes('university') || kLower.includes('school'))) {
            institution = valStr;
          } else if (!utr && (kLower.includes('utr') || kLower.includes('payment') || kLower.includes('transaction') || kLower.includes('ref'))) {
            utr = valStr;
          }
        }

        return {
          name: name || `Hacker #${idx + 1}`,
          email: email || '',
          phone,
          teamName,
          track: track || 'AI & Agentic Systems',
          institution: institution || 'DYP DPU Pune',
          utr,
          formResponses,
        };
      }).filter((r) => r.email !== '');

      if (normalized.length === 0) {
        throw new Error('No valid rows with email addresses found in the file. Please check column headers.');
      }

      setParsedRows(normalized);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Excel File Parsed! 📊',
        message: `Found ${normalized.length} valid attendee records ready to import.`,
      });
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Parse Failed',
        message: err.message,
      });
      setFile(null);
      setParsedRows([]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileParse(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    sounds.playClick();
    setIsImporting(true);

    try {
      const res = await api.registrants.bulkImport(parsedRows, autoVerify, sendAckEmail);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Import Successful! 🎉',
        message: res.message || `Imported ${parsedRows.length} attendees to HackSeries database.`,
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Import Failed',
        message: err.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                Import External Excel / CSV Sheet
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Upload any .xlsx, .xls, or .csv file to import attendees as Pending and send verification acknowledgement emails
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Upload Box */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragActive ? '2px dashed #22c55e' : '2px dashed rgba(255, 255, 255, 0.18)',
              background: dragActive ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '20px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFileParse(e.target.files[0])}
            />
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Upload size={28} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px 0' }}>
              Click to select or drag & drop your Excel file
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Supports Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) and <strong>.csv</strong> spreadsheets
            </p>
          </div>
        ) : (
          <div>
            {/* File Info Bar */}
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileSpreadsheet size={24} color="#4ade80" />
                <div>
                  <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '14px' }}>{file.name}</div>
                  <div style={{ fontSize: '12px', color: '#4ade80' }}>
                    ✅ {parsedRows.length} attendees ready for import (Status: ⏳ Verification Pending)
                  </div>
                </div>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                }}
              >
                Change File
              </button>
            </div>

            {/* Preview Table */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                📋 Parsed Data Preview (First 5 Rows):
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#0b0f19', color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '8px 12px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Email</th>
                      <th style={{ padding: '8px 12px' }}>Track</th>
                      <th style={{ padding: '8px 12px' }}>Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '700', color: '#fff' }}>{r.name}</td>
                        <td style={{ padding: '8px 12px', color: '#22d3ee' }}>{r.email}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{r.track}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{r.teamName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', textAlign: 'right' }}>
                  + {parsedRows.length - 5} more records in file
                </div>
              )}
            </div>

            {/* Automation Options */}
            <div style={{ background: '#090d18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', marginBottom: '12px' }}>
                ⚡ Import & Email Settings:
              </div>

              {/* Option 1: Verification Pending Email */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
                <input
                  type="checkbox"
                  checked={sendAckEmail}
                  onChange={(e) => setSendAckEmail(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#38bdf8', cursor: 'pointer', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                    ✉️ Send "Verification Pending / Registration Received" Acknowledgement Email (Recommended)
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    Emails each student confirming their registration is under review by the operations team. <strong>Does NOT send the QR pass.</strong>
                  </div>
                </div>
              </label>

              {/* Option 2: Default Status Pending Info */}
              <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#facc15' }}>
                  ⏳ Default Import Status: Pending Verification
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                  All imported attendees start as <strong>Not Verified</strong>. You can verify them on the dashboard whenever you're ready to dispatch their official QR passes.
                </div>
              </div>

              {/* Option 3: Override - Mark as Verified Directly */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoVerify}
                  onChange={(e) => setAutoVerify(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#22c55e', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>
                    Override: Mark as <span style={{ color: '#4ade80' }}>Verified</span> immediately upon import
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isImporting}>
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isImporting}
            style={{
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontWeight: '800',
            }}
          >
            {isImporting ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }} />
                <span>Importing {parsedRows.length} Attendees...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Import {parsedRows.length > 0 ? `${parsedRows.length} Attendees` : 'Excel Data'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
