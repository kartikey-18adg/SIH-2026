'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useDataset } from '../context/DatasetContext';
import { CanonicalWorkRecord } from '../types';

type CopilotResult = {
  kind: 'filter' | 'dossier' | 'guideline' | 'empty';
  title: string;
  body?: string;
  bullets?: string[];
  source?: string;
};

const guidelineEntries = [
  {
    terms: ['eligible', 'eligible work', 'what can', 'permitted'],
    title: 'Eligible MPLADS works',
    bullets: [
      'MPLADS funds are intended for durable community assets and public utility works that serve the local population.',
      'Works should be recommended by the Member of Parliament and executed by the designated Implementing District Authority (IDA).',
      'The asset should remain available for public use and be supported by the required administrative and technical sanctions.',
    ],
  },
  {
    terms: ['ineligible', 'prohibited', 'not allowed', 'private', 'religious'],
    title: 'Common ineligible or restricted works',
    bullets: [
      'Works on private or individual assets, and works that primarily benefit a private person or a restricted group, are generally not eligible.',
      'Religious buildings and places of worship are restricted, as are grants, revenue expenditure, and recurring operating expenses.',
      'Check the current MoSPI MPLADS Guidelines and eSAKSHI workflow for the exact category and approval conditions before sanction.',
    ],
  },
  {
    terms: ['process', 'sanction', 'implementing', 'ida', 'workflow'],
    title: 'MPLADS execution workflow',
    bullets: [
      'The MP recommends a work; the IDA verifies feasibility, prepares estimates, and issues the required sanctions.',
      'The IDA is responsible for execution, quality checks, completion documentation, and maintaining the asset record.',
      'eSAKSHI entries should be supported by the underlying sanction, expenditure, inspection, and completion evidence.',
    ],
  },
];

function compactAmount(value: number): string {
  return `INR ${Math.round(value || 0).toLocaleString('en-IN')}`;
}

function findLocation(text: string, records: CanonicalWorkRecord[]): string | null {
  const normalized = text.toLowerCase();
  const candidates = Array.from(
    new Set(records.flatMap((record) => [record.ida, record.constituency, record.state]).filter(Boolean))
  );
  return candidates.find((candidate) => normalized.includes(candidate.toLowerCase())) || null;
}

