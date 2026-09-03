'use client';

import React, { useMemo } from 'react';
import { useDataset } from '../context/DatasetContext';

function formatAmount(val: number): string {
  if (!val || isNaN(val)) return '0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const AnalyticsMatrix: React.FC = () => {
  const { records, summary, setSelectedRecord, setActiveTab } = useDataset();

  // Category analysis
  const categoryStats = useMemo(() => {
    const stats: Record<
      string,
      { count: number; sanctioned: number; disbursed: number; highRisk: number; flagged: number }
    > = {};

    records.forEach((r) => {
      const cat = r.workCategory || 'General / Unspecified';
      if (!stats[cat]) {
        stats[cat] = { count: 0, sanctioned: 0, disbursed: 0, highRisk: 0, flagged: 0 };
      }
      stats[cat].count++;
      stats[cat].sanctioned += r.sanctionAmount || 0;
      stats[cat].disbursed += r.disbursedAmount || 0;
      if (r.riskLevel === 'HIGH') stats[cat].highRisk++;
      if (r.triggeredRules.length > 0) stats[cat].flagged++;
    });

    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
  }, [records]);

  // Vendor / Agency Concentration
  const agencyStats = useMemo(() => {
    const map: Record<
      string,
      { name: string; count: number; sanctioned: number; highRiskCount: number }
    > = {};

    records.forEach((r) => {
      const agencyName = r.vendorName || r.ida || 'Unknown Agency';
      if (!map[agencyName]) {
        map[agencyName] = { name: agencyName, count: 0, sanctioned: 0, highRiskCount: 0 };
      }
      map[agencyName].count++;
      map[agencyName].sanctioned += r.sanctionAmount || 0;
      if (r.riskLevel === 'HIGH') map[agencyName].highRiskCount++;
    });

    return Object.values(map)
      .sort((a, b) => b.highRiskCount - a.highRiskCount || b.count - a.count)
      .slice(0, 10);
  }, [records]);

  // Constituency Anomaly Distribution
  const constituencyStats = useMemo(() => {
    const map: Record<
      string,
      { constituency: string; state: string; count: number; highRisk: number; sanctioned: number }
    > = {};

    records.forEach((r) => {
      const key = `${r.constituency || 'N/A'}_${r.state || 'N/A'}`;
      if (!map[key]) {
        map[key] = {
          constituency: r.constituency || 'Unknown',
          state: r.state || 'Unknown',
          count: 0,
          highRisk: 0,
          sanctioned: 0,
        };
      }
      map[key].count++;
      if (r.riskLevel === 'HIGH') map[key].highRisk++;
      map[key].sanctioned += r.sanctionAmount || 0;
    });

    return Object.values(map)
      .sort((a, b) => b.highRisk - a.highRisk || b.count - a.count)
      .slice(0, 10);
  }, [records]);

  if (!summary || records.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-paper space-y-4 text-xs">
      {/* Top Banner */}
      <div className="bg-surface-card p-3 border border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase text-text-main">
            Statistical Intelligence & Risk Distribution Matrix
          </h2>
          <span className="text-[11px] text-text-dim">
            Cross-jurisdictional correlation across {records.length.toLocaleString('en-IN')} ingested works
          </span>
        </div>
        <div className="font-mono text-xs text-text-muted">
          Updated: {summary.loadedAt}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table 1: Category-wise Allocation & Anomaly Burden */}
        <div className="lg:col-span-8 bg-surface-card border border-border-subtle p-3.5 rounded-xs">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1.5 flex justify-between">
            <span>Work Category Risk & Fund Allocation Breakdown</span>
            <span>{categoryStats.length} Sectors</span>
          </div>

          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] font-mono text-text-dim bg-paper">
                  <th className="py-2 px-2.5">SECTOR / CATEGORY</th>
                  <th className="py-2 px-2.5 text-right">WORKS</th>
                  <th className="py-2 px-2.5 text-right">TOTAL SANCTION</th>
                  <th className="py-2 px-2.5 text-right">TOTAL DISBURSED</th>
                  <th className="py-2 px-2.5 text-center">FLAGGED</th>
                  <th className="py-2 px-2.5 text-center">HIGH RISK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono text-[11px]">
                {categoryStats.map(([cat, stat]) => (
                  <tr key={cat} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-sans font-medium text-text-main">
                      {cat}
                    </td>
                    <td className="py-2 px-2.5 text-right text-text-muted">
                      {stat.count.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2.5 text-right text-text-main font-semibold">
                      {formatAmount(stat.sanctioned)}
                    </td>
                    <td className="py-2 px-2.5 text-right text-text-muted">
                      {formatAmount(stat.disbursed)}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-300">
                        {stat.flagged}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {stat.highRisk > 0 ? (
                        <span className="px-1.5 py-0.5 bg-risk-high-bg text-risk-high border border-risk-high-border font-bold">
                          {stat.highRisk}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Top Jurisdictions with Risk Concentrations */}
        <div className="lg:col-span-4 bg-surface-card border border-border-subtle p-3.5 rounded-xs">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1.5">
            Jurisdictions with High Risk Concentrations
          </div>

          <div className="mt-2.5 divide-y divide-border-subtle/60">
            {constituencyStats.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-text-main">
                    {item.constituency}
                  </div>
                  <div className="text-[10px] text-text-dim font-mono">
                    State: {item.state} | {item.count} total works
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-risk-high">
                    {item.highRisk} High Risk
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {formatAmount(item.sanctioned)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table 3: Contractor / Agency Concentration & Vigilance Matrix */}
        <div className="lg:col-span-12 bg-surface-card border border-border-subtle p-3.5 rounded-xs">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1.5 flex justify-between">
            <span>Procurement & Agency Concentration Matrix</span>
            <span className="text-[10px] font-mono text-text-dim">Sorted by Risk Burden</span>
          </div>

          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] font-mono text-text-dim bg-paper">
                  <th className="py-2 px-2.5">CONTRACTING VENDOR / NODAL AGENCY</th>
                  <th className="py-2 px-2.5 text-right">TOTAL PROJECTS AWARDED</th>
                  <th className="py-2 px-2.5 text-right">TOTAL SANCTION VALUE</th>
                  <th className="py-2 px-2.5 text-center">HIGH RISK ALERTS</th>
                  <th className="py-2 px-2.5 text-center">VIGILANCE STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono text-[11px]">
                {agencyStats.map((ag, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-sans font-medium text-text-main max-w-sm truncate" title={ag.name}>
                      {ag.name}
                    </td>
                    <td className="py-2 px-2.5 text-right text-text-muted">
                      {ag.count}
                    </td>
                    <td className="py-2 px-2.5 text-right text-text-main font-semibold">
                      {formatAmount(ag.sanctioned)}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {ag.highRiskCount > 0 ? (
                        <span className="px-2 py-0.5 bg-risk-high-bg text-risk-high border border-risk-high-border font-bold">
                          {ag.highRiskCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {ag.highRiskCount > 0 ? (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-900 border border-amber-300">
                          UNDER SPECIAL REVIEW
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] bg-slate-50 text-slate-600 border border-slate-200">
                          NORMAL AUDIT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
