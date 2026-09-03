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
  const { records, activeTab, selectedRecord, setActiveTab } = useDataset();

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
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                {/* High Density Table Section */}
                <div
                  className={`flex flex-col min-h-0 overflow-hidden transition-all ${
                    selectedRecord ? 'lg:col-span-7 border-r border-border-subtle' : 'lg:col-span-12'
                  }`}
                >
                  <DenseAnomalyTable />
                </div>

                {/* Right Drawer Inspector Desk Preview */}
                {selectedRecord && (
                  <div className="hidden lg:flex lg:col-span-5 flex-col min-h-0 overflow-hidden bg-surface-card">
                    <div className="p-2 bg-slate-100 border-b border-border-subtle flex items-center justify-between text-xs">
                      <span className="font-mono text-xs font-bold text-text-main">
                        ACTIVE AUDIT DOSSIER
                      </span>
                      <button
                        onClick={() => setActiveTab('INSPECTOR')}
                        className="px-2 py-0.5 bg-gov-navy text-white text-[11px] font-mono rounded-xs"
                      >
                        Maximize Inspector &gt;
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SplitWorkInspector record={selectedRecord} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ANOMALIES' && (
              <div className="flex-1 flex flex-col min-h-0">
                <DenseAnomalyTable />
              </div>
            )}

            {activeTab === 'INSPECTOR' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
