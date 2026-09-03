'use client';

import React, { useRef, useState } from 'react';
import { useDataset } from '../context/DatasetContext';

export const EmptyDatasetState: React.FC = () => {
  const { handleFileUpload, loadOfficialDataset, setIsMappingModalOpen, isLoading } = useDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-paper">
      <div className="max-w-2xl w-full bg-surface-card border border-border-subtle p-8 rounded-xs shadow-subtle">
        {/* Institutional Directive Header */}
        <div className="border-b border-border-subtle pb-4">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-800 border border-border-subtle font-semibold">
              VIGILANCE DIRECTIVE 01/2026
            </span>
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              MoSPI Data Purity Mandate
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-text-main font-mono tracking-tight">
            Awaiting Real MPLADS Dataset Ingestion
          </h1>
          <p className="mt-1 text-xs text-text-muted leading-relaxed">
            In strict adherence to Government of India statistical oversight protocols, synthetic, simulated, or mock records are disabled. The workstation requires genuine administrative records (CSV, XLSX, or JSON) directly from the MPLADS portal or District Collectorate records.
          </p>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-6 p-8 border-2 border-dashed text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-gov-navy bg-slate-100'
              : 'border-border-subtle bg-paper hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="font-mono text-sm font-semibold text-text-main">
            Drop Real MPLADS File Here or Click to Browse
          </div>
          <div className="mt-1 text-xs text-text-dim">
            Compatible formats: Microsoft Excel (.xlsx), Comma-Separated Values (.csv), JSON
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-gov-navy hover:bg-slate-800 text-white font-mono text-xs rounded-xs font-medium"
            >
              Select Local File
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadOfficialDataset();
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-surface-card border border-border-dark hover:bg-slate-100 text-text-main font-mono text-xs rounded-xs font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Ingesting Records...' : 'Load Official MoSPI Dataset (5,001 Records)'}
            </button>
          </div>
        </div>

        {/* Dynamic Column Schema Expectations */}
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold">
            Recognized Column Types (Dynamic Header Normalizer Active)
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-text-muted">
            <div className="p-2 bg-surface-subtle border border-border-subtle">
              <span className="font-semibold text-text-main block">Work ID</span>
              <span className="text-[10px] text-slate-500">WS/MP... / Order Ref</span>
            </div>
            <div className="p-2 bg-surface-subtle border border-border-subtle">
              <span className="font-semibold text-text-main block">Sanction Amount</span>
              <span className="text-[10px] text-slate-500">INR Numerical / Currency</span>
            </div>
            <div className="p-2 bg-surface-subtle border border-border-subtle">
              <span className="font-semibold text-text-main block">Work Description</span>
              <span className="text-[10px] text-slate-500">Civil works scope</span>
            </div>
            <div className="p-2 bg-surface-subtle border border-border-subtle">
              <span className="font-semibold text-text-main block">Constituency</span>
              <span className="text-[10px] text-slate-500">District / Lok Sabha</span>
            </div>
            <div className="p-2 bg-surface-subtle border border-border-subtle">
              <span className="font-semibold text-text-main block">Implementing Agency</span>
              <span className="text-[10px] text-slate-500">IDA / Municipal body</span>
            </div>
            <div className="p-2 bg-surface-subtle border border-border-subtle">
              <span className="font-semibold text-text-main block">Vendor / Contractor</span>
              <span className="text-[10px] text-slate-500">Procurement party</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
