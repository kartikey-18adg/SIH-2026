'use client';

import React, { useMemo } from 'react';
import { useDataset } from '../context/DatasetContext';

// Helper to format Indian currency
function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const MetricTicker: React.FC = () => {
  const { summary, records, filteredRecords } = useDataset();

  const scopedSummary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        acc.totalRecords++;
        acc.sanctionedTotal += record.sanctionAmount || 0;
        acc.disbursedTotal += record.disbursedAmount || 0;
        acc.totalEstimatedOverrun += record.estimatedOverrunRisk || 0;
        if (record.riskLevel === 'HIGH') acc.highRiskCount++;
        else if (record.riskLevel === 'MEDIUM') acc.mediumRiskCount++;
        else acc.lowRiskCount++;
        if (record.triggeredRules.length > 0) acc.totalFlagged++;
        return acc;
      },
      {
        totalRecords: 0,
        sanctionedTotal: 0,
        disbursedTotal: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        totalFlagged: 0,
        totalEstimatedOverrun: 0,
      }
    );
  }, [filteredRecords]);

  if (!summary || records.length === 0) {
    return null;
  }

  const disbPercent =
    scopedSummary.sanctionedTotal > 0
    ? ((scopedSummary.disbursedTotal / scopedSummary.sanctionedTotal) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 px-4 py-3 bg-paper border-b border-border-subtle">
      {/* Metric 1: Total Works Monitored */}
      <div className="bg-surface-card border border-border-subtle p-3 rounded-xs">
        <div className="text-[11px] font-medium text-text-dim uppercase tracking-wider">
          Total Works Monitored
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono tracking-tight text-text-main">
            {scopedSummary.totalRecords.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-mono text-text-muted">
            100% Ingested
          </span>
        </div>
        <div className="mt-1.5 text-[11px] text-text-muted flex items-center justify-between border-t border-slate-100 pt-1">
          <span>Official MoSPI Master Registry</span>
          <span className="font-mono text-slate-500">Live Registry</span>
        </div>
      </div>

      {/* Metric 2: Sanctioned vs Disbursed */}
      <div className="bg-surface-card border border-border-subtle p-3 rounded-xs">
        <div className="text-[11px] font-medium text-text-dim uppercase tracking-wider flex justify-between">
          <span>Funds Sanctioned vs Disbursed</span>
          <span className="font-mono text-slate-600">{disbPercent}% Spent</span>
        </div>
        <div className="mt-1 flex items-baseline space-x-2">
          <span className="text-xl font-bold font-mono text-text-main">
            {formatINR(scopedSummary.sanctionedTotal)}
          </span>
          <span className="text-xs text-text-muted">/</span>
          <span className="text-sm font-mono text-text-muted">
            {formatINR(scopedSummary.disbursedTotal)}
          </span>
        </div>
        <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-none overflow-hidden">
          <div
            className="bg-gov-navy h-full rounded-none"
            style={{ width: `${Math.min(100, parseFloat(disbPercent))}%` }}
          />
        </div>
      </div>

      {/* Metric 3: Flagged Anomalies */}
      <div className="bg-surface-card border border-border-subtle p-3 rounded-xs">
        <div className="text-[11px] font-medium text-text-dim uppercase tracking-wider flex justify-between">
          <span>Flagged Anomalies</span>
          <span className="font-mono text-risk-high font-semibold">
            {scopedSummary.totalFlagged} cases ({scopedSummary.totalRecords > 0 ? ((scopedSummary.totalFlagged / scopedSummary.totalRecords) * 100).toFixed(1) : '0.0'}%)
          </span>
        </div>
        <div className="mt-1 flex items-center space-x-2">
          <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-risk-high-bg border border-risk-high-border text-risk-high text-xs font-mono font-bold">
            <span>High:</span>
            <span>{scopedSummary.highRiskCount}</span>
          </div>
          <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-risk-medium-bg border border-risk-medium-border text-risk-medium text-xs font-mono font-bold">
            <span>Med:</span>
            <span>{scopedSummary.mediumRiskCount}</span>
          </div>
          <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-risk-low-bg border border-risk-low-border text-risk-low text-xs font-mono font-bold">
            <span>Low:</span>
            <span>{scopedSummary.lowRiskCount}</span>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-text-muted border-t border-slate-100 pt-1 flex justify-between">
          <span>Algorithmic Severity Index</span>
          <span className="font-mono text-slate-600">Active Vigilance</span>
        </div>
      </div>

      {/* Metric 4: Estimated Overrun Risk */}
      <div className="bg-surface-card border border-border-subtle p-3 rounded-xs">
        <div className="text-[11px] font-medium text-text-dim uppercase tracking-wider flex justify-between">
          <span>Estimated Overrun / Variance Risk</span>
          <span className="font-mono text-text-dim">Net Exposure</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold font-mono text-risk-high">
            {formatINR(scopedSummary.totalEstimatedOverrun)}
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-red-50 text-risk-high border border-red-200">
            Discrepancy Triggered
          </span>
        </div>
        <div className="mt-1.5 text-[11px] text-text-muted border-t border-slate-100 pt-1 flex justify-between">
          <span>Unsanctioned Disbursements</span>
          <span className="font-mono text-slate-500">Auto-Detected</span>
        </div>
      </div>
    </div>
  );
};
