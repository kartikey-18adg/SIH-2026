'use client';

import React, { useState, useMemo } from 'react';
import { useDataset } from '../context/DatasetContext';
import { ActiveTab, CanonicalWorkRecord, RiskLevel, AuditActionStatus } from '../types';

interface DenseAnomalyTableProps {
  setActiveTab: (tab: ActiveTab) => void;
}

function formatAmount(val: number): string {
  if (!val || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-IN');
}

export const DenseAnomalyTable: React.FC<DenseAnomalyTableProps> = ({ setActiveTab }) => {
  const {
    filteredRecords,
    selectedRecord,
    setSelectedRecord,
    searchQuery,
    setSearchQuery,
    riskFilter,
    setRiskFilter,
    anomalyFilter,
    setAnomalyFilter,
    updateRecordStatus,
    summary,
  } = useDataset();

  // Sorting
  const [sortField, setSortField] = useState<'id' | 'sanctionAmount' | 'disbursedAmount' | 'riskScore'>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Handle Sort Toggle
  const handleSort = (field: 'id' | 'sanctionAmount' | 'disbursedAmount' | 'riskScore') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  // Sorted Records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortDir]);

  // Paginated View
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageRecords = sortedRecords.slice(pageStart, pageStart + pageSize);

  const handleRowClick = (rec: CanonicalWorkRecord) => {
    setSelectedRecord(rec);
    setActiveTab('INSPECTOR');
  };

  const handleRowDoubleClick = (rec: CanonicalWorkRecord) => {
    setSelectedRecord(rec);
    setActiveTab('INSPECTOR');
  };

  return (
    <div className="flex min-w-0 flex-col h-full bg-paper text-text-main">
      {/* Controls & Filter Toolbar */}
      <div className="p-3 bg-surface-card border-b border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Bar */}
        <div className="flex items-center space-x-2 flex-1 min-w-[280px] max-w-lg">
          <span className="text-text-muted font-mono font-medium">FILTER:</span>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search Work ID, District, Agency, Vendor, MP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-paper border border-border-subtle px-2.5 py-1.5 text-xs font-mono text-text-main placeholder-slate-400 rounded-xs focus:outline-none focus:border-border-dark"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 font-mono text-[10px]"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Anomaly Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          <span className="text-text-muted font-medium mr-1">Anomaly Type:</span>
          {[
            { id: 'ALL', label: 'All Cases' },
            { id: 'DUPLICATE_WORK', label: 'Duplicate Risk' },
            { id: 'COST_INFLATION', label: 'Cost Inflation' },
            { id: 'EXECUTION_DELAY', label: 'SLA Delay' },
            { id: 'SPLIT_BILL_EVASION', label: 'Split-Bill Evasion' },
            { id: 'DISCREPANCY_OVERRUN', label: 'Cost Overrun' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setAnomalyFilter(item.id);
                setCurrentPage(1);
              }}
              className={`px-2 py-1 text-[11px] font-medium border rounded-xs whitespace-nowrap ${
                anomalyFilter === item.id
                  ? 'bg-gov-navy text-white border-gov-navy font-semibold'
                  : 'bg-surface-subtle text-text-muted border-border-subtle hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Risk Level Selector */}
        <div className="flex items-center space-x-1">
          <span className="text-text-muted font-medium mr-1">Risk Grade:</span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'HIGH', label: 'High (>80)', color: 'text-risk-high' },
            { id: 'MEDIUM', label: 'Med (50-79)', color: 'text-risk-medium' },
            { id: 'LOW', label: 'Low (<50)', color: 'text-risk-low' },
          ].map((rf) => (
            <button
              key={rf.id}
              onClick={() => {
                setRiskFilter(rf.id as any);
                setCurrentPage(1);
              }}
              className={`px-2 py-1 text-[11px] font-mono border rounded-xs ${
                riskFilter === rf.id
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-surface-card text-text-muted border-border-subtle hover:bg-slate-100'
              }`}
            >
              {rf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Table Count Status Bar */}
      <div className="px-4 py-1.5 bg-surface-subtle border-b border-border-subtle flex items-center justify-between text-[11px] text-text-muted font-mono">
        <div>
          Showing {pageRecords.length} of {sortedRecords.length} records{' '}
          {filteredRecords.length !== summary?.totalRecords && `(Filtered from ${summary?.totalRecords})`}
        </div>
        <div className="flex items-center space-x-3">
          <span>Click row to inspect | Double click to open full Inspector Desk</span>
          <div className="flex items-center space-x-1">
            <span>Per Page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Rows per page"
              className="bg-surface-card border border-border-subtle px-1 py-0.5 text-[11px] font-mono"
            >
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main High-Density Table */}
      <div className="flex-1 min-w-0 overflow-auto bg-surface-card">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-paper text-[11px] text-text-dim font-medium tracking-wide sticky top-0 z-10">
              <th
                onClick={() => handleSort('id')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/50 w-[140px]"
              >
                <div className="flex items-center space-x-1">
                  <span>WORK ID</span>
                  {sortField === 'id' && <span>{sortDir === 'asc' ? '^' : 'v'}</span>}
                </div>
              </th>
              <th className="py-2 px-3 w-[150px]">CONSTITUENCY / STATE</th>
              <th className="py-2 px-3 min-w-[240px]">WORK DESCRIPTION</th>
              <th
                onClick={() => handleSort('sanctionAmount')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/50 w-[140px]"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>SANCTIONED (INR)</span>
                  {sortField === 'sanctionAmount' && <span>{sortDir === 'asc' ? '^' : 'v'}</span>}
                </div>
              </th>
              <th
                onClick={() => handleSort('disbursedAmount')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/50 w-[130px]"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>DISBURSED (INR)</span>
                  {sortField === 'disbursedAmount' && <span>{sortDir === 'asc' ? '^' : 'v'}</span>}
                </div>
              </th>
              <th className="py-2 px-3 w-[190px]">TRIGGERED ANOMALIES</th>
              <th
                onClick={() => handleSort('riskScore')}
                className="py-2 px-3 text-center cursor-pointer hover:bg-slate-200/50 w-[95px]"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>RISK SCORE</span>
                  {sortField === 'riskScore' && <span>{sortDir === 'asc' ? '^' : 'v'}</span>}
                </div>
              </th>
              <th className="py-2 px-3 w-[170px]">NODAL AGENCY / VENDOR</th>
              <th className="py-2 px-3 text-center w-[120px]">AUDIT STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {pageRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-text-muted font-mono">
                  No records match current filter criteria.
                </td>
              </tr>
            ) : (
              pageRecords.map((rec) => {
                const isSelected = selectedRecord?.id === rec.id;
                
                // Risk Badge Styling
                let riskBadgeClass = 'bg-risk-low-bg text-risk-low border-risk-low-border';
                if (rec.riskLevel === 'HIGH') {
                  riskBadgeClass = 'bg-risk-high-bg text-risk-high border-risk-high-border font-bold';
                } else if (rec.riskLevel === 'MEDIUM') {
                  riskBadgeClass = 'bg-risk-medium-bg text-risk-medium border-risk-medium-border font-semibold';
                }

                // Audit Status Styling
                let auditClass = 'bg-slate-100 text-slate-700 border-slate-300';
                if (rec.auditStatus === 'VERIFIED') {
                  auditClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                } else if (rec.auditStatus === 'FLAGGED_INSPECTION') {
                  auditClass = 'bg-amber-50 text-amber-900 border-amber-300';
                } else if (rec.auditStatus === 'PAYMENT_FROZEN') {
                  auditClass = 'bg-red-50 text-red-800 border-red-300 font-bold';
                }

                return (
                  <tr
                    key={rec.id}
                    onClick={() => handleRowClick(rec)}
                    onDoubleClick={() => handleRowDoubleClick(rec)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70 border-l-4 border-l-gov-navy'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Work ID */}
                    <td className="py-2 px-3 font-mono text-[11px] text-text-main font-semibold truncate">
                      {rec.id}
                    </td>

                    {/* Constituency / State */}
                    <td className="py-2 px-3 text-[11px] text-text-main">
                      <div className="font-medium truncate max-w-[140px]" title={rec.constituency}>
                        {rec.constituency || 'N/A'}
                      </div>
                      <div className="text-[10px] text-text-dim truncate max-w-[140px]" title={rec.state}>
                        {rec.state}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-2 px-3 text-[11px] text-text-main">
                      <div className="line-clamp-2 max-w-[360px]" title={rec.workDescription}>
                        {rec.workDescription || rec.workTitle || 'No description filed'}
                      </div>
                      <div className="text-[10px] text-text-dim mt-0.5 flex items-center space-x-2 font-mono">
                        <span>Cat: {rec.workCategory}</span>
                        {rec.sanctionDate && <span>| Sanc: {rec.sanctionDate}</span>}
                      </div>
                    </td>

                    {/* Sanctioned Amount */}
                    <td className="py-2 px-3 text-right font-mono text-[11px] text-text-main font-medium">
                      ₹{formatAmount(rec.sanctionAmount)}
                    </td>

                    {/* Disbursed Amount */}
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      <span className={rec.disbursedAmount > rec.sanctionAmount ? 'text-risk-high font-bold' : 'text-text-main'}>
                        ₹{formatAmount(rec.disbursedAmount)}
                      </span>
                    </td>

                    {/* Triggered Anomalies */}
                    <td className="py-2 px-3">
                      {rec.triggeredRules.length === 0 ? (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                          CLEARED
                        </span>
                      ) : (
                        <div className="flex flex-col space-y-1">
                          {rec.triggeredRules.slice(0, 2).map((trig, tIdx) => (
                            <div
                              key={tIdx}
                              className={`text-[10px] px-1.5 py-0.5 border font-mono truncate max-w-[180px] ${
                                trig.severity === 'HIGH'
                                  ? 'bg-risk-high-bg text-risk-high border-risk-high-border'
                                  : 'bg-risk-medium-bg text-risk-medium border-risk-medium-border'
                              }`}
                              title={`${trig.ruleName}: ${trig.description}`}
                            >
                              {trig.ruleName}
                            </div>
                          ))}
                          {rec.triggeredRules.length > 2 && (
                            <span className="text-[10px] text-text-dim font-mono">
                              +{rec.triggeredRules.length - 2} more triggers
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Risk Score */}
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-mono border rounded-xs ${riskBadgeClass}`}
                      >
                        {rec.riskScore}
                      </span>
                    </td>

                    {/* Implementing Agency / Vendor */}
                    <td className="py-2 px-3 text-[11px] text-text-muted">
                      <div className="truncate max-w-[160px] font-medium text-slate-800" title={rec.ida}>
                        {rec.ida || 'Unspecified Agency'}
                      </div>
                      {rec.vendorName && (
                        <div className="truncate max-w-[160px] text-[10px] text-text-dim font-mono" title={rec.vendorName}>
                          Vendor: {rec.vendorName}
                        </div>
                      )}
                    </td>

                    {/* Action / Audit Status */}
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono border rounded-xs uppercase ${auditClass}`}>
                        {rec.auditStatus.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Bar */}
      <div className="p-2.5 bg-surface-card border-t border-border-subtle flex items-center justify-between text-xs">
        <div className="text-text-muted font-mono text-[11px]">
          Page {currentPage} of {totalPages} ({sortedRecords.length} records total)
        </div>
        <div className="flex items-center space-x-1 font-mono text-[11px]">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-paper border border-border-subtle disabled:opacity-40 hover:bg-slate-100"
          >
            FIRST
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-paper border border-border-subtle disabled:opacity-40 hover:bg-slate-100"
          >
            PREV
          </button>
          <span className="px-2 py-1 font-semibold text-text-main">
            {currentPage}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 bg-paper border border-border-subtle disabled:opacity-40 hover:bg-slate-100"
          >
            NEXT
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 bg-paper border border-border-subtle disabled:opacity-40 hover:bg-slate-100"
          >
            LAST
          </button>
        </div>
      </div>
    </div>
  );
};
