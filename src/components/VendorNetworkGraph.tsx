'use client';

import React, { useMemo, useState } from 'react';
import { CanonicalWorkRecord } from '../types';
import { useDataset } from '../context/DatasetContext';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const VendorNetworkGraph: React.FC = () => {
  const { records, setSearchQuery, setActiveTab } = useDataset();
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Compute vendor-agency clusters and procurement monopoly metrics
  const networkData = useMemo(() => {
    if (!records || records.length === 0) return null;

    // Aggregate by vendor
    const vendorMap: Record<
      string,
      {
        name: string;
        worksCount: number;
        totalSanction: number;
        highRiskCount: number;
        splitBillCount: number;
        agencies: Set<string>;
        constituencies: Set<string>;
        works: CanonicalWorkRecord[];
      }
    > = {};

    records.forEach((r) => {
      const vName = (r.vendorName || '').trim();
      if (!vName || vName === 'N/A' || vName === '-') return;

      if (!vendorMap[vName]) {
        vendorMap[vName] = {
          name: vName,
          worksCount: 0,
          totalSanction: 0,
          highRiskCount: 0,
          splitBillCount: 0,
          agencies: new Set(),
          constituencies: new Set(),
          works: [],
        };
      }

      vendorMap[vName].worksCount++;
      vendorMap[vName].totalSanction += r.sanctionAmount || 0;
      if (r.riskLevel === 'HIGH') vendorMap[vName].highRiskCount++;
      if (r.triggeredRules.some((trig) => trig.ruleId === 'SPLIT_BILL_EVASION')) {
        vendorMap[vName].splitBillCount++;
      }
      if (r.ida) vendorMap[vName].agencies.add(r.ida);
      if (r.constituency) vendorMap[vName].constituencies.add(r.constituency);
      vendorMap[vName].works.push(r);
    });

    const vendorsList = Object.values(vendorMap)
      .filter((v) => v.worksCount >= 2)
      .sort((a, b) => b.splitBillCount - a.splitBillCount || b.totalSanction - a.totalSanction);

    // Calculate Herfindahl-Hirschman Index (HHI) for top 10 vendors
    const totalExpenditure = vendorsList.reduce((acc, v) => acc + v.totalSanction, 0);
    let hhi = 0;
    if (totalExpenditure > 0) {
      vendorsList.slice(0, 15).forEach((v) => {
        const share = (v.totalSanction / totalExpenditure) * 100;
        hhi += Math.pow(share, 2);
      });
    }

    // Top 8 nodes for SVG network layout
    const topNodes = vendorsList.slice(0, 8);

    // Layout circular graph
    const svgWidth = 640;
    const svgHeight = 320;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const hubRadius = 110;

    const graphNodes = topNodes.map((v, idx) => {
      const angle = (idx / topNodes.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + hubRadius * Math.cos(angle);
      const y = centerY + hubRadius * Math.sin(angle);
      const isSplitRing = v.splitBillCount > 0;
      const nodeRadius = Math.min(24, Math.max(12, 10 + v.worksCount * 1.5));

      return {
        ...v,
        x,
        y,
        isSplitRing,
        nodeRadius,
      };
    });

    return {
      vendorsList,
      topNodes: graphNodes,
      hhi: Math.round(hhi),
      centerX,
      centerY,
      svgWidth,
      svgHeight,
    };
  }, [records]);

  if (!networkData) return null;

  return (
    <div className="bg-surface-card border border-border-subtle p-4 rounded-xs space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase text-text-main flex items-center space-x-2">
            <span>Procurement Collusion & Tender Ring Intelligence Graph</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-red-50 text-risk-high border border-red-200 font-bold">
              Autonomous Entity Disambiguation
            </span>
          </h3>
          <p className="text-text-dim text-[11px] mt-0.5">
            Cross-referencing repeated sub-threshold contract awards across Implementing District Authorities (IDAs).
          </p>
        </div>

        {/* HHI Monopoly Index Badge */}
        <div className="flex items-center space-x-2 font-mono text-[11px]">
          <div className="px-2.5 py-1 bg-paper border border-border-subtle rounded-xs">
            <span className="text-text-muted">Procurement Concentration (HHI): </span>
            <span
              className={`font-bold ${
                networkData.hhi > 2500
                  ? 'text-risk-high'
                  : networkData.hhi > 1500
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {networkData.hhi} pts [
              {networkData.hhi > 2500 ? 'High Monopoly' : networkData.hhi > 1500 ? 'Moderate' : 'Competitive'}]
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: SVG Network Graph */}
        <div className="lg:col-span-7 bg-paper border border-border-subtle p-3 rounded-xs flex flex-col items-center justify-center relative">
          <div className="absolute top-2 left-2 text-[10px] font-mono text-text-muted uppercase">
            Contractor Award Rings (Central Nodal Desk)
          </div>

          <svg
            viewBox={`0 0 ${networkData.svgWidth} ${networkData.svgHeight}`}
            className="w-full h-auto select-none"
          >
            {/* Center Central Hub: MoSPI Nodal Desk */}
            <circle
              cx={networkData.centerX}
              cy={networkData.centerY}
              r="34"
              fill="#0F294A"
              stroke="#CBD5E1"
              strokeWidth="2"
            />
            <text
              x={networkData.centerX}
              y={networkData.centerY - 4}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold fill-white"
            >
              DISTRICT
            </text>
            <text
              x={networkData.centerX}
              y={networkData.centerY + 8}
              textAnchor="middle"
              className="text-[8px] font-mono fill-slate-300"
            >
              AUTHORITY
            </text>

            {/* Connecting Edges from Central Hub to Vendors */}
            {networkData.topNodes.map((node, i) => {
              const isFlagged = node.isSplitRing || node.highRiskCount > 0;
              const isSelected = selectedCluster === node.name;

              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={networkData.centerX}
                    y1={networkData.centerY}
                    x2={node.x}
                    y2={node.y}
                    stroke={isFlagged ? '#DC2626' : '#94A3B8'}
                    strokeWidth={isSelected ? 3 : Math.min(4, Math.max(1.5, node.worksCount * 0.4))}
                    strokeDasharray={isFlagged ? '4 2' : 'none'}
                    opacity={isSelected ? 1 : 0.65}
                  />
                </g>
              );
            })}

            {/* Satellite Vendor Nodes */}
            {networkData.topNodes.map((node, i) => {
              const isFlagged = node.isSplitRing;
              const isSelected = selectedCluster === node.name;

              return (
                <g
                  key={`node-${i}`}
                  onClick={() => setSelectedCluster(node.name === selectedCluster ? null : node.name)}
                  className="cursor-pointer"
                >
                  {/* Outer glow ring for split bill or selected */}
                  {(isFlagged || isSelected) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.nodeRadius + 4}
                      fill="none"
                      stroke={isSelected ? '#0B1D3A' : '#EF4444'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Primary Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.nodeRadius}
                    fill={isFlagged ? '#FEE2E2' : '#F0FDF4'}
                    stroke={isFlagged ? '#DC2626' : '#15803D'}
                    strokeWidth="2"
                    className="hover:scale-110 transition-transform origin-center"
                  />

                  {/* Node Label: Count of works */}
                  <text
                    x={node.x}
                    y={node.y + 3}
                    textAnchor="middle"
                    className={`text-[9px] font-mono font-bold ${
                      isFlagged ? 'fill-red-900' : 'fill-emerald-900'
                    }`}
                  >
                    {node.worksCount}
                  </text>

                  {/* Vendor Name below node */}
                  <text
                    x={node.x}
                    y={node.y + node.nodeRadius + 11}
                    textAnchor="middle"
                    className="text-[8px] font-mono font-semibold fill-slate-800"
                  >
                    {node.name.length > 14 ? node.name.slice(0, 12) + '...' : node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-1 flex items-center space-x-3 text-[9px] font-mono text-slate-500">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
              <span>Split-Bill / Evasion Ring</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              <span>Standard Contractor</span>
            </span>
            <span>&bull; Line thickness = Cumulative Sanction Volume</span>
          </div>
        </div>

        {/* Right: Detected Tender Rings & Monopolies List */}
        <div className="lg:col-span-5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold border-b border-border-subtle pb-1 flex justify-between">
              <span>Top Interconnected Contractor Entities</span>
              <span>{networkData.vendorsList.length} Active</span>
            </div>

            <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto">
              {networkData.vendorsList.slice(0, 6).map((v, idx) => {
                const isSelected = selectedCluster === v.name;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCluster(isSelected ? null : v.name)}
                    className={`p-2.5 border rounded-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-slate-800 ring-1 ring-slate-800'
                        : 'bg-surface-card border-border-subtle hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-text-main text-xs truncate max-w-[200px]" title={v.name}>
                        {v.name}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-text-main">
                        {formatINR(v.totalSanction)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center space-x-2 text-[10px] font-mono">
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-300">
                        {v.worksCount} Works
                      </span>
                      {v.splitBillCount > 0 ? (
                        <span className="px-1.5 py-0.2 bg-red-50 text-risk-high border border-red-200 font-bold">
                          {v.splitBillCount} Tender Split Flags
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Clean Procurement
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-[9px] text-text-dim font-mono truncate">
                      Agencies: {Array.from(v.agencies).join(', ') || 'District Office'}
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-emerald-800 font-semibold">
                          Selected in Graph
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(v.name);
                            setActiveTab('ANOMALIES');
                          }}
                          className="px-2 py-0.5 bg-gov-navy text-white text-[10px] font-mono rounded-xs"
                        >
                          Filter in Anomaly Queue &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
