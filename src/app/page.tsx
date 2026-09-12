'use client';

import React from 'react';
import { DatasetProvider, useDataset } from '../context/DatasetContext';
import { OperationalHeader } from '../components/OperationalHeader';
import { MetricTicker } from '../components/MetricTicker';
import { DenseAnomalyTable } from '../components/DenseAnomalyTable';
import { SplitWorkInspector } from '../components/SplitWorkInspector';
import { AnalyticsMatrix } from '../components/AnalyticsMatrix';
import { ComplianceReporting } from '../components/ComplianceReporting';
import { ColumnMappingModal } from '../components/ColumnMappingModal';
import { EmptyDatasetState } from '../components/EmptyDatasetState';

function WorkstationCore() {
  const { records, activeTab, setActiveTab } = useDataset();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-paper">
      <OperationalHeader />

      {records.length === 0 ? (
        <EmptyDatasetState />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MetricTicker />

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'DASHBOARD' && (
              <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
                <DenseAnomalyTable setActiveTab={setActiveTab} />
              </div>
            )}

            {activeTab === 'ANOMALIES' && (
              <div className="flex-1 flex flex-col min-h-0">
                <DenseAnomalyTable setActiveTab={setActiveTab} />
              </div>
            )}

            {activeTab === 'INSPECTOR' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-paper">
                <div className="flex items-center justify-between px-4 py-2 bg-surface-card border-b border-border-subtle">
                  <button
                    onClick={() => setActiveTab('DASHBOARD')}
                    className="px-3 py-1.5 bg-surface-card border border-border-subtle text-text-muted text-xs font-mono rounded-xs hover:bg-slate-100"
                  >
                    &larr; Back to Executive Dashboard
                  </button>
                  <span className="font-mono text-xs font-bold text-text-main">
                    ACTIVE AUDIT DOSSIER
                  </span>
                </div>
                <SplitWorkInspector />
              </div>
            )}

            {activeTab === 'ANALYTICS' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnalyticsMatrix />
              </div>
            )}

            {activeTab === 'COMPLIANCE' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <ComplianceReporting />
              </div>
            )}
          </main>
        </div>
      )}

      <ColumnMappingModal />
    </div>
  );
}

export default function Home() {
  return (
    <DatasetProvider>
      <WorkstationCore />
    </DatasetProvider>
  );
}
