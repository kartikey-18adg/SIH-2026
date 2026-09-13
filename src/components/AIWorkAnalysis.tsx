'use client';

import React, { useState } from 'react';
import { CanonicalWorkRecord } from '../types';

interface AIWorkAnalysisProps {
  record: CanonicalWorkRecord;
}

export const AIWorkAnalysis: React.FC<AIWorkAnalysisProps> = ({ record }) => {
  const [summary, setSummary] = useState<{ headline: string; bullets: string[]; recommendedActions: string[] } | null>(null);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; confidence: number; flags: string[]; reasoning: string; requiredEvidence: string[] } | null>(null);
  const [busy, setBusy] = useState<'summary' | 'eligibility' | null>(null);
  const [error, setError] = useState('');

  const postJson = async (url: string, body: object) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Gemini request failed.');
    return payload;
  };

  const generateSummary = async () => {
    setBusy('summary');
    setError('');
    try { setSummary(await postJson('/api/gemini/summarize-dossier', { record })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Summary failed.'); }
    finally { setBusy(null); }
  };

  const checkEligibility = async () => {
    setBusy('eligibility');
    setError('');
    try { setEligibility(await postJson('/api/gemini/check-eligibility', { workDescription: record.workDescription || record.workTitle, record })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Eligibility check failed.'); }
    finally { setBusy(null); }
  };

  return (
    <div className="border border-border-subtle bg-surface-card p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
        <div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-dim">LOKNIDHI AI REVIEW</div>
          <div className="mt-0.5 text-[10px] text-text-muted">Gemini-assisted evidence and compliance workflow</div>
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
          <button type="button" onClick={generateSummary} disabled={busy !== null} className="border border-gov-navy bg-gov-navy px-2 py-1 text-white disabled:opacity-50">{busy === 'summary' ? 'Generating...' : 'Generate AI Summary'}</button>
          <button type="button" onClick={checkEligibility} disabled={busy !== null} className="border border-border-dark bg-paper px-2 py-1 text-text-main disabled:opacity-50">{busy === 'eligibility' ? 'Checking...' : 'Check Eligibility'}</button>
        </div>
      </div>

      {error && <div className="mt-2 border border-risk-high-border bg-risk-high-bg p-2 text-risk-high">{error}</div>}
      {summary && (
        <div className="mt-3 border-l-2 border-gov-navy bg-slate-50 p-2.5">
          <div className="font-semibold text-text-main">{summary.headline}</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed">{summary.bullets.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="mt-2 font-mono text-[10px] font-bold text-text-dim">RECOMMENDED NEXT STEPS</div>
          <ul className="mt-1 list-disc space-y-1 pl-4">{summary.recommendedActions.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      {eligibility && (
        <div className={`mt-3 border-l-2 p-2.5 ${eligibility.eligible ? 'border-risk-low bg-risk-low-bg' : 'border-risk-high bg-risk-high-bg'}`}>
          <div className="font-mono font-bold">{eligibility.eligible ? 'ELIGIBILITY SCREEN: PASS' : 'ELIGIBILITY SCREEN: FLAGGED'} ({Math.round(eligibility.confidence * 100)}% confidence)</div>
          <p className="mt-1 leading-relaxed">{eligibility.reasoning}</p>
          {eligibility.flags.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-4">{eligibility.flags.map((item) => <li key={item}>{item}</li>)}</ul>}
          <div className="mt-2 font-mono text-[10px] font-bold">REQUIRED EVIDENCE</div>
          <ul className="mt-1 list-disc space-y-1 pl-4">{eligibility.requiredEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
    </div>
  );
};
