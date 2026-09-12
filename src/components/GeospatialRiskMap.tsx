'use client';

import React, { useMemo, useState } from 'react';
import { useDataset } from '../context/DatasetContext';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const GeospatialRiskMap: React.FC = () => {
  const {
    records,
    stateFilter,
    setStateFilter,
    setWorkCategoryFilter,
    setAgencyFilter,
    setConstituencyFilter,
    setActiveTab,
  } = useDataset();

  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Aggregate stats per State
  const stateAggregates = useMemo(() => {
    if (!records || records.length === 0) return {};

    const agg: Record<
      string,
      {
        state: string;
        totalWorks: number;
        sanctionTotal: number;
        disbursedTotal: number;
        highRiskCount: number;
        flaggedCount: number;
        overrunRisk: number;
        districts: Record<string, { count: number; highRisk: number; overrun: number }>;
      }
    > = {};

    records.forEach((r) => {
      const s = (r.state || 'Unspecified').trim();
      if (!agg[s]) {
        agg[s] = {
          state: s,
          totalWorks: 0,
          sanctionTotal: 0,
          disbursedTotal: 0,
          highRiskCount: 0,
          flaggedCount: 0,
          overrunRisk: 0,
          districts: {},
        };
      }

      agg[s].totalWorks++;
      agg[s].sanctionTotal += r.sanctionAmount || 0;
      agg[s].disbursedTotal += r.disbursedAmount || 0;
      if (r.riskLevel === 'HIGH') agg[s].highRiskCount++;
      if (r.triggeredRules.length > 0) agg[s].flaggedCount++;
      agg[s].overrunRisk += r.estimatedOverrunRisk || 0;

      const dist = (r.constituency || r.ida || 'Central').trim();
      if (!agg[s].districts[dist]) {
        agg[s].districts[dist] = { count: 0, highRisk: 0, overrun: 0 };
      }
      agg[s].districts[dist].count++;
      if (r.riskLevel === 'HIGH') agg[s].districts[dist].highRisk++;
      agg[s].districts[dist].overrun += r.estimatedOverrunRisk || 0;
    });

    return agg;
  }, [records]);

  // Ranked states by high-risk count
  const rankedStates = useMemo(() => {
    return Object.values(stateAggregates).sort((a, b) => b.highRiskCount - a.highRiskCount || b.totalWorks - a.totalWorks);
  }, [stateAggregates]);

  // Top Collectorates overall
  const topDistricts = useMemo(() => {
    const list: Array<{ district: string; state: string; count: number; highRisk: number; overrun: number }> = [];

    Object.values(stateAggregates).forEach((s) => {
      Object.entries(s.districts).forEach(([dName, dStat]) => {
        list.push({
          district: dName,
          state: s.state,
          count: dStat.count,
          highRisk: dStat.highRisk,
          overrun: dStat.overrun,
        });
      });
    });

    return list.sort((a, b) => b.highRisk - a.highRisk || b.overrun - a.overrun).slice(0, 8);
  }, [stateAggregates]);

  // Regional State Grid Layout
  const regions = [
    {
      name: 'Northern & Western Belt',
      states: ['UTTAR PRADESH', 'RAJASTHAN', 'GUJARAT', 'MAHARASHTRA', 'HARYANA', 'PUNJAB', 'DELHI', 'MADHYA PRADESH'],
    },
    {
      name: 'Southern & Coastal Belt',
      states: ['TAMIL NADU', 'KARNATAKA', 'ANDHRA PRADESH', 'TELANGANA', 'KERALA', 'GOA'],
    },
    {
      name: 'Eastern & North-Eastern Belt',
      states: ['BIHAR', 'WEST BENGAL', 'ODISHA', 'JHARKHAND', 'ASSAM', 'TRIPURA', 'MEGHALAYA', 'NAGALAND'],
    },
  ];

  const activeStateData = stateFilter !== 'ALL' ? stateAggregates[stateFilter] : null;

  return (
    <div className="bg-surface-card border border-border-subtle p-4 rounded-xs space-y-4 text-xs">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase text-text-main flex items-center space-x-2">
            <span>Geospatial Risk Matrix: State & District Collectorate GIS</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-300 font-normal">
              {rankedStates.length} Administrative Jurisdictions
            </span>
          </h3>
          <p className="text-text-dim text-[11px] mt-0.5">
            Territorial anomaly density index. Click any State or District Collectorate to filter the entire audit queue.
          </p>
        </div>

        {/* Current Filter Pill */}
        {stateFilter !== 'ALL' && (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-300 px-2.5 py-1 text-[11px] font-mono rounded-xs">
            <span className="text-amber-900 font-semibold">Active Filter: {stateFilter}</span>
            <button
              onClick={() => {
                setStateFilter('ALL');
                setWorkCategoryFilter('ALL');
                setAgencyFilter('ALL');
                setConstituencyFilter('ALL');
              }}
              className="text-risk-high hover:underline font-bold"
            >
              [RESET ALL]
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Regional State Grid Choropleth */}
        <div className="lg:col-span-7 space-y-3">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1">
            State-Level Vigilance Concentration
          </div>

          <div className="space-y-3">
            {regions.map((reg, regIdx) => (
              <div key={regIdx} className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                  {reg.name}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {reg.states.map((stName) => {
                    const data = stateAggregates[stName];
                    const isSelected = stateFilter.toUpperCase() === stName.toUpperCase();
                    const hasHighRisk = data && data.highRiskCount > 0;
                    const highRiskRate = data && data.totalWorks > 0 ? (data.highRiskCount / data.totalWorks) * 100 : 0;

                    let cardBg = 'bg-paper border-border-subtle';
                    let badgeColor = 'text-slate-400';

                    if (data) {
                      if (highRiskRate >= 20 || (data.highRiskCount >= 10)) {
                        cardBg = isSelected
                          ? 'bg-red-100 border-red-700 ring-2 ring-red-700'
                          : 'bg-risk-high-bg border-risk-high-border hover:border-red-500';
                        badgeColor = 'text-risk-high font-bold';
                      } else if (hasHighRisk) {
                        cardBg = isSelected
                          ? 'bg-amber-100 border-amber-700 ring-2 ring-amber-700'
                          : 'bg-risk-medium-bg border-risk-medium-border hover:border-amber-500';
                        badgeColor = 'text-risk-medium font-semibold';
                      } else {
                        cardBg = isSelected
                          ? 'bg-emerald-100 border-emerald-700 ring-2 ring-emerald-700'
                          : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400';
                        badgeColor = 'text-emerald-800';
                      }
                    }

                    return (
                      <button
                        key={stName}
                        onClick={() => {
                          if (isSelected) {
                            setStateFilter('ALL');
                            setConstituencyFilter('ALL');
                          } else {
                            setStateFilter(stName);
                            setConstituencyFilter('ALL');
                          }
                        }}
                        onMouseEnter={() => setHoveredState(stName)}
                        onMouseLeave={() => setHoveredState(null)}
                        className={`p-2 border rounded-xs text-left transition-all relative ${cardBg}`}
                      >
                        <div className="font-sans font-semibold text-[11px] text-text-main truncate" title={stName}>
                          {stName}
                        </div>

                        <div className="mt-1 flex items-baseline justify-between font-mono text-[10px]">
                          <span className="text-text-muted">
                            {data ? `${data.totalWorks} works` : '0 works'}
                          </span>
                          <span className={badgeColor}>
                            {data ? `${data.highRiskCount} High` : '0'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-3 text-[9px] font-mono text-slate-500 pt-1">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-risk-high-bg border border-risk-high-border inline-block" />
              <span>High Anomaly Burden (&gt;10% High Risk)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-risk-medium-bg border border-risk-medium-border inline-block" />
              <span>Moderate Variance</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-emerald-50 border border-emerald-200 inline-block" />
              <span>Clean Compliance</span>
            </span>
          </div>
        </div>

        {/* Right: Top High-Risk Collectorates / District Authority Ranking */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1 flex justify-between">
            <span>Critical District Collectorates</span>
            <span>Ranked by Risk</span>
          </div>

          <div className="space-y-2 max-h-[310px] overflow-y-auto">
            {topDistricts.map((dist, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setStateFilter(dist.state);
                  setConstituencyFilter(dist.district);
                  setActiveTab('ANOMALIES');
                }}
                className="p-2.5 bg-paper border border-border-subtle hover:bg-slate-100 rounded-xs cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-text-main flex items-center space-x-1.5">
                    <span className="font-mono text-[10px] text-text-dim">#{idx + 1}</span>
                    <span className="truncate max-w-[160px]" title={dist.district}>
                      {dist.district}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-text-dim mt-0.5">
                    State: {dist.state} &bull; {dist.count} works
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-risk-high-bg text-risk-high border border-risk-high-border rounded-xs">
                    {dist.highRisk} High Risk
                  </span>
                  {dist.overrun > 0 && (
                    <div className="text-[9px] text-text-dim mt-0.5">
                      +{formatINR(dist.overrun)} Overrun
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeStateData && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xs font-mono text-[11px]">
              <div className="font-bold flex justify-between">
                <span>{activeStateData.state} Selected</span>
                <span>{activeStateData.totalWorks} Total Projects</span>
              </div>
              <div className="mt-1 text-[10px] text-amber-900">
                Cumulative Exposure: {formatINR(activeStateData.sanctionTotal)} Sanctioned &bull;{' '}
                <span className="font-bold text-risk-high">{activeStateData.highRiskCount} Flagged High Risk</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
