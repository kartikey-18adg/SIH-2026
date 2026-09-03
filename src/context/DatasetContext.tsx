'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  CanonicalWorkRecord,
  ColumnMapping,
  DatasetSummary,
  ActiveTab,
  WorkspaceView,
  AuditActionStatus,
  AuditNote,
  RiskLevel,
} from '../types';
import {
  RawParseResult,
  parseCSV,
  parseExcel,
  parseJSON,
  applyColumnMapping,
} from '../utils/dataParser';
import { runAnomalyDetection } from '../utils/anomalyEngine';

interface DatasetContextType {
  records: CanonicalWorkRecord[];
  summary: DatasetSummary | null;
  isLoading: boolean;
  error: string | null;

  // Modals & Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeWorkspace: WorkspaceView;
  setActiveWorkspace: (ws: WorkspaceView) => void;
  selectedRecord: CanonicalWorkRecord | null;
  setSelectedRecord: (r: CanonicalWorkRecord | null) => void;

  // Ingestion & Mapping Modal
  isMappingModalOpen: boolean;
  setIsMappingModalOpen: (open: boolean) => void;
  rawParseResult: RawParseResult | null;
  columnMapping: ColumnMapping;
  setColumnMapping: React.Dispatch<React.SetStateAction<ColumnMapping>>;
  applyMapping: (customMapping: ColumnMapping) => void;

  // Filtering & Sorting
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  riskFilter: 'ALL' | RiskLevel;
  setRiskFilter: (rf: 'ALL' | RiskLevel) => void;
  anomalyFilter: string;
  setAnomalyFilter: (af: string) => void;
  stateFilter: string;
  setStateFilter: (s: string) => void;
  constituencyFilter: string;
  setConstituencyFilter: (c: string) => void;
  filteredRecords: CanonicalWorkRecord[];

  // Auditor Actions
  updateRecordStatus: (id: string, status: AuditActionStatus, remarks?: string) => void;
  addRecordNote: (id: string, noteText: string) => void;

  // Data Actions
  handleFileUpload: (file: File) => Promise<void>;
  loadOfficialDataset: () => Promise<void>;
  clearDataset: () => void;
  exportCSV: () => void;
  exportJSON: () => void;
}

