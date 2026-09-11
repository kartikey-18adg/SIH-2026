'use client';

import React from 'react';
import { CanonicalWorkRecord } from '../types';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

interface ShowCauseNoticeModalProps {
  record: CanonicalWorkRecord;
  isOpen: boolean;
  onClose: () => void;
}

export const ShowCauseNoticeModal: React.FC<ShowCauseNoticeModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !record) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = document.getElementById('notice-text-content')?.innerText || '';
    navigator.clipboard.writeText(text);
    alert('Show Cause Notice copied to clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-surface-card border border-border-dark w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xs text-text-main shadow-subtle">
        {/* Modal Header */}
        <div className="bg-gov-navy text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-1.5 py-0.5 bg-red-900 border border-red-700 text-red-100 font-bold">
              STATUTORY NOTICE
            </span>
            <span className="font-semibold text-sm">
              Show-Cause Vigilance Notice Generator (MoSPI Guidelines 2023)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-mono text-sm"
          >
            [X] CLOSE
          </button>
        </div>

        {/* Modal Scrollable Notice Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-paper print:bg-white print:p-0">
          <div
            id="notice-text-content"
            className="bg-white p-8 border border-border-subtle max-w-2xl mx-auto text-black font-serif text-xs leading-relaxed shadow-sm print:border-none print:shadow-none"
          >
            {/* National Header */}
            <div className="text-center border-b-2 border-black pb-3">
              <div className="font-mono text-xs uppercase tracking-widest font-bold">
                Government of India
              </div>
              <div className="text-sm font-bold uppercase tracking-tight font-sans mt-0.5">
                Ministry of Statistics and Programme Implementation (MoSPI)
              </div>
              <div className="text-[11px] italic text-slate-700">
                Central Vigilance Directorate &bull; Members of Parliament Local Area Development Scheme
              </div>
              <div className="font-mono text-[10px] text-slate-600 mt-2">
                REF NO: MoSPI/MPLADS/VIG/SCN-{record.id.replace(/[^A-Za-z0-9]/g, '')}-2026 &bull; DATE: {today}
              </div>
            </div>

            {/* Notice Addressee */}
            <div className="mt-4 font-sans text-xs space-y-0.5">
              <div className="font-bold">TO:</div>
              <div>The District Magistrate / Deputy Commissioner / Nodal Authority,</div>
              <div className="font-semibold">{record.ida || 'District Implementing Authority'}</div>
              <div>District: {record.constituency}, State: {record.state}</div>
            </div>

            {/* Subject */}
            <div className="mt-4 p-2.5 bg-slate-50 border border-slate-300 font-sans text-xs">
              <span className="font-bold font-mono">SUBJECT: </span>
              <span className="font-semibold uppercase">
                SHOW-CAUSE NOTICE UNDER CLAUSE 4.12 & 6.3 OF MPLADS REVISED GUIDELINES 2023 REGARDING FINANCIAL AND EXECUTION ANOMALIES IN WORK ID [{record.id}]
              </span>
            </div>

            {/* Notice Text Paragraphs */}
            <div className="mt-4 space-y-3 font-serif text-[12px] leading-relaxed text-slate-900">
              <p>
                1. <strong>WHEREAS</strong>, the Members of Parliament Local Area Development Scheme (MPLADS) mandates strict adherence to transparent public procurement, milestone physical audits, and fiscal prudence as stipulated by the Government of India;
              </p>
              <p>
                2. <strong>WHEREAS</strong>, the Autonomous Anomaly Detection System (LokNidhi Central AI) flagged Work Order Reference <strong>{record.id}</strong> (<em>&ldquo;{record.workDescription || record.workTitle}&rdquo;</em>) sponsored by <strong>{record.mpName || 'Honble MP'}</strong> with an institutional Risk Grade of <strong>{record.riskScore}/100 [{record.riskLevel}]</strong>;
              </p>

              {/* Infractions Schedule */}
              <div className="p-3 bg-slate-50 border border-black font-sans text-xs my-2">
                <div className="font-mono text-[11px] font-bold uppercase text-red-950 border-b border-slate-300 pb-1">
                  Schedule of Substantive Anomalies Detected:
                </div>
                <ul className="mt-2 space-y-1.5 font-mono text-[11px]">
                  {record.triggeredRules.map((trig, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5 text-slate-900">
                      <span className="text-red-700 font-bold">&bull;</span>
                      <div>
                        <span className="font-bold text-red-950">[{trig.ruleName}]: </span>
                        <span>{trig.description}</span>
                        <div className="text-[10px] text-slate-600">
                          Observed Deviation: <span className="font-bold">{trig.deviationValue}</span> (Standard: {trig.metricBenchmark})
                        </div>
                      </div>
                    </li>
                  ))}
                  {record.disbursedAmount > record.sanctionAmount && (
                    <li className="flex items-start space-x-1.5 text-slate-900">
                      <span className="text-red-700 font-bold">&bull;</span>
                      <div>
                        <span className="font-bold text-red-950">[FINANCIAL DISCREPANCY]: </span>
                        <span>
                          Expenditure disbursed (INR {formatINR(record.disbursedAmount)}) exceeds formal sanction limit (INR {formatINR(record.sanctionAmount)}) by {formatINR(record.disbursedAmount - record.sanctionAmount)}.
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              <p>
                3. <strong>NOW, THEREFORE</strong>, you are hereby directed to show cause in writing within <strong>fifteen (15) working days</strong> from the receipt of this communication as to why administrative recovery proceedings and formal vigilance scrutiny should not be initiated against the executing agency and contracting vendor <strong>({record.vendorName || 'Executing Vendor'})</strong>.
              </p>

              <p>
                4. You are further instructed to conduct an immediate joint physical inspection with a certified Superintending Engineer and submit the geotagged photographic inspection dossier along with the statutory Action Taken Report (ATR) to this Directorate.
              </p>

              <p>
                5. Failure to respond within the stipulated timeline shall lead to immediate invocation of Rule 4.12 resulting in automatic freezing of subsequent tranche disbursements to the concerned district treasury.
              </p>
            </div>

            {/* Signature Block */}
            <div className="mt-8 pt-4 border-t border-slate-400 grid grid-cols-2 gap-6 font-sans text-xs">
              <div>
                <div className="font-bold uppercase text-[11px]">ISSUED BY DIRECTION OF:</div>
                <div className="mt-6 border-t border-slate-400 pt-1 font-mono text-[11px]">
                  <div className="font-bold">SENIOR AUDIT OFFICER</div>
                  <div className="text-slate-600">Vigilance & Inspection Directorate</div>
                  <div className="text-slate-500">Ministry of Statistics & Programme Implementation</div>
                </div>
              </div>

              <div>
                <div className="font-bold uppercase text-[11px]">ENDORSED COPY TO:</div>
                <ul className="mt-1 text-[10px] font-mono text-slate-600 space-y-0.5">
                  <li>1. Principal Director of Audit, C&AG of India</li>
                  <li>2. Chief Secretary, Government of {record.state}</li>
                  <li>3. Office of Hon'ble Member of Parliament</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3 bg-paper border-t border-border-subtle flex items-center justify-between font-mono text-xs print:hidden">
          <div className="text-text-dim text-[11px]">
            Statutory notice drafted pursuant to MoSPI Vigilance Circular 01/2026.
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-paper border border-border-subtle hover:bg-slate-100 text-text-main rounded-xs"
            >
              Copy Notice Text
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-gov-navy text-white hover:bg-slate-800 font-semibold rounded-xs"
            >
              Print Official Notice (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
