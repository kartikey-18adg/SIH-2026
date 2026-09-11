'use client';

import React, { useMemo, useState } from 'react';
import { CanonicalWorkRecord } from '../types';
import { computeCategoryBenchmarks, parseDate } from '../utils/anomalyEngine';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

interface NormalDistributionChartProps {
  records: CanonicalWorkRecord[];
}

export const NormalDistributionChart: React.FC<NormalDistributionChartProps> = ({ records }) => {
  const [viewMode, setViewMode] = useState<'HISTOGRAM' | 'HEAT_PLOT'>('HISTOGRAM');
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const [hoveredHeatCell, setHoveredHeatCell] = useState<{ row: number; col: number } | null>(null);

  // Compute portfolio distribution metrics for Histogram
  const stats = useMemo(() => {
    if (!records || records.length === 0) return null;

    const amounts = records
      .map((r) => r.sanctionAmount)
      .filter((amt) => amt > 0)
      .sort((a, b) => a - b);

    if (amounts.length === 0) return null;

    const n = amounts.length;
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;

    const sum = amounts.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    const variance = amounts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const q1 = amounts[Math.floor(n * 0.25)];
    const q3 = amounts[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const upperAnomalyBound = median + 1.5 * iqr;

    // 10 discrete bins for Histogram
    const binsConfig = [
      { label: '< ₹1 L', min: 0, max: 100000, isNormal: true },
      { label: '₹1 - 3 L', min: 100000, max: 300000, isNormal: true },
      { label: '₹3 - 5 L', min: 300000, max: 500000, isNormal: true },
      { label: '₹5 - 8 L', min: 500000, max: 800000, isNormal: true },
      { label: '₹8 - 12 L', min: 800000, max: 1200000, isNormal: true },
      { label: '₹12 - 20 L', min: 1200000, max: 2000000, isNormal: true },
      { label: '₹20 - 35 L', min: 2000000, max: 3500000, isNormal: false },
      { label: '₹35 - 50 L', min: 3500000, max: 5000000, isNormal: false },
      { label: '₹50 L - 1 Cr', min: 5000000, max: 10000000, isNormal: false },
      { label: '> ₹1 Cr', min: 10000000, max: Infinity, isNormal: false },
    ];

    const binned = binsConfig.map((bin) => {
      const matching = amounts.filter((amt) => amt >= bin.min && amt < bin.max);
      return {
        ...bin,
        count: matching.length,
        percentage: ((matching.length / n) * 100).toFixed(1),
      };
    });

    const maxBinCount = Math.max(...binned.map((b) => b.count), 1);

    return {
      total: n,
      median,
      mean,
      stdDev,
      q1,
      q3,
      upperAnomalyBound,
      binned,
      maxBinCount,
    };
  }, [records]);

  // Compute 2D Heat Plot Matrix: Cost Tiers (X) vs Execution Timeline SLA (Y)
  const heatPlotData = useMemo(() => {
    if (!records || records.length === 0) return null;

    const now = new Date(2026, 8, 3);

    const costCols = [
      { label: '< ₹2 Lakhs', minCost: 0, maxCost: 200000 },
      { label: '₹2 - 5 Lakhs', minCost: 200000, maxCost: 500000 },
      { label: '₹5 - 10 Lakhs', minCost: 500000, maxCost: 1000000 },
      { label: '₹10 - 25 Lakhs', minCost: 1000000, maxCost: 2500000 },
      { label: '₹25 - 50 Lakhs', minCost: 2500000, maxCost: 5000000 },
      { label: '> ₹50 Lakhs', minCost: 5000000, maxCost: Infinity },
    ];

    const timeRows = [
      { label: 'Prompt (0 - 90d)', minDays: 0, maxDays: 90, zone: 'NORMAL', desc: 'Accelerated Delivery' },
      { label: 'Standard (90 - 180d)', minDays: 90, maxDays: 180, zone: 'NORMAL', desc: 'MoSPI Statutory SLA Target' },
      { label: 'Delayed (180 - 365d)', minDays: 180, maxDays: 365, zone: 'WARNING', desc: 'Milestone Overdue' },
      { label: 'Breached (> 365d)', minDays: 365, maxDays: Infinity, zone: 'ANOMALY', desc: 'Critical SLA Breach' },
    ];

    // Grid matrix
    let maxCellCount = 0;
    const grid = timeRows.map((row, rIdx) => {
      return costCols.map((col, cIdx) => {
        const matches = records.filter((r) => {
          const costMatch = r.sanctionAmount >= col.minCost && r.sanctionAmount < col.maxCost;
          if (!costMatch) return false;

          const sDate = parseDate(r.sanctionDate);
          if (!sDate) return rIdx === 1; // fallback to standard row if date missing
          const elapsed = Math.max(0, Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
          return elapsed >= row.minDays && elapsed < row.maxDays;
        });

        if (matches.length > maxCellCount) maxCellCount = matches.length;

        // Calculate severity rating for this cell
        const isNormalState = rIdx <= 1 && cIdx <= 2;
        const isAnomalousZone = rIdx >= 2 || cIdx >= 4;

        return {
          rowIdx: rIdx,
          colIdx: cIdx,
          count: matches.length,
          percentage: ((matches.length / records.length) * 100).toFixed(1),
          isNormalState,
          isAnomalousZone,
          sampleId: matches[0]?.id || '',
        };
      });
    });

    return {
      costCols,
      timeRows,
      grid,
      maxCellCount,
      total: records.length,
    };
  }, [records]);

  // Sector benchmarks
  const categoryBenchmarks = useMemo(() => {
    const bm = computeCategoryBenchmarks(records);
    return Object.values(bm)
      .filter((b) => b.count >= 10)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [records]);

  if (!stats) return null;

  // Histogram SVG Dimensions
  const width = 760;
  const height = 220;
  const padLeft = 45;
  const padRight = 30;
  const padBottom = 35;
  const padTop = 25;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const barWidth = chartWidth / stats.binned.length;

  const normalCurvePoints = stats.binned.map((bin, idx) => {
    const x = padLeft + idx * barWidth + barWidth / 2;
    const normalizedX = (idx - 3.5) / 2.2;
    const gaussianY = Math.exp(-0.5 * Math.pow(normalizedX, 2));
    const y = padTop + chartHeight * (1 - gaussianY * 0.9);
    return { x, y };
  });

  const curvePathD = normalCurvePoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = normalCurvePoints[i - 1];
    const midX = (prev.x + pt.x) / 2;
    return `${acc} C ${midX},${prev.y} ${midX},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  return (
    <div className="bg-surface-card border border-border-subtle p-4 rounded-xs space-y-4 text-xs">
      {/* Top Bar with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase text-text-main flex items-center space-x-2">
            <span>Statistical Intelligence: Normal State of Affairs vs Anomaly Zones</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-300 font-normal">
              N={stats.total.toLocaleString('en-IN')} Monitored Works
            </span>
          </h3>
          <p className="text-text-dim text-[11px] mt-0.5">
            Empirical baseline distributions distinguishing expected administrative norms from vigilance outliers.
          </p>
        </div>

        {/* View Switcher: Histogram vs 2D Heat Plot */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <button
            onClick={() => setViewMode('HISTOGRAM')}
            className={`px-3 py-1 text-xs border rounded-xs transition-colors ${
              viewMode === 'HISTOGRAM'
                ? 'bg-gov-navy text-white border-gov-navy font-semibold'
                : 'bg-paper text-text-muted border-border-subtle hover:bg-slate-100'
            }`}
          >
            📊 Cost Distribution Histogram
          </button>
          <button
            onClick={() => setViewMode('HEAT_PLOT')}
            className={`px-3 py-1 text-xs border rounded-xs transition-colors ${
              viewMode === 'HEAT_PLOT'
                ? 'bg-gov-navy text-white border-gov-navy font-semibold'
                : 'bg-paper text-text-muted border-border-subtle hover:bg-slate-100'
            }`}
          >
            🔥 2D Risk & Velocity Heat Plot
          </button>
        </div>
      </div>

      {/* =============================================================
          VIEW 1: Empirical Histogram with Fitted Gaussian Bell Curve
          ============================================================= */}
      {viewMode === 'HISTOGRAM' && (
        <div className="space-y-3">
          {/* Statistical KPI Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <div className="px-2 py-1 bg-paper border border-border-subtle rounded-xs">
                <span className="text-text-muted">Median Baseline: </span>
                <span className="font-bold text-text-main">{formatINR(stats.median)}</span>
              </div>
              <div className="px-2 py-1 bg-paper border border-border-subtle rounded-xs">
                <span className="text-text-muted">Normal IQR (Q1-Q3): </span>
                <span className="font-semibold text-text-main">
                  {formatINR(stats.q1)} - {formatINR(stats.q3)}
                </span>
              </div>
            </div>
            <div className="px-2 py-1 bg-risk-high-bg border border-risk-high-border text-risk-high rounded-xs font-bold">
              <span>Anomaly Threshold: </span>
              <span>&gt; {formatINR(stats.upperAnomalyBound)}</span>
            </div>
          </div>

          {/* Interactive SVG Histogram */}
          <div className="relative overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
              {/* Background Normal Zone Band (Covering first 6 bins) */}
              <rect
                x={padLeft}
                y={padTop}
                width={barWidth * 6}
                height={chartHeight}
                fill="#F0FDF4"
                opacity={0.65}
              />

              {/* Background Anomaly Zone Band (Covering remaining 4 bins) */}
              <rect
                x={padLeft + barWidth * 6}
                y={padTop}
                width={barWidth * 4}
                height={chartHeight}
                fill="#FEF2F2"
                opacity={0.65}
              />

              {/* Zone Labels */}
              <text
                x={padLeft + (barWidth * 6) / 2}
                y={padTop + 14}
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-emerald-800 uppercase tracking-wider"
              >
                Normal State of Affairs (&gt;88% of Monitored Works)
              </text>
              <text
                x={padLeft + barWidth * 6 + (barWidth * 4) / 2}
                y={padTop + 14}
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-red-800 uppercase tracking-wider"
              >
                Anomalous Outlier Territory
              </text>

              {/* Grid lines (horizontal) */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = padTop + chartHeight * (1 - ratio);
                const val = Math.round(stats.maxBinCount * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + chartWidth}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-slate-400"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Dividing Barrier Line between Normal & Outlier */}
              <line
                x1={padLeft + barWidth * 6}
                y1={padTop}
                x2={padLeft + barWidth * 6}
                y2={padTop + chartHeight}
                stroke="#DC2626"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* Histogram Bars */}
              {stats.binned.map((bin, idx) => {
                const barHeight = (bin.count / stats.maxBinCount) * chartHeight;
                const x = padLeft + idx * barWidth + 3;
                const y = padTop + chartHeight - barHeight;
                const isHovered = hoveredBin === idx;

                let fillColor = bin.isNormal ? '#0F294A' : '#B91C1C';
                if (isHovered) {
                  fillColor = bin.isNormal ? '#1E40AF' : '#DC2626';
                }

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredBin(idx)}
                    onMouseLeave={() => setHoveredBin(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth - 6}
                      height={Math.max(2, barHeight)}
                      fill={fillColor}
                      rx="1"
                      className="transition-colors duration-150"
                    />
                    <text
                      x={x + (barWidth - 6) / 2}
                      y={Math.max(padTop + 10, y - 4)}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-semibold fill-slate-700"
                    >
                      {bin.count}
                    </text>
                    <text
                      x={x + (barWidth - 6) / 2}
                      y={padTop + chartHeight + 15}
                      textAnchor="middle"
                      className={`text-[9px] font-mono ${
                        isHovered ? 'font-bold fill-slate-900' : 'fill-slate-500'
                      }`}
                    >
                      {bin.label}
                    </text>
                  </g>
                );
              })}

              {/* Fitted Normal Distribution Bell Curve Line */}
              <path
                d={curvePathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                className="drop-shadow-sm"
              />

              {/* Normal Curve Legend Symbol */}
              <g transform={`translate(${padLeft + 8}, ${padTop + chartHeight - 12})`}>
                <line x1="0" y1="0" x2="22" y2="0" stroke="#059669" strokeWidth="2.5" />
                <text x="28" y="3" className="text-[9px] font-mono font-medium fill-slate-700">
                  Theoretical Gaussian Baseline Curve
                </text>
              </g>
            </svg>
          </div>

          {/* Hovered Bin Telemetry Callout */}
          {hoveredBin !== null && (
            <div className="p-2.5 bg-paper border border-border-subtle rounded-xs flex items-center justify-between font-mono text-[11px]">
              <div>
                <span className="text-text-muted">Cost Band: </span>
                <span className="font-bold text-text-main">{stats.binned[hoveredBin].label}</span>
                <span className="text-text-dim ml-2">
                  ({stats.binned[hoveredBin].count.toLocaleString('en-IN')} works &bull; {stats.binned[hoveredBin].percentage}% of portfolio)
                </span>
              </div>
              <div>
                {stats.binned[hoveredBin].isNormal ? (
                  <span className="text-emerald-800 font-semibold px-2 py-0.5 bg-emerald-50 border border-emerald-200">
                    ✓ Normal Institutional Allocation Band
                  </span>
                ) : (
                  <span className="text-risk-high font-bold px-2 py-0.5 bg-red-50 border border-red-200">
                    ⚠ Anomalous Long-Tail: High Scrutiny Trigger
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =============================================================
          VIEW 2: 2D Risk & Velocity Heat Plot (Density Heatmap)
          ============================================================= */}
      {viewMode === 'HEAT_PLOT' && heatPlotData && (
        <div className="space-y-3">
          {/* Heat Plot Description & Scale Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-paper border border-border-subtle rounded-xs text-[11px] font-mono">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-text-main">2D Heat Density Matrix:</span>
              <span className="text-text-dim">Sanction Cost Tier (X) vs Milestone SLA Elapsed Days (Y)</span>
            </div>
            {/* Heat Gradient Legend */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-text-muted">Density / Risk Heat:</span>
              <div className="flex items-center space-x-1">
                <span className="w-3.5 h-3.5 bg-emerald-100 border border-emerald-300 inline-block" title="Normal Baseline (High Concentration)" />
                <span className="text-[10px] text-emerald-900">Normal</span>
                <span className="w-3.5 h-3.5 bg-amber-100 border border-amber-300 inline-block ml-1" title="Elevated Variance" />
                <span className="text-[10px] text-amber-900">Elevated</span>
                <span className="w-3.5 h-3.5 bg-orange-200 border border-orange-400 inline-block ml-1" title="Warning Overrun/Delay" />
                <span className="text-[10px] text-orange-900">Warning</span>
                <span className="w-3.5 h-3.5 bg-red-600 border border-red-700 inline-block ml-1" title="Critical Anomaly Cell" />
                <span className="text-[10px] text-red-900 font-bold">Anomaly</span>
              </div>
            </div>
          </div>

          {/* 2D Heatmap Grid Table */}
          <div className="overflow-x-auto border border-border-subtle">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-paper border-b border-border-subtle text-[11px] font-mono text-text-dim">
                  <th className="py-2.5 px-3 text-left w-[180px] bg-slate-100 border-r border-border-subtle">
                    EXECUTION SLA (Y) \ COST (X)
                  </th>
                  {heatPlotData.costCols.map((col, cIdx) => (
                    <th key={cIdx} className="py-2.5 px-2 border-r border-border-subtle last:border-r-0">
                      <div>{col.label}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {cIdx <= 2 ? 'Normal Tier' : 'Elevated / Anomaly'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs font-mono">
                {heatPlotData.timeRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    {/* Row Header */}
                    <td className="py-3 px-3 text-left bg-slate-50 border-r border-border-subtle font-medium text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-none inline-block ${
                            row.zone === 'NORMAL'
                              ? 'bg-emerald-600'
                              : row.zone === 'WARNING'
                              ? 'bg-amber-600'
                              : 'bg-risk-high animate-pulse'
                          }`}
                        />
                        <span className="text-text-main font-semibold">{row.label}</span>
                      </div>
                      <div className="text-[9px] text-text-dim mt-0.5">{row.desc}</div>
                    </td>

                    {/* Heat Cells */}
                    {heatPlotData.grid[rIdx].map((cell, cIdx) => {
                      const isHovered =
                        hoveredHeatCell?.row === rIdx && hoveredHeatCell?.col === cIdx;
                      const intensity = cell.count / heatPlotData.maxCellCount;

                      // Heat color calculation
                      let cellBg = '#FFFFFF';
                      let cellText = 'text-slate-700';
                      let badge = '';

                      if (cell.isNormalState) {
                        // Emerald palette for normal state of affairs
                        if (intensity > 0.4) {
                          cellBg = '#DCFCE7'; // rich emerald
                          cellText = 'text-emerald-950 font-bold';
                          badge = 'NORMAL CLUSTER';
                        } else if (intensity > 0.1) {
                          cellBg = '#F0FDF4';
                          cellText = 'text-emerald-900 font-semibold';
                        } else {
                          cellBg = '#F8FAFC';
                        }
                      } else if (cell.isAnomalousZone) {
                        // Crimson / Red palette for anomaly territory
                        if (cell.count > 0) {
                          if (rIdx === 3 && cIdx >= 3) {
                            cellBg = '#FEE2E2'; // intense critical anomaly cell
                            cellText = 'text-red-950 font-bold';
                            badge = 'CRITICAL BREACH';
                          } else if (rIdx >= 2) {
                            cellBg = '#FFEDD5'; // warning orange
                            cellText = 'text-orange-950 font-bold';
                            badge = 'WARNING DELAY';
                          } else {
                            cellBg = '#FEF3C7'; // yellow
                            cellText = 'text-amber-950 font-semibold';
                          }
                        } else {
                          cellBg = '#FAFAFA';
                        }
                      }

                      return (
                        <td
                          key={cIdx}
                          style={{ backgroundColor: isHovered ? '#E2E8F0' : cellBg }}
                          onMouseEnter={() => setHoveredHeatCell({ row: rIdx, col: cIdx })}
                          onMouseLeave={() => setHoveredHeatCell(null)}
                          className={`py-3 px-2 border-r border-border-subtle last:border-r-0 cursor-pointer transition-all duration-150 relative ${
                            isHovered ? 'ring-2 ring-gov-navy z-10' : ''
                          }`}
                        >
                          <div className={`text-sm ${cellText}`}>
                            {cell.count.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-text-dim mt-0.5">
                            {cell.percentage}%
                          </div>
                          {badge && (
                            <span className="inline-block mt-1 text-[8px] font-mono font-bold uppercase px-1 py-0.2 border border-current rounded-none">
                              {badge}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Heat Cell Deep Dive Hover Info */}
          {hoveredHeatCell && (
            <div className="p-2.5 bg-paper border border-border-subtle rounded-xs flex items-center justify-between font-mono text-[11px]">
              <div>
                <span className="text-text-muted">Inspecting Matrix Cell: </span>
                <span className="font-bold text-text-main">
                  [{heatPlotData.timeRows[hoveredHeatCell.row].label}] &times; [{' '}
                  {heatPlotData.costCols[hoveredHeatCell.col].label}]
                </span>
                <span className="ml-2 text-text-dim">
                  ({heatPlotData.grid[hoveredHeatCell.row][hoveredHeatCell.col].count} works &bull;{' '}
                  {heatPlotData.grid[hoveredHeatCell.row][hoveredHeatCell.col].percentage}% of total)
                </span>
              </div>
              <div>
                {heatPlotData.grid[hoveredHeatCell.row][hoveredHeatCell.col].isNormalState ? (
                  <span className="text-emerald-800 font-semibold px-2 py-0.5 bg-emerald-50 border border-emerald-200">
                    ✓ High-Density Normal State Zone
                  </span>
                ) : (
                  <span className="text-risk-high font-bold px-2 py-0.5 bg-red-50 border border-red-200">
                    ⚠ Anomalous Quadrant (Delayed & Outlier Sanctions)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cross-Sector Baseline Comparison Strip */}
      <div className="pt-3 border-t border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] font-semibold uppercase text-text-dim">
            Cross-Sector Normal State vs Anomaly Thresholds
          </span>
          <span className="text-[10px] font-mono text-text-dim">
            Baseline: MoSPI Sectoral Median &bull; Threshold: 2.2x Anomaly Multiplier
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[11px]">
          {categoryBenchmarks.map((bm, i) => (
            <div key={i} className="p-2 bg-paper border border-border-subtle rounded-xs">
              <div className="font-sans font-semibold text-text-main truncate text-xs" title={bm.category}>
                {bm.category}
              </div>
              <div className="mt-1.5 space-y-0.5 text-[10px]">
                <div className="flex justify-between text-emerald-800">
                  <span>Normal:</span>
                  <span className="font-semibold">{formatINR(bm.median)}</span>
                </div>
                <div className="flex justify-between text-risk-high font-semibold">
                  <span>Anomaly &gt;:</span>
                  <span>{formatINR(bm.criticalThreshold)}</span>
                </div>
              </div>
              <div className="mt-1.5 text-[9px] text-text-dim border-t border-slate-200 pt-0.5 flex justify-between">
                <span>Tolerance:</span>
                <span>+{Math.round(((bm.criticalThreshold - bm.median) / bm.median) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
