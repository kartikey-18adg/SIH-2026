'use client';

import React, { useMemo, useState } from 'react';
import { CanonicalWorkRecord, RiskLevel } from '../types';
import { useDataset } from '../context/DatasetContext';
import { parseDate } from '../utils/anomalyEngine';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const OutlierScatterPlot: React.FC = () => {
  const { records, selectedRecord, setSelectedRecord, setActiveTab } = useDataset();
  const [filterRisk, setFilterRisk] = useState<'ALL' | RiskLevel>('ALL');
  const [hoveredRecord, setHoveredRecord] = useState<CanonicalWorkRecord | null>(null);

  // SVG dimensions
  const width = 800;
  const height = 360;
  const padLeft = 60;
  const padRight = 40;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Process data points
  const pointsData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const now = new Date(2026, 8, 3);

    // Limit to 400 representative sampled points for optimal SVG rendering performance
    const filtered = records.filter((r) => filterRisk === 'ALL' || r.riskLevel === filterRisk);

    // Always include selected record and all HIGH risk records, then sample the rest
    const highRisk = filtered.filter((r) => r.riskLevel === 'HIGH');
    const medRisk = filtered.filter((r) => r.riskLevel === 'MEDIUM');
    const lowRisk = filtered.filter((r) => r.riskLevel === 'LOW');

    const sample = [
      ...highRisk,
      ...medRisk.slice(0, 150),
      ...lowRisk.slice(0, 150),
    ];

    if (selectedRecord && !sample.some((s) => s.id === selectedRecord.id)) {
      sample.push(selectedRecord);
    }

    // Min/Max bounds for logarithmic/linear projection
    // X: Log scale for cost (min ₹10k, max ₹5 Cr)
    const minCostLog = Math.log10(10000);
    const maxCostLog = Math.log10(50000000);

    // Y: Linear scale for elapsed days (0 to 600 days)
    const maxDays = 600;

    return sample.map((r) => {
      const cost = Math.max(10000, r.sanctionAmount || 10000);
      const costLog = Math.log10(cost);
      const xRatio = Math.min(1, Math.max(0, (costLog - minCostLog) / (maxCostLog - minCostLog)));
      const cx = padLeft + xRatio * plotWidth;

      const sDate = parseDate(r.sanctionDate);
      let elapsedDays = 60; // fallback
      if (sDate) {
        elapsedDays = Math.max(0, Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
      const yRatio = Math.min(1, Math.max(0, elapsedDays / maxDays));
      const cy = padTop + plotHeight * (1 - yRatio); // Invert Y

      // Radius
      let radius = 3.5;
      if (r.riskLevel === 'HIGH') radius = 6;
      else if (r.riskLevel === 'MEDIUM') radius = 4.5;
      if (r.estimatedOverrunRisk > 0) radius += 2;

      return {
        record: r,
        cx,
        cy,
        radius,
        cost,
        elapsedDays,
      };
    });
  }, [records, filterRisk, selectedRecord, plotWidth, plotHeight]);

  // Quadrant boundaries
  // Normal SLA = 180 days -> Y line
  const y180Ratio = 180 / 600;
  const y180Coord = padTop + plotHeight * (1 - y180Ratio);

  // Normal Cost boundary = ₹15 Lakhs -> X line
  const minCostLog = Math.log10(10000);
  const maxCostLog = Math.log10(50000000);
  const x15LRatio = (Math.log10(1500000) - minCostLog) / (maxCostLog - minCostLog);
  const x15LCoord = padLeft + x15LRatio * plotWidth;

  return (
    <div className="bg-surface-card border border-border-subtle p-4 rounded-xs space-y-3 text-xs">
      {/* Top Filter and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase text-text-main flex items-center space-x-2">
            <span>Multi-Metric Outlier Matrix: Cost vs SLA Duration vs Overruns</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-300 font-normal">
              {pointsData.length} Plotted Works &bull; Click point to inspect dossier
            </span>
          </h3>
          <p className="text-text-dim text-[11px] mt-0.5">
            2D Scatter projection isolating the high-density normal operational quadrant from high-exposure vigilance outliers.
          </p>
        </div>

        {/* Risk Grade Filter Tabs */}
        <div className="flex items-center space-x-1 font-mono text-xs">
          <span className="text-text-muted mr-1">Filter:</span>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((grade) => (
            <button
              key={grade}
              onClick={() => setFilterRisk(grade)}
              className={`px-2.5 py-1 text-[11px] border rounded-xs ${
                filterRisk === grade
                  ? 'bg-gov-navy text-white border-gov-navy font-bold'
                  : 'bg-paper text-text-muted border-border-subtle hover:bg-slate-100'
              }`}
            >
              {grade === 'ALL' ? 'All Points' : grade}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scatter Plot SVG */}
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
          {/* Quadrant Shading */}
          {/* Bottom-Left: Normal State of Affairs */}
          <rect
            x={padLeft}
            y={y180Coord}
            width={x15LCoord - padLeft}
            height={padTop + plotHeight - y180Coord}
            fill="#F0FDF4"
            opacity={0.6}
          />
          <text
            x={padLeft + 12}
            y={padTop + plotHeight - 12}
            className="text-[9px] font-mono font-bold fill-emerald-800 uppercase tracking-wide"
          >
            ✓ Normal Baseline Quadrant (&lt;180d, &lt;₹15L)
          </text>

          {/* Top-Right: Critical Vigilance Zone */}
          <rect
            x={x15LCoord}
            y={padTop}
            width={padLeft + plotWidth - x15LCoord}
            height={y180Coord - padTop}
            fill="#FEF2F2"
            opacity={0.65}
          />
          <text
            x={padLeft + plotWidth - 12}
            y={padTop + 16}
            textAnchor="end"
            className="text-[9px] font-mono font-bold fill-red-800 uppercase tracking-wide"
          >
            🚨 High-Exposure Outlier Zone (&gt;180d &gt;₹15L)
          </text>

          {/* Dividing Threshold Crosshairs */}
          {/* Y=180 Days SLA Line */}
          <line
            x1={padLeft}
            y1={y180Coord}
            x2={padLeft + plotWidth}
            y2={y180Coord}
            stroke="#D97706"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={padLeft + plotWidth + 4}
            y={y180Coord + 3}
            className="text-[8px] font-mono fill-amber-800 font-bold"
          >
            180d SLA
          </text>

          {/* X=15 Lakhs Line */}
          <line
            x1={x15LCoord}
            y1={padTop}
            x2={x15LCoord}
            y2={padTop + plotHeight}
            stroke="#64748B"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={x15LCoord}
            y={padTop - 6}
            textAnchor="middle"
            className="text-[8px] font-mono fill-slate-600 font-bold"
          >
            ₹15 Lakhs Benchmark
          </text>

          {/* Y-Axis Grid & Ticks (Elapsed Days) */}
          {[0, 100, 180, 300, 450, 600].map((days) => {
            const y = padTop + plotHeight * (1 - days / 600);
            return (
              <g key={days}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotWidth}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={days === 180 ? 'none' : '2 2'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  {days}d
                </text>
              </g>
            );
          })}

          {/* X-Axis Grid & Ticks (Sanction Cost Log Scale) */}
          {[
            { val: 10000, label: '₹10k' },
            { val: 100000, label: '₹1 L' },
            { val: 500000, label: '₹5 L' },
            { val: 1500000, label: '₹15 L' },
            { val: 5000000, label: '₹50 L' },
            { val: 20000000, label: '₹2 Cr' },
            { val: 50000000, label: '₹5 Cr' },
          ].map((tick) => {
            const costLog = Math.log10(tick.val);
            const x = padLeft + ((costLog - minCostLog) / (maxCostLog - minCostLog)) * plotWidth;
            return (
              <g key={tick.val}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotHeight}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={x}
                  y={padTop + plotHeight + 15}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-500"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={padLeft + plotWidth / 2}
            y={padTop + plotHeight + 32}
            textAnchor="middle"
            className="text-[10px] font-mono font-bold fill-slate-700 uppercase"
          >
            Approved Sanctioned Cost (Logarithmic Scale) &rarr;
          </text>
          <text
            x={padLeft - 38}
            y={padTop + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${padLeft - 38} ${padTop + plotHeight / 2})`}
            className="text-[10px] font-mono font-bold fill-slate-700 uppercase"
          >
            Execution SLA Elapsed Days &rarr;
          </text>

          {/* Scatter Points */}
          {pointsData.map((pt) => {
            const isSelected = selectedRecord?.id === pt.record.id;
            const isHovered = hoveredRecord?.id === pt.record.id;

            let fill = '#10B981'; // green low
            if (pt.record.riskLevel === 'HIGH') fill = '#DC2626'; // red
            else if (pt.record.riskLevel === 'MEDIUM') fill = '#D97706'; // amber

            return (
              <g
                key={pt.record.id}
                onClick={() => {
                  setSelectedRecord(pt.record);
                }}
                onDoubleClick={() => {
                  setSelectedRecord(pt.record);
                  setActiveTab('INSPECTOR');
                }}
                onMouseEnter={() => setHoveredRecord(pt.record)}
                onMouseLeave={() => setHoveredRecord(null)}
                className="cursor-pointer transition-transform"
              >
                {/* Outer halo for selected or hovered point */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={pt.radius + 5}
                    fill="none"
                    stroke={isSelected ? '#0B1D3A' : '#94A3B8'}
                    strokeWidth="2"
                    strokeDasharray={isSelected ? '3 2' : 'none'}
                    className="animate-spin-slow"
                  />
                )}

                {/* Primary Data Dot */}
                <circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r={isSelected ? pt.radius + 2 : pt.radius}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={isSelected || isHovered ? 1 : 0.78}
                  className="hover:opacity-100 transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Active / Hovered Point Detail Callout */}
      {(hoveredRecord || selectedRecord) && (
        <div className="p-3 bg-paper border border-border-subtle rounded-xs flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] animate-fade-in">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-text-main">
                {(hoveredRecord || selectedRecord)?.id}
              </span>
              <span
                className={`px-1.5 py-0.2 text-[10px] font-bold border rounded-xs ${
                  (hoveredRecord || selectedRecord)?.riskLevel === 'HIGH'
                    ? 'bg-risk-high-bg text-risk-high border-risk-high-border'
                    : (hoveredRecord || selectedRecord)?.riskLevel === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                Risk: {(hoveredRecord || selectedRecord)?.riskScore}/100 [
                {(hoveredRecord || selectedRecord)?.riskLevel}]
              </span>
              <span className="text-text-dim text-[10px]">
                {(hoveredRecord || selectedRecord)?.constituency},{' '}
                {(hoveredRecord || selectedRecord)?.state}
              </span>
            </div>
            <p className="text-text-muted text-xs truncate max-w-xl font-sans">
              {(hoveredRecord || selectedRecord)?.workDescription ||
                (hoveredRecord || selectedRecord)?.workTitle}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div>
              <span className="text-text-dim block text-[10px]">Sanction:</span>
              <span className="font-bold text-text-main">
                {formatINR((hoveredRecord || selectedRecord)?.sanctionAmount || 0)}
              </span>
            </div>
            <div>
              <span className="text-text-dim block text-[10px]">Disbursed:</span>
              <span
                className={
                  ((hoveredRecord || selectedRecord)?.disbursedAmount || 0) >
                  ((hoveredRecord || selectedRecord)?.sanctionAmount || 0)
                    ? 'text-risk-high font-bold'
                    : 'text-text-main'
                }
              >
                {formatINR((hoveredRecord || selectedRecord)?.disbursedAmount || 0)}
              </span>
            </div>
            <button
              onClick={() => {
                if (hoveredRecord) setSelectedRecord(hoveredRecord);
                setActiveTab('INSPECTOR');
              }}
              className="px-3 py-1.5 bg-gov-navy text-white text-xs font-semibold rounded-xs hover:bg-slate-800"
            >
              Open Dossier &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
