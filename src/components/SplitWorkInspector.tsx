'use client';

import React, { useState } from 'react';
import { useDataset } from '../context/DatasetContext';
import { CanonicalWorkRecord, AuditActionStatus } from '../types';
import { AnomalyProximityChart } from './AnomalyProximityChart';
import { ShowCauseNoticeModal } from './ShowCauseNoticeModal';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const SplitWorkInspector: React.FC<{ record?: CanonicalWorkRecord | null }> = ({
  record: propRecord,
}) => {
  const {
    selectedRecord: contextRecord,
    updateRecordStatus,
    addRecordNote,
    records,
    setSelectedRecord,
    setActiveTab,
  } = useDataset();

  const record = propRecord || contextRecord;
  const [noteInput, setNoteInput] = useState('');
  const [remarksInput, setRemarksInput] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border-subtle text-center text-xs">
        <div className="font-mono text-text-muted text-sm font-semibold uppercase">
          No Work Record Selected
        </div>
        <p className="mt-2 text-text-dim max-w-sm">
          Select any record from the Executive Dashboard or Anomaly Queue to initialize the detailed audit inspector desk.
        </p>
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className="mt-4 px-3 py-1.5 bg-gov-navy text-white text-xs font-mono rounded-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleAction = (status: AuditActionStatus) => {
    updateRecordStatus(record.id, status, remarksInput || undefined);
    setRemarksInput('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addRecordNote(record.id, noteInput.trim());
    setNoteInput('');
  };

  // Find next / prev record in dataset for rapid inspection workflow
  const currentIndex = records.findIndex((r) => r.id === record.id);
  const prevRecord = currentIndex > 0 ? records[currentIndex - 1] : null;
  const nextRecord = currentIndex < records.length - 1 ? records[currentIndex + 1] : null;

  // Risk styling
  let riskBadgeClass = 'bg-risk-low-bg text-risk-low border-risk-low-border';
  if (record.riskLevel === 'HIGH') {
    riskBadgeClass = 'bg-risk-high-bg text-risk-high border-risk-high-border font-bold';
  } else if (record.riskLevel === 'MEDIUM') {
    riskBadgeClass = 'bg-risk-medium-bg text-risk-medium border-risk-medium-border font-semibold';
  }

  return (
    <div className="flex flex-col h-full bg-paper border-b border-border-subtle">
      {/* Top Inspector Sub-Header with Navigation Controls */}
      <div className="px-4 py-2 bg-surface-card border-b border-border-subtle flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 font-bold">
            DOSSIER: {record.id}
          </span>
          <span className="text-text-dim text-[11px]">
            Jurisdiction: <span className="text-text-main font-medium">{record.constituency}, {record.state}</span>
          </span>
          <span className="text-border-subtle">|</span>
          <span className={`px-2 py-0.5 text-[11px] font-mono border rounded-xs ${riskBadgeClass}`}>
            Risk Score: {record.riskScore}/100 [{record.riskLevel}]
          </span>
        </div>

        {/* Rapid Pager Controls */}
        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
          <button
            onClick={() => prevRecord && setSelectedRecord(prevRecord)}
            disabled={!prevRecord}
            className="px-2 py-1 bg-paper border border-border-subtle disabled:opacity-40 hover:bg-slate-100"
          >
            &lt; PREV RECORD
          </button>
          <span className="text-text-dim px-1">
            {currentIndex + 1} / {records.length}
          </span>
          <button
            onClick={() => nextRecord && setSelectedRecord(nextRecord)}
            disabled={!nextRecord}
            className="px-2 py-1 bg-paper border border-border-subtle disabled:opacity-40 hover:bg-slate-100"
          >
            NEXT RECORD &gt;
          </button>
        </div>
      </div>

      {/* Main Split Body: Left Source Record, Right AI Analysis */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* =========================================================================
            LEFT PANEL: Source Record, Administrative Metadata & Financial Details
            ========================================================================= */}
        <div className="lg:col-span-6 overflow-y-auto p-4 border-r border-border-subtle bg-surface-card space-y-4 text-xs">
          {/* Section: Project Overview */}
          <div>
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1">
              Work Profile & Specification
            </div>
            <div className="mt-2.5 space-y-2">
              <div>
                <span className="text-text-muted text-[11px] block">Work Title / Description:</span>
                <p className="text-text-main font-medium text-xs mt-0.5 leading-relaxed bg-surface-subtle p-2 border border-slate-200">
                  {record.workDescription || record.workTitle || 'No description filed'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-text-muted text-[11px] block">Work Category:</span>
                  <span className="font-mono text-text-main font-medium">{record.workCategory || 'General'}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[11px] block">Administrative Status:</span>
                  <span className="font-mono text-text-main font-semibold px-1.5 py-0.2 bg-slate-100 border border-slate-300">
                    {record.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Political & Administrative Authority */}
          <div>
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1">
              Sanctioning & Implementing Authority
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <span className="text-text-muted text-[11px] block">Honble Member of Parliament:</span>
                <span className="font-medium text-text-main">{record.mpName || 'Unspecified'}</span>
              </div>
              <div>
                <span className="text-text-muted text-[11px] block">Constituency & State:</span>
                <span className="text-text-main">{record.constituency} ({record.state})</span>
              </div>
              <div className="col-span-2">
                <span className="text-text-muted text-[11px] block">Implementing District Authority (IDA):</span>
                <span className="font-mono text-slate-800 text-[11px] bg-slate-50 p-1.5 border border-slate-200 block mt-0.5">
                  {record.ida || 'Not Specified'}
                </span>
              </div>
              {record.vendorName && (
                <div className="col-span-2">
                  <span className="text-text-muted text-[11px] block">Vendor / Contracting Agency:</span>
                  <span className="font-mono text-slate-900 font-bold bg-amber-50/50 p-1.5 border border-amber-200 block mt-0.5">
                    {record.vendorName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Financial Ledger Breakdown */}
          <div>
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1">
              Financial Allocation & Expenditure Ledger
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 bg-paper p-3 border border-border-subtle">
              <div>
                <div className="text-[10px] text-text-muted uppercase font-mono">Approved Sanction</div>
                <div className="text-base font-bold font-mono text-text-main mt-0.5">
                  {formatINR(record.sanctionAmount)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted uppercase font-mono">Disbursed Funds</div>
                <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                  {formatINR(record.disbursedAmount)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted uppercase font-mono">Expenditure Ratio</div>
                <div className="text-base font-bold font-mono mt-0.5 text-slate-900">
                  {record.sanctionAmount > 0
                    ? `${((record.disbursedAmount / record.sanctionAmount) * 100).toFixed(1)}%`
                    : '0.0%'}
                </div>
              </div>
            </div>

            {record.disbursedAmount > record.sanctionAmount && (
              <div className="mt-2 p-2 bg-risk-high-bg border border-risk-high-border text-risk-high text-[11px] font-mono">
                CRITICAL VARIANCE: Total disbursements exceed sanctioned ceiling by{' '}
                {formatINR(record.disbursedAmount - record.sanctionAmount)}.
              </div>
            )}
          </div>

          {/* Section: Timeline & Milestone Dates */}
          <div>
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1">
              Sanction & Delivery Timeline
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-text-muted block text-[10px]">Recommended:</span>
                <span className="text-text-main">{record.recommendedDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Sanction Date:</span>
                <span className="text-text-main font-semibold">{record.sanctionDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Disbursement Date:</span>
                <span className="text-text-main">{record.expenditureDate || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Raw JSON Inspect Toggle */}
          <div className="pt-2 border-t border-border-subtle">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-[11px] text-text-dim hover:text-text-main font-mono underline"
            >
              {showRawJson ? 'Hide Raw Row Metadata' : 'Inspect Raw Row Metadata (JSON)'}
            </button>
            {showRawJson && (
              <pre className="mt-2 p-2 bg-slate-900 text-slate-100 text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-700">
                {JSON.stringify(record.rawRecord || record, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: AI Anomaly Analysis, Vigilance Controls & Audit Notes
            ========================================================================= */}
        <div className="lg:col-span-6 overflow-y-auto p-4 bg-paper space-y-4 text-xs">
          {/* Anomaly Proximity & Normal Baseline Gauge Chart */}
          <AnomalyProximityChart record={record} allRecords={records} />

          {/* Section: Anomaly Triggers Breakdown */}
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-1">
              <span className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold">
                Autonomous Anomaly Telemetry ({record.triggeredRules.length} Triggers)
              </span>
              <span className="text-[10px] font-mono text-text-dim">Engine: LokNidhi Core</span>
            </div>

            {record.triggeredRules.length === 0 ? (
              <div className="mt-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <div className="font-semibold font-mono text-[11px]">ALL INTEGRITY CHECKS CLEARED</div>
                <p className="mt-1 text-[11px] text-emerald-800">
                  No duplicate descriptors, cost outliers, SLA breaches, or tender splitting detected for this work order.
                </p>
              </div>
            ) : (
              <div className="mt-2.5 space-y-2.5">
                {record.triggeredRules.map((trig, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-xs ${
                      trig.severity === 'HIGH'
                        ? 'bg-surface-card border-risk-high-border border-l-4 border-l-risk-high'
                        : 'bg-surface-card border-risk-medium-border border-l-4 border-l-risk-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-text-main font-mono">
                          {trig.ruleName}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                            trig.severity === 'HIGH'
                              ? 'bg-risk-high-bg text-risk-high border-risk-high-border'
                              : 'bg-risk-medium-bg text-risk-medium border-risk-medium-border'
                          }`}
                        >
                          {trig.severity} SEVERITY (+{trig.scoreImpact} pts)
                        </span>
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs text-text-main leading-relaxed">
                      {trig.description}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-text-muted block">Benchmark Standard:</span>
                        <span className="text-text-main">{trig.metricBenchmark}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Observed Deviation:</span>
                        <span className="text-risk-high font-bold">{trig.deviationValue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Auditor Action Controls */}
          <div className="bg-surface-card p-3.5 border border-border-subtle rounded-xs">
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1">
              Auditor Determination & Escalation Controls
            </div>

            <div className="mt-2.5 flex items-center space-x-2">
              <span className="text-[11px] text-text-muted font-mono">Current Audit Disposition:</span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 border border-slate-300">
                {record.auditStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-3">
              <label className="text-[11px] text-text-muted block mb-1 font-mono">
                Official Determination Directive / Remarks:
              </label>
              <textarea
                rows={2}
                placeholder="Enter mandatory supervisory remarks or instructions for field vigilance team..."
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                className="w-full p-2 bg-paper border border-border-subtle text-xs font-mono text-text-main rounded-xs focus:outline-none focus:border-border-dark"
              />
            </div>

            {/* Statutory Action Buttons */}
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
              <button
                onClick={() => handleAction('VERIFIED')}
                className="py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xs text-center border border-emerald-800"
              >
                Mark Verified
              </button>
              <button
                onClick={() => handleAction('FLAGGED_INSPECTION')}
                className="py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xs text-center border border-amber-700"
              >
                Flag Inspection
              </button>
              <button
                onClick={() => handleAction('PAYMENT_FROZEN')}
                className="py-1.5 px-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xs text-center border border-red-800"
              >
                Freeze Payment
              </button>
            </div>

            {/* Show Cause Notice Generation Button */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-dim">
                Formal Statutory Proceedings:
              </span>
              <button
                onClick={() => setShowNoticeModal(true)}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-risk-high border border-red-300 font-mono text-[11px] font-bold rounded-xs flex items-center space-x-1"
              >
                <span>📜 Issue Show-Cause Notice</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>

          {/* Section: Action Taken Record (ATR) Journal */}
          <div className="bg-surface-card p-3.5 border border-border-subtle rounded-xs">
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1 flex justify-between">
              <span>Action Taken Record (ATR) Log</span>
              <span>{record.auditNotes.length} Entries</span>
            </div>

            {/* Note Input Form */}
            <form onSubmit={handleAddNote} className="mt-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Record timestamped vigilance note..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="flex-1 p-1.5 bg-paper border border-border-subtle text-xs font-mono text-text-main rounded-xs focus:outline-none focus:border-border-dark"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-gov-navy text-white text-xs font-mono rounded-xs"
                >
                  Log Note
                </button>
              </div>
            </form>

            {/* Past Audit Notes */}
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {record.auditNotes.length === 0 ? (
                <div className="text-[11px] text-text-dim font-mono italic p-2 bg-paper border border-slate-200">
                  No vigilance notes recorded yet.
                </div>
              ) : (
                record.auditNotes.map((note) => (
                  <div key={note.id} className="p-2 bg-paper border border-border-subtle text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-dim">
                      <span className="font-semibold text-text-main">{note.officerName}</span>
                      <span>{new Date(note.timestamp).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                      Action: <span className="font-semibold text-slate-900">{note.actionTaken}</span>
                    </div>
                    <p className="text-xs text-text-main font-mono mt-1">
                      {note.noteText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Show Cause Vigilance Notice Modal */}
      <ShowCauseNoticeModal
        record={record}
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
      />
    </div>
  );
};