export const AIAuditCopilot: React.FC = () => {
  const {
    records,
    setActiveTab,
    setSearchQuery,
    setRiskFilter,
    setAnomalyFilter,
    setActiveWorkspace,
    setDistrictFilter,
    setSelectedRecord,
  } = useDataset();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [geminiText, setGeminiText] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const examples = useMemo(() => [
    'Show high risk cases in Dharwad',
    'Summarize Dossier #133166',
    'What works are eligible under MPLADS?',
  ], []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const summarize = (record: CanonicalWorkRecord): CopilotResult => {
    const bullets = [
      `Risk posture: ${record.riskLevel} (${record.riskScore}/100) with ${record.triggeredRules.length} detected exception${record.triggeredRules.length === 1 ? '' : 's'}.`,
      `Work: ${record.workTitle || record.workDescription || 'Description unavailable'}; status is ${record.status || 'not recorded'}.`,
      `Financial exposure: sanctioned ${compactAmount(record.sanctionAmount)} and disbursed ${compactAmount(record.disbursedAmount)}${record.estimatedOverrunRisk > 0 ? `; estimated overrun ${compactAmount(record.estimatedOverrunRisk)}` : ''}.`,
      `Accountability: ${record.ida || 'IDA not recorded'}; vendor ${record.vendorName || 'not recorded'}.`,
      ...(record.triggeredRules.length > 0
        ? [`Priority exceptions: ${record.triggeredRules.map((rule) => rule.ruleName).join('; ')}.`]
        : ['No anomaly rule was triggered by the current deterministic audit engine.']),
    ];
    return { kind: 'dossier', title: `Dossier ${record.id}`, bullets, source: 'Current ingested dataset and deterministic anomaly engine' };
  };

  const askGemini = async (query: string, record?: CanonicalWorkRecord) => {
    setIsThinking(true);
    setGeminiText(null);
    try {
      const response = await fetch('/api/gemini/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, record }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Gemini request failed.');
      if (payload.action?.name === 'apply_dashboard_filters') {
        const args = payload.action.args || {};
        const activeFilter = typeof args.activeFilter === 'string' ? args.activeFilter : '';
        const riskGrade = ['ALL', 'HIGH', 'MEDIUM', 'LOW'].includes(args.riskGrade) ? args.riskGrade : 'ALL';
        const anomalyType = typeof args.anomalyType === 'string' ? args.anomalyType : 'ALL';
        setActiveTab('DASHBOARD');
        setRiskFilter(riskGrade);
        setAnomalyFilter(anomalyType);
        const location = findLocation(activeFilter.toLowerCase(), records);
        const district = location && records.find((item) => item.ida.toLowerCase() === location.toLowerCase())?.ida;
        if (district) {
          setActiveWorkspace('DISTRICT_COLLECTORATE');
          setDistrictFilter(district);
          setSearchQuery('');
        } else {
          setSearchQuery(activeFilter);
        }
      }
      setGeminiText(payload.text);
    } catch (error) {
      setGeminiText(`Gemini unavailable: ${error instanceof Error ? error.message : 'request failed'}`);
    } finally {
      setIsThinking(false);
    }
  };

  const executePrompt = (rawPrompt: string) => {
    const query = rawPrompt.trim();
    const normalized = query.toLowerCase();
    if (!query) {
      setResult({ kind: 'empty', title: 'Enter an audit command or question.' });
      return;
    }

    const dossierMatch = normalized.match(/(?:dossier|work|case)\s*#?\s*([a-z0-9/_ -]*\d[a-z0-9/_ -]*)/i);
    if (dossierMatch) {
      const dossierId = dossierMatch[1].trim();
      const record = records.find((candidate) => candidate.id.toLowerCase().includes(dossierId.toLowerCase().replace(/\s+/g, '')) || candidate.id.toLowerCase().includes(dossierId.toLowerCase()));
      if (record) {
        setSelectedRecord(record);
        setActiveTab('INSPECTOR');
        setResult(summarize(record));
        void askGemini(query, record);
      } else {
        setResult({ kind: 'empty', title: `No dossier matching “${dossierId}” is loaded.`, body: 'Load the official dataset or upload the relevant records, then try again.' });
        void askGemini(query);
      }
      return;
    }

    const isFilterCommand = /\b(show|find|filter|list|display)\b/.test(normalized);
    if (isFilterCommand) {
      const location = findLocation(normalized, records);
      const highRisk = /\b(high risk|high-risk|critical)\b/.test(normalized);
      const mediumRisk = /\b(medium risk|medium-risk)\b/.test(normalized);
      const lowRisk = /\b(low risk|low-risk)\b/.test(normalized);
      if (location || highRisk || mediumRisk || lowRisk) {
        setActiveTab('DASHBOARD');
        if (highRisk) setRiskFilter('HIGH');
        else if (mediumRisk) setRiskFilter('MEDIUM');
        else if (lowRisk) setRiskFilter('LOW');
        else setRiskFilter('ALL');

        if (location) {
          const district = records.find((record) => record.ida.toLowerCase() === location.toLowerCase())?.ida;
          if (district) {
            setActiveWorkspace('DISTRICT_COLLECTORATE');
            setDistrictFilter(district);
            setSearchQuery('');
          } else {
            setSearchQuery(location);
          }
        } else {
          setSearchQuery('');
        }
        setResult({ kind: 'filter', title: 'Dashboard filters applied', body: `${highRisk ? 'High-risk' : mediumRisk ? 'Medium-risk' : lowRisk ? 'Low-risk' : 'All'} cases${location ? ` scoped to ${location}` : ''}.` });
        void askGemini(query);
        return;
      }
    }

    const guideline = guidelineEntries.find((entry) => entry.terms.some((term) => normalized.includes(term)));
    if (guideline) {
      setResult({ kind: 'guideline', title: guideline.title, bullets: guideline.bullets, source: 'MoSPI MPLADS Guidelines / eSAKSHI compliance reference' });
      void askGemini(query);
      return;
    }

    setResult({ kind: 'empty', title: 'I could not classify that request.', body: 'Try a filter command, a dossier number, or a question about eligible, restricted, or sanction workflow rules.' });
    void askGemini(query);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    executePrompt(prompt);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Open AI Audit Copilot (Ctrl+K)"
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono bg-gov-navy text-white hover:bg-slate-800 border border-slate-700 rounded-xs font-medium"
      >
        <span className="text-gov-gold" aria-hidden="true">✦</span>
        AI Audit Copilot
        <kbd className="hidden sm:inline border border-slate-500 px-1 text-[10px] text-slate-300">Ctrl K</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/30" onMouseDown={() => setIsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="copilot-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="absolute right-4 top-16 w-[min(92vw,560px)] border border-slate-700 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-border-subtle bg-gov-header px-4 py-3 text-white">
              <div>
                <div id="copilot-title" className="font-mono text-sm font-bold">AI AUDIT COPILOT</div>
                <div className="mt-0.5 text-[11px] text-slate-300">Gemini-assisted audit analysis with local controls</div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close copilot" className="px-2 text-lg text-slate-300 hover:text-white">×</button>
            </div>
            <div className="p-4">
              <form onSubmit={submit} className="flex gap-2">
                <input
                  autoFocus
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ask an audit question or issue a command..."
                  aria-label="AI Audit Copilot prompt"
                  className="min-w-0 flex-1 border border-border-dark bg-paper px-3 py-2 text-sm text-text-main outline-none focus:border-gov-navy"
                />
                <button type="submit" className="bg-gov-navy px-3 py-2 font-mono text-xs font-bold text-white hover:bg-slate-800">RUN</button>
              </form>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {examples.map((example) => (
                  <button key={example} type="button" onClick={() => { setPrompt(example); executePrompt(example); }} className="border border-border-subtle bg-surface-subtle px-2 py-1 text-[11px] text-text-muted hover:border-border-dark hover:text-text-main">
                    {example}
                  </button>
                ))}
              </div>

              {result && (
                <div className="mt-4 border-l-2 border-gov-gold bg-amber-50 px-3 py-3 text-xs text-text-main">
                  <div className="font-mono font-bold uppercase">{result.title}</div>
                  {result.body && <p className="mt-1 leading-relaxed">{result.body}</p>}
                  {result.bullets && <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">{result.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
                  {result.source && <div className="mt-3 border-t border-amber-200 pt-2 font-mono text-[10px] text-text-dim">SOURCE: {result.source}</div>}
                </div>
              )}
              {(isThinking || geminiText) && (
                <div className="mt-3 border-l-2 border-gov-navy bg-slate-50 px-3 py-3 text-xs text-text-main">
                  <div className="font-mono font-bold uppercase">Gemini analysis</div>
                  {isThinking ? <p className="mt-1 text-text-dim">Consulting Gemini...</p> : <p className="mt-1 whitespace-pre-wrap leading-relaxed">{geminiText}</p>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
};
