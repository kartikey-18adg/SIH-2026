'use client';

import React, { useRef, useState } from 'react';
import { useDataset } from '../context/DatasetContext';
import { ColumnMapping } from '../types';

export const ColumnMappingModal: React.FC = () => {
  const {
    isMappingModalOpen,
    setIsMappingModalOpen,
    rawParseResult,
    columnMapping,
    setColumnMapping,
    applyMapping,
    handleFileUpload,
    loadOfficialDataset,
    isLoading,
  } = useDataset();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isMappingModalOpen) return null;

  const targetFields: { key: keyof ColumnMapping; label: string; required?: boolean; description: string }[] = [
    { key: 'id', label: 'Work ID / Order Code', required: true, description: 'Unique civil work identifier or sanction reference' },
    { key: 'workCategory', label: 'Work Category', description: 'Domain sector (e.g. Roads, Community, Health, Trust)' },
    { key: 'workTitle', label: 'Work Title', description: 'Brief civil work title or headline' },
    { key: 'workDescription', label: 'Work Description', required: true, description: 'Full physical project scope for duplicate similarity matching' },
    { key: 'sanctionAmount', label: 'Sanction Amount (INR)', required: true, description: 'Statutory approved ceiling fund in Rupees' },
    { key: 'disbursedAmount', label: 'Disbursed Amount (INR)', description: 'Actual expenditure or release voucher total' },
    { key: 'state', label: 'State / UT', description: 'State jurisdiction' },
    { key: 'constituency', label: 'Constituency / District', required: true, description: 'Lok Sabha / Rajya Sabha parliamentary jurisdiction' },
    { key: 'ida', label: 'Implementing Agency (IDA)', description: 'District Collectorate or municipal executing agency' },
    { key: 'mpName', label: 'Honble Member of Parliament', description: 'Sponsoring Member of Parliament' },
    { key: 'vendorName', label: 'Vendor / Contractor Name', description: 'Commercial contractor for tender splitting analysis' },
    { key: 'sanctionDate', label: 'Sanction Date', description: 'Date of formal administrative sanction' },
    { key: 'expenditureDate', label: 'Expenditure / Completion Date', description: 'Date of voucher clearance or milestone completion' },
    { key: 'status', label: 'Work / Payment Status', description: 'Current status (Ongoing, Completed, Physical Inspection)' },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const headers = rawParseResult ? rawParseResult.headers : [];
  const previewRows = rawParseResult ? rawParseResult.rawRows.slice(0, 3) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-none p-4">
      <div className="bg-surface-card border border-border-dark w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xs text-text-main shadow-subtle">
        {/* Modal Header */}
        <div className="bg-gov-navy text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-800 border border-slate-600">
              SCHEMA NORMALIZER
            </span>
            <span className="font-semibold text-sm">
              MPLADS Dataset Ingestion & Column Mapping Engine
            </span>
          </div>
          <button
            onClick={() => setIsMappingModalOpen(false)}
            className="text-slate-400 hover:text-white font-mono text-sm"
          >
            [X] CLOSE
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`p-5 border-2 border-dashed text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-gov-navy bg-slate-100'
                : 'border-border-subtle bg-paper hover:bg-slate-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="font-mono text-xs font-semibold text-text-main uppercase">
              Drag & Drop Real MPLADS Dataset (CSV, XLSX, or JSON)
            </div>
            <p className="mt-1 text-text-muted text-[11px]">
              Supports multi-thousand row exports directly from official district or MoSPI portals.
            </p>
            <div className="mt-3 flex items-center justify-center space-x-3">
              <button
                type="button"
                className="px-3 py-1 bg-gov-navy text-white font-mono text-xs rounded-xs"
              >
                Browse Local File
              </button>
              <span className="text-text-dim text-xs">or</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadOfficialDataset();
                  setIsMappingModalOpen(false);
                }}
                className="px-3 py-1 bg-paper border border-border-subtle hover:bg-slate-100 text-text-main font-mono text-xs rounded-xs"
              >
                Load Pre-Indexed MoSPI 5,001 Records
              </button>
            </div>
          </div>

          {rawParseResult && (
            <>
              {/* File Info Bar */}
              <div className="p-2.5 bg-surface-subtle border border-border-subtle flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-text-main">
                    File: {rawParseResult.fileName}
                  </span>
                  <span className="text-text-muted">Size: {rawParseResult.fileSize}</span>
                  <span className="text-text-muted">
                    Total Ingested Rows: {rawParseResult.rawRows.length.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-emerald-700 font-semibold">
                  Detected {headers.length} Headers
                </div>
              </div>

              {/* Column Mapping Table */}
              <div>
                <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold mb-2">
                  Map Portal Columns to Canonical Intelligence Schema
                </div>
                <div className="border border-border-subtle overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-paper border-b border-border-subtle text-text-dim font-mono text-[11px]">
                        <th className="py-2 px-3 w-1/3">CANONICAL FIELD</th>
                        <th className="py-2 px-3 w-2/5">SOURCE COLUMN IN UPLOADED FILE</th>
                        <th className="py-2 px-3">SAMPLE VALUE PREVIEW</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {targetFields.map((field) => {
                        const selectedCol = columnMapping[field.key] || '';
                        const sampleVal =
                          selectedCol && previewRows[0] && previewRows[0][selectedCol] !== undefined
                            ? String(previewRows[0][selectedCol])
                            : '';

                        return (
                          <tr key={field.key} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <div className="font-mono font-medium text-text-main">
                                {field.label}{' '}
                                {field.required && (
                                  <span className="text-risk-high text-[10px]">*</span>
                                )}
                              </div>
                              <div className="text-[10px] text-text-dim">{field.description}</div>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={selectedCol}
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                aria-label={`Mapping for ${field.label}`}
                                className="w-full bg-paper border border-border-subtle p-1.5 text-xs font-mono text-text-main rounded-xs focus:outline-none focus:border-border-dark"
                              >
                                <option value="">[ Not Mapped / Skip ]</option>
                                {headers.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-text-muted truncate max-w-[200px]">
                              {sampleVal ? (
                                <span className="bg-slate-100 px-1.5 py-0.5 border border-slate-200 block truncate">
                                  {sampleVal}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-3 bg-paper border-t border-border-subtle flex items-center justify-between">
          <div className="text-text-dim text-[11px] font-mono">
            {rawParseResult
              ? 'Review mapping and confirm to run deterministic anomaly engines.'
              : 'Please choose an official MPLADS file to proceed.'}
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => setIsMappingModalOpen(false)}
              className="px-3 py-1.5 bg-paper border border-border-subtle text-text-main hover:bg-slate-100 rounded-xs"
            >
              Cancel
            </button>
            {rawParseResult && (
              <button
                onClick={() => applyMapping(columnMapping)}
                disabled={isLoading}
                className="px-4 py-1.5 bg-gov-navy hover:bg-slate-800 text-white font-semibold rounded-xs disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Execute Anomaly Audit Engine'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
