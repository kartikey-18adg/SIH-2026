'use client';

import React from 'react';
import { useDataset } from '../context/DatasetContext';
import { ActiveTab, WorkspaceView } from '../types';

export const OperationalHeader: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    activeWorkspace,
    setActiveWorkspace,
    summary,
    records,
    loadOfficialDataset,
    setIsMappingModalOpen,
    clearDataset,
    exportCSV,
  } = useDataset();

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'DASHBOARD', label: 'Executive Dashboard' },
    { id: 'ANOMALIES', label: 'Anomaly Queue' },
    { id: 'INSPECTOR', label: 'Work Inspector' },
    { id: 'ANALYTICS', label: 'Analytics Matrix' },
    { id: 'COMPLIANCE', label: 'Compliance Reports' },
  ];

  return (
    <header className="border-b border-border-subtle bg-surface-card text-text-main">
      {/* Top Ministry Masthead */}
      <div className="bg-gov-header text-white px-4 py-1.5 flex items-center justify-between text-xs tracking-wide">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-slate-500 rounded-none bg-slate-800 text-slate-200">
              GOI
            </span>
            <span className="font-semibold uppercase tracking-wider text-slate-100">
              Ministry of Statistics and Programme Implementation
            </span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">MPLADS Central Oversight & Anomaly Intelligence Workstation</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Environment:</span>
            <span className="font-mono text-emerald-300">RESTRICTED AUDIT DESK</span>
          </div>
          <span className="text-slate-600">/</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Officer:</span>
            <span className="font-mono text-slate-200">ID #AUD-4092-MoSPI</span>
          </div>
        </div>
      </div>

      {/* Main Operational Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border-subtle bg-surface-card">
        {/* Brand & Workspace Switcher */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-text-main uppercase font-mono">
                MPLAD-Watch
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-border-subtle">
                LokNidhi AI v2.4
              </span>
            </div>
            <span className="text-[11px] text-text-dim">
              National Autonomous Project & Vigilance Auditing System
            </span>
          </div>

          <div className="h-7 w-[1px] bg-border-subtle" />

          {/* Workspace Context Switcher */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-text-muted font-medium">Workspace:</span>
            <select
              value={activeWorkspace}
              onChange={(e) => setActiveWorkspace(e.target.value as WorkspaceView)}
              aria-label="Workspace Context"
              className="bg-paper border border-border-subtle px-2 py-1 text-xs font-mono text-text-main rounded-xs focus:outline-none focus:border-border-dark"
            >
              <option value="MINISTRY_AUDIT">Ministry Central Audit (All Jurisdictions)</option>
              <option value="DISTRICT_COLLECTORATE">District Collectorate / IDA View</option>
              <option value="MP_CONSTITUENCY">MP Constituency Oversight Desk</option>
            </select>
          </div>
        </div>

        {/* Dataset Status Ticker & Operational Quick Actions */}
        <div className="flex items-center space-x-3 text-xs">
          {summary ? (
            <div className="flex items-center space-x-2.5 px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-xs">
              <span className="inline-block w-2 h-2 rounded-none bg-risk-low" title="Dataset Loaded" />
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className="text-text-main font-semibold">{summary.totalRecords.toLocaleString('en-IN')} Records</span>
                <span className="text-border-subtle">|</span>
                <span className="text-text-dim truncate max-w-[180px]" title={summary.fileName}>
                  {summary.fileName}
                </span>
                <span className="text-border-subtle">|</span>
                <span className="text-risk-high font-semibold">{summary.highRiskCount} High Risk</span>
              </div>
              <button
                onClick={clearDataset}
                title="Unload current dataset"
                className="text-[11px] text-text-dim hover:text-risk-high underline ml-1"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs font-mono text-[11px]">
              <span className="inline-block w-2 h-2 rounded-none bg-risk-medium animate-pulse" />
              <span>Awaiting Dataset (No Records Ingested)</span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {!records.length && (
              <button
                onClick={loadOfficialDataset}
                className="px-2.5 py-1 text-xs font-mono bg-gov-navy text-white hover:bg-slate-800 border border-slate-700 rounded-xs font-medium"
              >
                Load Official MoSPI Data
              </button>
            )}

            <button
              onClick={() => setIsMappingModalOpen(true)}
              className="px-2.5 py-1 text-xs font-mono bg-paper text-text-main hover:bg-slate-100 border border-border-subtle rounded-xs"
            >
              Upload / Map Schema
            </button>

            {records.length > 0 && (
              <button
                onClick={exportCSV}
                className="px-2.5 py-1 text-xs font-mono bg-paper text-text-main hover:bg-slate-100 border border-border-subtle rounded-xs"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <nav className="px-4 flex items-center space-x-1 bg-surface-subtle text-xs border-t border-border-subtle">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-gov-navy text-text-main font-semibold bg-surface-card'
                  : 'border-transparent text-text-muted hover:text-text-main hover:bg-slate-200/50'
              }`}
            >
              {tab.label}
              {tab.id === 'ANOMALIES' && summary && summary.totalFlagged > 0 && (
                <span className="ml-1.5 px-1 py-0.2 bg-risk-high text-white font-mono text-[10px] rounded-none">
                  {summary.totalFlagged}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
