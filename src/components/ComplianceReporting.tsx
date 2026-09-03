'use client';

import React from 'react';
import { useDataset } from '../context/DatasetContext';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const ComplianceReporting: React.FC = () => {
  const { records, summary, exportCSV, exportJSON, updateRecordStatus } = useDataset();

  // High-risk or flagged cases requiring mandatory Action Taken Records
  const flaggedRecords = records.filter(
    (r) => r.riskLevel === 'HIGH' || r.auditStatus !== 'PENDING_REVIEW'
  );

  const handlePrint = () => {
    window.print();
  };

  if (!summary || records.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-paper space-y-4 text-xs">
      {/* Top Action Bar (hidden during print) */}
      <div className="bg-surface-card p-3 border border-border-subtle flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase text-text-main">
            Official Compliance & Action Taken Report (ATR) Generator
          </h2>
          <span className="text-[11px] text-text-dim">
            Statutory Vigilance Submission pursuant to MoSPI / C&AG Guidelines
          </span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-paper border border-border-subtle hover:bg-slate-100 text-text-main rounded-xs"
          >
            Export Audit CSV
          </button>
          <button
            onClick={exportJSON}
            className="px-3 py-1.5 bg-paper border border-border-subtle hover:bg-slate-100 text-text-main rounded-xs"
          >
            Export ATR (JSON)
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-gov-navy hover:bg-slate-800 text-white font-semibold rounded-xs"
          >
            Print Official Audit Memorandum
          </button>
        </div>
      </div>

      {/* Official Government Memorandum Document (Visible on screen and perfectly styled for print) */}
      <div className="bg-white p-8 border border-border-subtle max-w-5xl mx-auto shadow-subtle print:border-none print:p-0 print:shadow-none text-black">
        {/* Official Header */}
        <div className="text-center border-b-2 border-black pb-4">
          <div className="font-mono text-xs uppercase tracking-widest font-bold">
            Government of India
          </div>
          <div className="text-base font-bold uppercase tracking-tight font-sans mt-0.5">
            Ministry of Statistics and Programme Implementation (MoSPI)
          </div>
          <div className="text-xs font-serif italic text-slate-700 mt-0.5">
            Members of Parliament Local Area Development Scheme (MPLADS) Vigilance Division
          </div>
          <div className="font-mono text-[11px] text-slate-600 mt-2">
            MEMORANDUM NO: MoSPI/MPLADS/AUD-2026/F-7740 &bull; DATE: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Audit Subject & Reference */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-300 font-mono text-xs">
          <div className="flex justify-between">
            <span className="font-bold">SUBJECT:</span>
            <span>STATUTORY AUDIT & VIGILANCE EXCEPTION RECORD</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-700">
            Source Ingestion: {summary.fileName} | Evaluated Works: {summary.totalRecords.toLocaleString('en-IN')} | Flagged High-Risk Anomalies: {summary.highRiskCount}
          </div>
        </div>

        {/* Executive Summary Metrics Table */}
        <div className="mt-4">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
            1. Fiscal Aggregates & Exposure Summary
          </div>
          <table className="w-full border border-black text-xs text-left">
            <tbody className="divide-y divide-black font-mono text-[11px]">
              <tr>
                <td className="p-2 font-bold bg-slate-100 w-1/3">Cumulative Sanctioned Amount:</td>
                <td className="p-2 font-bold">{formatINR(summary.sanctionedTotal)}</td>
                <td className="p-2 font-bold bg-slate-100 w-1/4">Expenditure Disbursed:</td>
                <td className="p-2">{formatINR(summary.disbursedTotal)}</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-slate-100">Total Flagged Anomaly Cases:</td>
                <td className="p-2 font-bold text-red-900">{summary.totalFlagged}</td>
                <td className="p-2 font-bold bg-slate-100">High Risk (&gt;80/100):</td>
                <td className="p-2 font-bold text-red-900">{summary.highRiskCount}</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-slate-100">Net Estimated Overrun Exposure:</td>
                <td className="p-2 font-bold text-red-900" colSpan={3}>
                  {formatINR(summary.totalEstimatedOverrun)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Flagged Works & Action Taken Schedule */}
        <div className="mt-6">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider border-b border-black pb-1 mb-2 flex justify-between">
            <span>2. Schedule of Flagged High-Risk Works & Vigilance Directives</span>
            <span>{flaggedRecords.length} Schedule Items</span>
          </div>

          <div className="space-y-3 mt-3">
            {flaggedRecords.slice(0, 25).map((rec, idx) => (
              <div key={rec.id} className="border border-black p-3 text-xs page-break-inside-avoid">
                <div className="flex items-start justify-between border-b border-slate-300 pb-1.5">
                  <div>
                    <span className="font-mono font-bold text-xs">
                      #{idx + 1}. WORK ID: {rec.id}
                    </span>
                    <span className="ml-2 font-sans font-medium text-slate-700">
                      [{rec.constituency}, {rec.state}]
                    </span>
                  </div>
                  <div className="font-mono text-xs">
                    <span className="font-bold">Risk Score: {rec.riskScore}/100</span> | Status: <span className="font-bold uppercase">{rec.auditStatus.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs leading-relaxed font-sans text-slate-900">
                  <span className="font-bold font-mono text-[11px] text-slate-600 block">Scope of Work:</span>
                  {rec.workDescription || rec.workTitle}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] bg-slate-50 p-2 border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Sanctioned:</span>
                    <span className="font-bold">{formatINR(rec.sanctionAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Disbursed:</span>
                    <span className="font-bold">{formatINR(rec.disbursedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Executing Agency:</span>
                    <span className="truncate block" title={rec.ida}>{rec.ida || 'Unspecified'}</span>
                  </div>
                </div>

                {/* Trigger Rules List */}
                <div className="mt-2">
                  <span className="font-mono text-[10px] font-bold uppercase text-slate-600">
                    Infractions Triggered:
                  </span>
                  <ul className="mt-1 space-y-1 font-mono text-[11px]">
                    {rec.triggeredRules.map((t, tIdx) => (
                      <li key={tIdx} className="text-red-950 flex items-baseline space-x-1.5">
                        <span>&bull;</span>
                        <span className="font-bold">[{t.ruleName}]:</span>
                        <span>{t.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Logged Notes / ATR */}
                {rec.auditNotes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 font-mono text-[10px] text-slate-800">
                    <span className="font-bold">Audit Action Journal:</span>{' '}
                    {rec.auditNotes[0].noteText} (Logged by {rec.auditNotes[0].officerName})
                  </div>
                )}
              </div>
            ))}
          </div>

          {flaggedRecords.length > 25 && (
            <div className="mt-3 text-center font-mono text-[11px] text-slate-600 italic">
              (Note: Showing top 25 of {flaggedRecords.length} flagged exceptions in print memorandum. Full set available via CSV / JSON export.)
            </div>
          )}
        </div>

        {/* Official Statutory Declaration & Officer Sign-off Block */}
        <div className="mt-8 pt-6 border-t-2 border-black grid grid-cols-2 gap-8 text-xs font-mono page-break-inside-avoid">
          <div>
            <div className="font-bold uppercase">Auditor Certification</div>
            <p className="mt-1 text-[10px] text-slate-600 leading-relaxed font-sans">
              I hereby certify that the anomaly detections and variance evaluations documented above have been computed from real uploaded administrative records using deterministic rule evaluation under MoSPI vigilance guidelines.
            </p>
            <div className="mt-8 border-t border-slate-400 pt-1 text-[11px]">
              <div className="font-bold">SENIOR AUDIT OFFICER</div>
              <div className="text-slate-600">MoSPI Central Vigilance Directorate</div>
            </div>
          </div>

          <div>
            <div className="font-bold uppercase">Supervisory Counter-Signature</div>
            <p className="mt-1 text-[10px] text-slate-600 leading-relaxed font-sans">
              Verified for dispatch to District Collectorate / Implementing District Authorities for formal Action Taken Report (ATR) compliance within statutory 30-day window.
            </p>
            <div className="mt-8 border-t border-slate-400 pt-1 text-[11px]">
              <div className="font-bold">PRINCIPAL DIRECTOR OF AUDIT</div>
              <div className="text-slate-600">Comptroller & Auditor General Delegation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
