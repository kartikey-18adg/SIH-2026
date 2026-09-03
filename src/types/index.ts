export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type AuditActionStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'FLAGGED_INSPECTION' | 'PAYMENT_FROZEN';

export interface AuditNote {
  id: string;
  timestamp: string;
  officerName: string;
  officerRole: string;
  actionTaken: AuditActionStatus;
  noteText: string;
}

export interface AnomalyTrigger {
  ruleId: 'DUPLICATE_WORK' | 'COST_INFLATION' | 'EXECUTION_DELAY' | 'SPLIT_BILL_EVASION' | 'DISCREPANCY_OVERRUN';
  ruleName: string;
  severity: RiskLevel;
  description: string;
  metricBenchmark: string;
  deviationValue: string;
  scoreImpact: number;
}

export interface CanonicalWorkRecord {
  id: string;
  srNo: string | number;
  workCategory: string;
  workTitle: string;
  state: string;
  ida: string;
  mpName: string;
  constituency: string;
  workDescription: string;
  recommendedDate: string;
  sanctionDate: string;
  sanctionAmount: number;
  disbursedAmount: number;
  vendorName: string;
  expenditureDate: string;
  status: string;
  
  // Computed anomaly fields
  riskScore: number;
  riskLevel: RiskLevel;
  triggeredRules: AnomalyTrigger[];
  estimatedOverrunRisk: number;
  
  // Auditor actions state
  auditStatus: AuditActionStatus;
  auditNotes: AuditNote[];
  auditorRemarks?: string;
  auditorTag?: string;

  // Raw original row
  rawRecord?: Record<string, any>;
}

export type WorkspaceView = 'MINISTRY_AUDIT' | 'DISTRICT_COLLECTORATE' | 'MP_CONSTITUENCY';

export type ActiveTab = 'DASHBOARD' | 'ANOMALIES' | 'INSPECTOR' | 'ANALYTICS' | 'COMPLIANCE';

export interface ColumnMapping {
  id: string;
  workCategory: string;
  workTitle: string;
  state: string;
  ida: string;
  mpName: string;
  constituency: string;
  workDescription: string;
  recommendedDate: string;
  sanctionDate: string;
  sanctionAmount: string;
  disbursedAmount: string;
  vendorName: string;
  expenditureDate: string;
  status: string;
}

export interface DatasetSummary {
  fileName: string;
  fileSize: string;
  totalRecords: number;
  sanctionedTotal: number;
  disbursedTotal: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalFlagged: number;
  totalEstimatedOverrun: number;
  loadedAt: string;
}
