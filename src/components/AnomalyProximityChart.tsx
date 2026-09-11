'use client';

import React, { useMemo } from 'react';
import { CanonicalWorkRecord } from '../types';
import {
  computeCategoryBenchmarks,
  computeRecordDistances,
} from '../utils/anomalyEngine';

function formatINR(val: number): string {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

interface AnomalyProximityChartProps {
  record: CanonicalWorkRecord;
  allRecords: CanonicalWorkRecord[];
}

export const AnomalyProximityChart: React.FC<AnomalyProximityChartProps> = ({
  record,
  allRecords,
}) => {
  const benchmarks = useMemo(() => {
    return computeCategoryBenchmarks(allRecords);
  }, [allRecords]);

  const distances = useMemo(() => {
    return computeRecordDistances(record, benchmarks);
  }, [record, benchmarks]);

  const { cost, timeline, duplicate, overrun } = distances;

  // Scale calculations for Cost Bullet Chart
  // Max scale is 2.8x median or current cost, whichever is higher
  const costScaleMax = Math.max(cost.criticalThreshold * 1.25, cost.current * 1.15, cost.median * 2.8);
  const getCostPercent = (val: number) => Math.min(100, Math.max(0, (val / costScaleMax) * 100));

  const normalPct = getCostPercent(cost.median);
  const warningPct = getCostPercent(cost.warningThreshold);
  const criticalPct = getCostPercent(cost.criticalThreshold);
  const currentCostPct = getCostPercent(cost.current);

  // Timeline Scale (0 to 450 days)
  const timelineScaleMax = Math.max(450, timeline.elapsedDays * 1.15);
  const getTimelinePercent = (days: number) => Math.min(100, Math.max(0, (days / timelineScaleMax) * 100));
  const sla180Pct = getTimelinePercent(180);
  const sla365Pct = getTimelinePercent(365);
  const currentDaysPct = getTimelinePercent(timeline.elapsedDays);

  // Category peer population distribution histogram & heat strip
  const categoryHistogram = useMemo(() => {
    const cat = record.workCategory || 'General';
    const peerAmounts = allRecords
      .filter((r) => (r.workCategory || 'General') === cat && r.sanctionAmount > 0)
      .map((r) => r.sanctionAmount)
      .sort((a, b) => a - b);

    if (peerAmounts.length < 3) return null;

    const bm = benchmarks[cat];
    const median = bm ? bm.median : 500000;
    const critical = bm ? bm.criticalThreshold : 1100000;
    const warning = bm ? bm.warningThreshold : median * 1.55;

    const maxVal = Math.max(critical * 1.35, record.sanctionAmount * 1.12);
    const binCount = 8;
    const binStep = maxVal / binCount;

    const bins = Array.from({ length: binCount }).map((_, i) => {
      const min = i * binStep;
      const max = (i + 1) * binStep;
      const count = peerAmounts.filter((v) => v >= min && (i === binCount - 1 ? v <= max : v < max)).length;
      const isCurrentRecordBin =
        record.sanctionAmount >= min &&
        (i === binCount - 1 ? record.sanctionAmount <= max : record.sanctionAmount < max);

      const midVal = (min + max) / 2;
      let heatBg = '#DCFCE7'; // Cool emerald (Normal)
      let heatBorder = '#86EFAC';
      let heatText = 'text-emerald-900';

      if (midVal >= critical) {
        heatBg = '#FEE2E2'; // Hot Crimson (Anomaly)
        heatBorder = '#FCA5A5';
        heatText = 'text-red-950';
      } else if (midVal >= warning) {
        heatBg = '#FFEDD5'; // Warm Orange (Warning)
        heatBorder = '#FDBA74';
        heatText = 'text-orange-950';
      } else if (midVal >= median) {
        heatBg = '#FEF9C3'; // Yellow (Elevated)
        heatBorder = '#FDE047';
        heatText = 'text-amber-950';
      }

      return {
        idx: i,
        min,
        max,
        count,
        isCurrentRecordBin,
        heatBg,
        heatBorder,
        heatText,
      };
    });

    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    const rank = peerAmounts.filter((v) => v <= record.sanctionAmount).length;
    const percentile = Math.round((rank / peerAmounts.length) * 100);

    return {
      catName: cat,
      totalPeers: peerAmounts.length,
      bins,
      maxCount,
      percentile,
    };
  }, [allRecords, record, benchmarks]);

  return (
    <div className="bg-surface-card border border-border-subtle p-3.5 rounded-xs space-y-4 text-xs">
      {/* Header */}
      <div className="border-b border-border-subtle pb-2 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold block">
            Baseline Proximity & Deviation Telemetry
          </span>
          <span className="text-[10px] text-text-muted">
            Measurement against statutory normal state of affairs & vigilance thresholds
          </span>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 border border-slate-300 text-slate-700">
          CAT: {record.workCategory || 'General'}
        </span>
      </div>

      {/* -------------------------------------------------------------
          CHART 1: Cost Deviation & Anomaly Distance Range Gauge
          ------------------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-text-main font-mono text-xs">
              1. Sanctioned Cost vs Category Normal Baseline
            </span>
          </div>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.2 border font-bold ${
              cost.status === 'ANOMALY'
                ? 'bg-risk-high-bg text-risk-high border-risk-high-border'
                : cost.status === 'WARNING'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : cost.status === 'ELEVATED'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {cost.status === 'ANOMALY'
              ? `OUTLIER: +${Math.round((cost.ratioToMedian - 1) * 100)}% OVER MEDIAN`
              : cost.status === 'WARNING'
              ? `ELEVATED (+${Math.round((cost.ratioToMedian - 1) * 100)}%)`
              : cost.status === 'ELEVATED'
              ? 'NORMAL VARIANCE'
              : 'WITHIN NORMAL MEDIAN'}
          </span>
        </div>

        {/* Visual Bullet / Zone Bar */}
        <div className="relative pt-6 pb-2">
          {/* Target Value Pin Marker */}
          <div
            className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none transition-all duration-300"
            style={{ left: `${currentCostPct}%` }}
          >
            <span className="bg-slate-900 text-white font-mono text-[9px] px-1 py-0.2 rounded-xs font-semibold whitespace-nowrap shadow-sm">
              {formatINR(cost.current)}
            </span>
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-900" />
          </div>

          {/* Range Track */}
          <div className="h-4 w-full rounded-xs flex overflow-hidden border border-slate-300 relative">
            {/* Green Zone: Normal Baseline (0 to 1.0x Median) */}
            <div
              style={{ width: `${normalPct}%` }}
              className="bg-emerald-100 hover:bg-emerald-200 h-full transition-colors flex items-center justify-center text-[9px] font-mono text-emerald-900 font-semibold border-r border-emerald-400"
              title={`Normal Baseline Band: Up to ${formatINR(cost.median)}`}
            >
              Normal Baseline
            </div>

            {/* Light Yellow Zone: Elevated Band (1.0x to 1.55x Warning) */}
            <div
              style={{ width: `${warningPct - normalPct}%` }}
              className="bg-amber-100 hover:bg-amber-200 h-full transition-colors flex items-center justify-center text-[9px] font-mono text-amber-900 border-r border-amber-300"
              title={`Elevated Tolerance: ${formatINR(cost.median)} - ${formatINR(cost.warningThreshold)}`}
            >
              Tolerance
            </div>

            {/* Amber Zone: Warning Range (1.55x to 2.2x Outlier Limit) */}
            <div
              style={{ width: `${criticalPct - warningPct}%` }}
              className="bg-orange-100 hover:bg-orange-200 h-full transition-colors flex items-center justify-center text-[9px] font-mono text-orange-900 border-r border-orange-400"
              title={`Warning Range: ${formatINR(cost.warningThreshold)} - ${formatINR(cost.criticalThreshold)}`}
            >
              Warning
            </div>

            {/* Red Zone: Severe Anomaly Zone (>2.2x Median) */}
            <div
              style={{ width: `${100 - criticalPct}%` }}
              className="bg-red-200 hover:bg-red-300 h-full transition-colors flex items-center justify-center text-[9px] font-mono text-red-950 font-bold"
              title={`Critical Anomaly Breach: Above ${formatINR(cost.criticalThreshold)}`}
            >
              Anomaly Zone
            </div>

            {/* Record Marker Line inside track */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-black z-10 shadow-sm"
              style={{ left: `${currentCostPct}%` }}
            />
          </div>

          {/* Scale Legend Markers */}
          <div className="relative mt-1 text-[9px] font-mono text-slate-500 h-3">
            <span className="absolute left-0">₹0</span>
            <span
              className="absolute transform -translate-x-1/2"
              style={{ left: `${normalPct}%` }}
            >
              Median: {formatINR(cost.median)}
            </span>
            <span
              className="absolute transform -translate-x-1/2 text-orange-800 font-medium"
              style={{ left: `${criticalPct}%` }}
            >
              Anomaly: {formatINR(cost.criticalThreshold)}
            </span>
          </div>
        </div>

        {/* Distance Interpretation Callout */}
        <div className="p-2 bg-paper border border-border-subtle rounded-xs text-[11px] font-mono flex items-center justify-between">
          <span className="text-text-muted">Proximity to Critical Anomaly Threshold:</span>
          {cost.headroomAmount >= 0 ? (
            <span className="text-emerald-800 font-semibold">
              ✓ {formatINR(cost.headroomAmount)} safety buffer remaining
            </span>
          ) : (
            <span className="text-risk-high font-bold">
              ⚠ Exceeded anomaly ceiling by {formatINR(Math.abs(cost.headroomAmount))}
            </span>
          )}
        </div>

        {/* Category Peer Population Histogram & Heat Strip */}
        {categoryHistogram && (
          <div className="mt-3 p-2.5 bg-paper border border-border-subtle rounded-xs space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-semibold text-text-main uppercase">
                Sector Peer Histogram & Heat Distribution ({categoryHistogram.totalPeers} {categoryHistogram.catName} Works)
              </span>
              <span className="px-1.5 py-0.2 bg-slate-900 text-white font-bold rounded-none">
                This Project: {categoryHistogram.percentile}th Percentile
              </span>
            </div>

            {/* Mini Histogram Bars with Heat Coloring */}
            <div className="h-16 flex items-end space-x-1 pt-4 pb-1">
              {categoryHistogram.bins.map((bin) => {
                const barHeight = Math.max(6, (bin.count / categoryHistogram.maxCount) * 44);
                return (
                  <div
                    key={bin.idx}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Active record pin indicator */}
                    {bin.isCurrentRecordBin && (
                      <div className="absolute -top-3.5 flex flex-col items-center z-10 animate-bounce">
                        <span className="text-[8px] font-mono font-bold bg-slate-900 text-white px-1 py-0.1">
                          HERE
                        </span>
                        <div className="w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-t-[3px] border-t-slate-900" />
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: bin.heatBg,
                        borderColor: bin.heatBorder,
                      }}
                      className={`w-full border rounded-xs transition-all ${
                        bin.isCurrentRecordBin ? 'ring-2 ring-slate-900 z-10' : ''
                      }`}
                      title={`Range: ${formatINR(bin.min)} - ${formatINR(bin.max)} (${bin.count} works)`}
                    />

                    {/* Count */}
                    <span className={`text-[8px] font-mono mt-0.5 ${bin.heatText}`}>
                      {bin.count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scale annotation */}
            <div className="flex justify-between text-[9px] font-mono text-slate-500 border-t border-slate-200 pt-1">
              <span>₹0</span>
              <span className="text-emerald-800">Normal Median Cluster</span>
              <span className="text-red-700">Anomalous Tail &gt;</span>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          CHART 2: Statutory Timeline & SLA Elapsed Meter
          ------------------------------------------------------------- */}
      <div className="space-y-1.5 pt-2 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-main font-mono text-xs">
            2. Project Execution Velocity vs Statutory Milestone SLA
          </span>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.2 border font-bold ${
              timeline.status === 'CRITICAL_BREACH'
                ? 'bg-risk-high-bg text-risk-high border-risk-high-border'
                : timeline.status === 'OVERDUE'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {timeline.elapsedDays} DAYS ELAPSED
          </span>
        </div>

        {/* Timeline Range Bar */}
        <div className="relative pt-6 pb-2">
          {/* Current elapsed days marker */}
          <div
            className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${currentDaysPct}%` }}
          >
            <span className="bg-slate-900 text-white font-mono text-[9px] px-1 py-0.2 rounded-xs font-semibold whitespace-nowrap shadow-sm">
              Day {timeline.elapsedDays}
            </span>
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-900" />
          </div>

          {/* Timeline Track */}
          <div className="h-4 w-full rounded-xs flex overflow-hidden border border-slate-300 relative">
            {/* Standard SLA Window (0 - 180 Days) */}
            <div
              style={{ width: `${sla180Pct}%` }}
              className="bg-emerald-100 h-full flex items-center justify-center text-[9px] font-mono text-emerald-900 font-semibold border-r border-emerald-400"
            >
              MoSPI 180-Day Normal SLA
            </div>

            {/* Extended Execution (180 - 365 Days) */}
            <div
              style={{ width: `${sla365Pct - sla180Pct}%` }}
              className="bg-amber-100 h-full flex items-center justify-center text-[9px] font-mono text-amber-900 border-r border-amber-400"
            >
              Delayed Window
            </div>

            {/* Critical SLA Breach (> 365 Days) */}
            <div
              style={{ width: `${100 - sla365Pct}%` }}
              className="bg-red-200 h-full flex items-center justify-center text-[9px] font-mono text-red-950 font-bold"
            >
              Critical SLA Breach
            </div>

            {/* Current marker line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-black z-10 shadow-sm"
              style={{ left: `${currentDaysPct}%` }}
            />
          </div>

          <div className="relative mt-1 text-[9px] font-mono text-slate-500 h-3">
            <span className="absolute left-0">Sanction Approved (Day 0)</span>
            <span
              className="absolute transform -translate-x-1/2 text-emerald-900 font-medium"
              style={{ left: `${sla180Pct}%` }}
            >
              180d SLA
            </span>
            <span
              className="absolute transform -translate-x-1/2 text-red-800 font-medium"
              style={{ left: `${sla365Pct}%` }}
            >
              365d Breach
            </span>
          </div>
        </div>

        {/* Distance Interpretation Callout */}
        <div className="p-2 bg-paper border border-border-subtle rounded-xs text-[11px] font-mono flex items-center justify-between">
          <span className="text-text-muted">Distance to Standard SLA Expiry:</span>
          {timeline.headroomDays >= 0 ? (
            <span className="text-emerald-800 font-semibold">
              ✓ {timeline.headroomDays} days remaining before statutory SLA deadline
            </span>
          ) : (
            <span className="text-risk-high font-bold">
              ⚠ Project is {Math.abs(timeline.headroomDays)} days overdue past standard milestone
            </span>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CHART 3: Dual Metric Strip: Overrun vs Text Redundancy
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
        {/* Metric 3A: Fiscal Ceiling Discipline */}
        <div className="p-2.5 bg-paper border border-border-subtle rounded-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="font-semibold text-text-main">3. Fiscal Ceiling Barrier</span>
            <span className={overrun.status === 'OVERRUN' ? 'text-risk-high font-bold' : 'text-emerald-800 font-bold'}>
              {overrun.sanctioned > 0
                ? `${((overrun.disbursed / overrun.sanctioned) * 100).toFixed(1)}% Spent`
                : 'N/A'}
            </span>
          </div>

          {/* Overrun progress bar */}
          <div className="h-2.5 w-full bg-slate-200 rounded-none overflow-hidden relative">
            <div
              className={`h-full ${overrun.status === 'OVERRUN' ? 'bg-risk-high' : 'bg-gov-navy'}`}
              style={{
                width: `${Math.min(
                  100,
                  overrun.sanctioned > 0 ? (overrun.disbursed / overrun.sanctioned) * 100 : 0
                )}%`,
              }}
            />
            {/* 100% boundary marker */}
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-red-600" title="100% Approved Ceiling" />
          </div>

          <div className="text-[10px] font-mono text-text-muted flex justify-between">
            <span>Normal: Disbursed ≤ Sanction</span>
            <span className={overrun.overrunAmount > 0 ? 'text-risk-high font-bold' : 'text-slate-600'}>
              {overrun.overrunAmount > 0 ? `+${formatINR(overrun.overrunAmount)} Overrun` : '0 Variance'}
            </span>
          </div>
        </div>

        {/* Metric 3B: Duplicate Work Lexical Overlap */}
        <div className="p-2.5 bg-paper border border-border-subtle rounded-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="font-semibold text-text-main">4. Lexical Similarity Overlap</span>
            <span
              className={`font-bold ${
                duplicate.status === 'ANOMALY'
                  ? 'text-risk-high'
                  : duplicate.status === 'WARNING'
                  ? 'text-amber-800'
                  : 'text-emerald-800'
              }`}
            >
              {Math.round(duplicate.maxSimilarity * 100)}% Sim
            </span>
          </div>

          {/* Similarity bar */}
          <div className="h-2.5 w-full bg-slate-200 rounded-none flex overflow-hidden">
            <div style={{ width: '40%' }} className="bg-emerald-200" title="Normal: <40%" />
            <div style={{ width: '15%' }} className="bg-amber-200" title="Elevated: 40-55%" />
            <div style={{ width: '17%' }} className="bg-orange-300" title="Warning: 55-72%" />
            <div style={{ width: '28%' }} className="bg-red-300" title="Anomaly: >72%" />
          </div>

          <div className="text-[10px] font-mono text-text-muted flex justify-between">
            <span>Threshold: &lt;40% Unique</span>
            <span>
              {duplicate.maxSimilarity < 0.4
                ? '✓ Distinct Work Scope'
                : duplicate.maxSimilarity < 0.72
                ? '⚠ Redundant Scope'
                : '🚨 Duplicate Risk'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