const defaultMapping: ColumnMapping = {
  id: '',
  workCategory: '',
  workTitle: '',
  state: '',
  ida: '',
  mpName: '',
  constituency: '',
  workDescription: '',
  recommendedDate: '',
  sanctionDate: '',
  sanctionAmount: '',
  disbursedAmount: '',
  vendorName: '',
  expenditureDate: '',
  status: '',
};

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<CanonicalWorkRecord[]>([]);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView>('MINISTRY_AUDIT');
  const [selectedRecord, setSelectedRecord] = useState<CanonicalWorkRecord | null>(null);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [rawParseResult, setRawParseResult] = useState<RawParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(defaultMapping);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [anomalyFilter, setAnomalyFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [constituencyFilter, setConstituencyFilter] = useState('ALL');

  // Compute dataset summary metrics
  const recalculateSummary = useCallback(
    (recs: CanonicalWorkRecord[], fileName: string, fileSize: string) => {
      let sancTotal = 0;
      let disbTotal = 0;
      let highCount = 0;
      let medCount = 0;
      let lowCount = 0;
      let flaggedCount = 0;
      let overrunRiskTotal = 0;

      recs.forEach((r) => {
        sancTotal += r.sanctionAmount || 0;
        disbTotal += r.disbursedAmount || 0;
        if (r.riskLevel === 'HIGH') highCount++;
        else if (r.riskLevel === 'MEDIUM') medCount++;
        else lowCount++;

        if (r.triggeredRules.length > 0) flaggedCount++;
        overrunRiskTotal += r.estimatedOverrunRisk || 0;
      });

      setSummary({
        fileName,
        fileSize,
        totalRecords: recs.length,
        sanctionedTotal: sancTotal,
        disbursedTotal: disbTotal,
        highRiskCount: highCount,
        mediumRiskCount: medCount,
        lowRiskCount: lowCount,
        totalFlagged: flaggedCount,
        totalEstimatedOverrun: overrunRiskTotal,
        loadedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    },
    []
  );

  // Apply column mapping and execute anomaly detection engine
  const applyMapping = useCallback(
    (customMapping: ColumnMapping) => {
      if (!rawParseResult) return;
      setIsLoading(true);
      setError(null);
      try {
        const canonicalRows = applyColumnMapping(rawParseResult.rawRows, customMapping);
        const evaluated = runAnomalyDetection(canonicalRows);
        setRecords(evaluated);
        recalculateSummary(evaluated, rawParseResult.fileName, rawParseResult.fileSize);
        setIsMappingModalOpen(false);
        if (evaluated.length > 0) {
          setSelectedRecord(evaluated[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Error processing records with selected mapping');
      } finally {
        setIsLoading(false);
      }
    },
    [rawParseResult, recalculateSummary]
  );

  // Parse file and open column mapping modal
  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parseRes: RawParseResult;

      if (ext === 'xlsx' || ext === 'xls') {
        parseRes = await parseExcel(file);
      } else if (ext === 'json') {
        const text = await file.text();
        parseRes = parseJSON(text, file.name, (file.size / 1024).toFixed(1) + ' KB');
      } else {
        parseRes = await parseCSV(file);
      }

      setRawParseResult(parseRes);
      setColumnMapping(parseRes.detectedMapping);
      setIsMappingModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // One-click load of official MoSPI dataset
  const loadOfficialDataset = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/data/official_mospi_mplads.json');
      if (!res.ok) {
        throw new Error(`Failed to load dataset: ${res.statusText}`);
      }
      const rawJson = await res.json();
      const evaluated = runAnomalyDetection(rawJson);
      setRecords(evaluated);
      recalculateSummary(evaluated, 'official_mospi_mplads.json (GoI MoSPI)', '3.4 MB');
      if (evaluated.length > 0) {
        setSelectedRecord(evaluated[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load official MoSPI dataset');
    } finally {
      setIsLoading(false);
    }
  }, [recalculateSummary]);

  const clearDataset = useCallback(() => {
    setRecords([]);
    setSummary(null);
    setSelectedRecord(null);
    setRawParseResult(null);
    setSearchQuery('');
  }, []);

  // Update auditor status for a specific record
  const updateRecordStatus = useCallback(
    (id: string, status: AuditActionStatus, remarks?: string) => {
      setRecords((prev) =>
        prev.map((rec) => {
          if (rec.id === id) {
            const newNote: AuditNote = {
              id: String(Date.now()),
              timestamp: new Date().toISOString(),
              officerName: 'Senior Audit Officer (MoSPI Central)',
              officerRole: 'Statutory Vigilance Inspection',
              actionTaken: status,
              noteText: remarks || `Action recorded: ${status}`,
            };
            const updated = {
              ...rec,
              auditStatus: status,
              auditorRemarks: remarks || rec.auditorRemarks,
              auditNotes: [newNote, ...rec.auditNotes],
            };
            if (selectedRecord?.id === id) {
              setSelectedRecord(updated);
            }
            return updated;
          }
          return rec;
        })
      );
    },
    [selectedRecord]
  );

  // Add notes to an audited record
  const addRecordNote = useCallback(
    (id: string, noteText: string) => {
      if (!noteText.trim()) return;
      setRecords((prev) =>
        prev.map((rec) => {
          if (rec.id === id) {
            const note: AuditNote = {
              id: String(Date.now()),
              timestamp: new Date().toISOString(),
              officerName: 'Senior Audit Officer (MoSPI Central)',
              officerRole: 'Statutory Vigilance Inspection',
              actionTaken: rec.auditStatus,
              noteText: noteText.trim(),
            };
            const updated = {
              ...rec,
              auditNotes: [note, ...rec.auditNotes],
            };
            if (selectedRecord?.id === id) {
              setSelectedRecord(updated);
            }
            return updated;
          }
          return rec;
        })
      );
    },
    [selectedRecord]
  );

  // Filtered and searched records memo
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Risk filter
      if (riskFilter !== 'ALL' && r.riskLevel !== riskFilter) {
        return false;
      }

      // Anomaly type filter
      if (anomalyFilter !== 'ALL') {
        const hasRule = r.triggeredRules.some((rule) => rule.ruleId === anomalyFilter);
        if (!hasRule) return false;
      }

      // State filter
      if (stateFilter !== 'ALL' && r.state.toLowerCase() !== stateFilter.toLowerCase()) {
        return false;
      }

      // Constituency filter
      if (constituencyFilter !== 'ALL' && r.constituency.toLowerCase() !== constituencyFilter.toLowerCase()) {
        return false;
      }

      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = r.id.toLowerCase().includes(q);
        const matchDesc = r.workDescription.toLowerCase().includes(q);
        const matchTitle = r.workTitle.toLowerCase().includes(q);
        const matchAgency = r.ida.toLowerCase().includes(q);
        const matchVendor = r.vendorName.toLowerCase().includes(q);
        const matchMp = r.mpName.toLowerCase().includes(q);
        const matchConst = r.constituency.toLowerCase().includes(q);
        if (!matchId && !matchDesc && !matchTitle && !matchAgency && !matchVendor && !matchMp && !matchConst) {
          return false;
        }
      }

      return true;
    });
  }, [records, riskFilter, anomalyFilter, stateFilter, constituencyFilter, searchQuery]);

  // Export filtered dataset as CSV
  const exportCSV = useCallback(() => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Work ID',
      'Risk Score',
      'Risk Level',
      'Work Category',
      'State',
      'Constituency',
      'IDA (Nodal Agency)',
      'Vendor Name',
      'Honble MP',
      'Sanction Date',
      'Sanction Amount (INR)',
      'Disbursed Amount (INR)',
      'Estimated Overrun (INR)',
      'Audit Status',
      'Work Description',
      'Triggered Anomaly Rules',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.id.replace(/"/g, '""')}"`,
      r.riskScore,
      r.riskLevel,
      `"${r.workCategory.replace(/"/g, '""')}"`,
      `"${r.state.replace(/"/g, '""')}"`,
      `"${r.constituency.replace(/"/g, '""')}"`,
      `"${r.ida.replace(/"/g, '""')}"`,
      `"${r.vendorName.replace(/"/g, '""')}"`,
      `"${r.mpName.replace(/"/g, '""')}"`,
      `"${r.sanctionDate.replace(/"/g, '""')}"`,
      r.sanctionAmount,
      r.disbursedAmount,
      r.estimatedOverrunRisk,
      r.auditStatus,
      `"${r.workDescription.replace(/"/g, '""')}"`,
      `"${r.triggeredRules.map((t) => t.ruleName).join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MPLAD_Audit_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRecords]);

  // Export filtered dataset as JSON
  const exportJSON = useCallback(() => {
    if (filteredRecords.length === 0) return;
    const jsonStr = JSON.stringify(filteredRecords, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MPLAD_Audit_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRecords]);

  return (
    <DatasetContext.Provider
      value={{
        records,
        summary,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        activeWorkspace,
        setActiveWorkspace,
        selectedRecord,
        setSelectedRecord,
        isMappingModalOpen,
        setIsMappingModalOpen,
        rawParseResult,
        columnMapping,
        setColumnMapping,
        applyMapping,
        searchQuery,
        setSearchQuery,
        riskFilter,
        setRiskFilter,
        anomalyFilter,
        setAnomalyFilter,
        stateFilter,
        setStateFilter,
        constituencyFilter,
        setConstituencyFilter,
        filteredRecords,
        updateRecordStatus,
        addRecordNote,
        handleFileUpload,
        loadOfficialDataset,
        clearDataset,
        exportCSV,
        exportJSON,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export function useDataset(): DatasetContextType {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
