import { CanonicalWorkRecord, AnomalyTrigger, RiskLevel } from '../types';

// Helper: Tokenize text into normalized word set
function getTokens(text: string): Set<string> {
  const clean = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(clean);
}

// Helper: Jaccard similarity between two token sets
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Helper: Parse dates in DD-Mon-YYYY or YYYY-MM-DD format
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === 'N/A' || trimmed === '-') return null;

  // Check DD-Mon-YYYY (e.g. 09-Jul-2024)
  const dmyMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmyMatch) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(dmyMatch[1], 10);
    const month = months[dmyMatch[2].toLowerCase()];
    const year = parseInt(dmyMatch[3], 10);
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Standard ISO / JS date parsing fallback
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export interface CategoryBenchmark {
  category: string;
  count: number;
  median: number;
  q1: number;
  q3: number;
  warningThreshold: number; // 1.55x median
  criticalThreshold: number; // 2.2x median
}

export interface RecordAnomalyDistances {
  cost: {
    current: number;
    median: number;
    warningThreshold: number;
    criticalThreshold: number;
    ratioToMedian: number;
    status: 'NORMAL' | 'ELEVATED' | 'WARNING' | 'ANOMALY';
    headroomAmount: number; // positive = headroom under threshold, negative = amount over threshold
  };
  timeline: {
    sanctionDate: string;
    elapsedDays: number;
    standardSLA: number; // 180
    criticalSLA: number; // 365
    status: 'NORMAL' | 'PROLONGED' | 'OVERDUE' | 'CRITICAL_BREACH';
    headroomDays: number; // positive = days until SLA breach, negative = days past SLA
  };
  duplicate: {
    maxSimilarity: number;
    matchedId?: string;
    normalThreshold: number; // 0.40
    warningThreshold: number; // 0.55
    criticalThreshold: number; // 0.72
    status: 'NORMAL' | 'ELEVATED' | 'WARNING' | 'ANOMALY';
  };
  overrun: {
    sanctioned: number;
    disbursed: number;
    overrunAmount: number;
    status: 'CLEARED' | 'OVERRUN';
  };
}

export function runAnomalyDetection(
  records: Array<Omit<CanonicalWorkRecord, 'riskScore' | 'riskLevel' | 'triggeredRules' | 'estimatedOverrunRisk' | 'auditStatus' | 'auditNotes'>>
): CanonicalWorkRecord[] {
  if (!records || records.length === 0) return [];

  // Step 1: Pre-calculate category medians for Cost Inflation Rule
  const categoryAmounts: Record<string, number[]> = {};
  records.forEach((r) => {
    const cat = r.workCategory || 'General';
    if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
    if (r.sanctionAmount > 0) {
      categoryAmounts[cat].push(r.sanctionAmount);
    }
  });

  const categoryMedians: Record<string, number> = {};
  Object.keys(categoryAmounts).forEach((cat) => {
    const list = categoryAmounts[cat].sort((a, b) => a - b);
    if (list.length > 0) {
      const mid = Math.floor(list.length / 2);
      categoryMedians[cat] =
        list.length % 2 !== 0
          ? list[mid]
          : (list[mid - 1] + list[mid]) / 2;
    } else {
      categoryMedians[cat] = 500000; // 5 Lakh fallback
    }
  });

  // Step 2: Index records by district/constituency for duplicate detection
  const locationBuckets: Record<string, number[]> = {};
  const tokenCache: Array<Set<string>> = [];

  records.forEach((r, idx) => {
    const locKey = `${(r.state || '').trim().toLowerCase()}_${(r.constituency || r.ida || '').trim().toLowerCase()}`;
    if (!locationBuckets[locKey]) locationBuckets[locKey] = [];
    locationBuckets[locKey].push(idx);
    tokenCache[idx] = getTokens(r.workDescription || r.workTitle || '');
  });

  // Step 3: Index vendor sanctions by date window for split-bill evasion detection
  const vendorBuckets: Record<string, Array<{ idx: number; date: Date | null; amount: number }>> = {};
  records.forEach((r, idx) => {
    const vendor = (r.vendorName || r.ida || '').trim().toLowerCase();
    if (vendor && vendor !== 'n/a' && vendor !== '-') {
      if (!vendorBuckets[vendor]) vendorBuckets[vendor] = [];
      const d = parseDate(r.expenditureDate || r.sanctionDate);
      vendorBuckets[vendor].push({
        idx,
        date: d,
        amount: r.disbursedAmount > 0 ? r.disbursedAmount : r.sanctionAmount,
      });
    }
  });

  // Pre-calculate split-bill flags
  const splitBillFlags: Record<number, { count: number; totalAmt: number; windowDays: number }> = {};
  Object.entries(vendorBuckets).forEach(([, items]) => {
    if (items.length >= 2) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const itemA = items[i];
          const itemB = items[j];
          if (itemA.date && itemB.date) {
            const diffMs = Math.abs(itemA.date.getTime() - itemB.date.getTime());
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            // Same vendor within 45 days with sanctions below standard tender threshold (e.g. 10 Lakhs)
            if (diffDays <= 45 && itemA.amount < 1000000 && itemB.amount < 1000000) {
              splitBillFlags[itemA.idx] = {
                count: items.length,
                totalAmt: itemA.amount + itemB.amount,
                windowDays: diffDays,
              };
              splitBillFlags[itemB.idx] = {
                count: items.length,
                totalAmt: itemA.amount + itemB.amount,
                windowDays: diffDays,
              };
            }
          }
        }
      }
    }
  });

  // Step 4: Evaluate each record against all 5 rules
  const now = new Date(2026, 8, 3); // 03-Sep-2026 current baseline

  return records.map((r, idx) => {
    const triggers: AnomalyTrigger[] = [];
    let score = 5; // Institutional baseline audit floor

    // --- RULE 1: DUPLICATE WORK DETECTION ---
    const locKey = `${(r.state || '').trim().toLowerCase()}_${(r.constituency || r.ida || '').trim().toLowerCase()}`;
    const neighborIndices = locationBuckets[locKey] || [];
    const currentTokens = tokenCache[idx];

    let maxSimilarity = 0;
    let duplicateMatchId = '';

    for (const neighborIdx of neighborIndices) {
      if (neighborIdx !== idx) {
        const sim = jaccardSimilarity(currentTokens, tokenCache[neighborIdx]);
        if (sim > maxSimilarity) {
          maxSimilarity = sim;
          duplicateMatchId = records[neighborIdx].id;
        }
      }
    }

    if (maxSimilarity >= 0.72) {
      const simPercent = Math.round(maxSimilarity * 100);
      triggers.push({
        ruleId: 'DUPLICATE_WORK',
        ruleName: 'Duplicate Civil Work Risk',
        severity: 'HIGH',
        description: `High lexical similarity (${simPercent}%) with Work ID [${duplicateMatchId}] in identical administrative jurisdiction.`,
        metricBenchmark: 'Maximum permitted descriptor overlap: <40%',
        deviationValue: `+${simPercent - 40}% above similarity threshold`,
        scoreImpact: 42,
      });
      score += 42;
    } else if (maxSimilarity >= 0.55) {
      const simPercent = Math.round(maxSimilarity * 100);
      triggers.push({
        ruleId: 'DUPLICATE_WORK',
        ruleName: 'Potential Redundant Civil Work',
        severity: 'MEDIUM',
        description: `Moderate phrase and scope overlap (${simPercent}%) with existing project [${duplicateMatchId}].`,
        metricBenchmark: 'Jaccard similarity threshold: 50%',
        deviationValue: `+${simPercent - 50}% overlap`,
        scoreImpact: 22,
      });
      score += 22;
    }

    // --- RULE 2: COST INFLATION & BUDGET DEVIATION ---
    const cat = r.workCategory || 'General';
    const medianAmt = categoryMedians[cat] || 500000;
    if (r.sanctionAmount > 0 && medianAmt > 0) {
      const ratio = r.sanctionAmount / medianAmt;
      if (ratio >= 2.2) {
        const pctAbove = Math.round((ratio - 1) * 100);
        triggers.push({
          ruleId: 'COST_INFLATION',
          ruleName: 'Severe Budget Outlier',
          severity: 'HIGH',
          description: `Sanctioned amount (INR ${r.sanctionAmount.toLocaleString('en-IN')}) exceeds category median by +${pctAbove}%.`,
          metricBenchmark: `Category median: INR ${Math.round(medianAmt).toLocaleString('en-IN')}`,
          deviationValue: `+${pctAbove}% deviation`,
          scoreImpact: 38,
        });
        score += 38;
      } else if (ratio >= 1.55) {
        const pctAbove = Math.round((ratio - 1) * 100);
        triggers.push({
          ruleId: 'COST_INFLATION',
          ruleName: 'Cost Inflation Warning',
          severity: 'MEDIUM',
          description: `Sanctioned unit cost exceeds category baseline by +${pctAbove}%.`,
          metricBenchmark: `Category median: INR ${Math.round(medianAmt).toLocaleString('en-IN')}`,
          deviationValue: `+${pctAbove}% deviation`,
          scoreImpact: 24,
        });
        score += 24;
      }
    }

    // --- RULE 3: INEFFICIENCY & DELAY RULE ---
    const sanctionDate = parseDate(r.sanctionDate);
    const expenditureDate = parseDate(r.expenditureDate);
    const statusNormalized = (r.status || '').toLowerCase();

    if (sanctionDate) {
      const elapsedDays = Math.floor((now.getTime() - sanctionDate.getTime()) / (1000 * 60 * 60 * 24));
      const isPending =
        statusNormalized.includes('ongoing') ||
        statusNormalized.includes('sanction') ||
        statusNormalized.includes('inspection') ||
        statusNormalized.includes('in-progress') ||
        statusNormalized.includes('physical');

      if (isPending && elapsedDays > 365) {
        triggers.push({
          ruleId: 'EXECUTION_DELAY',
          ruleName: 'Critical SLA Breach (>365 Days)',
          severity: 'HIGH',
          description: `Work remained stalled or uncertified for ${elapsedDays} days since formal sanction approval.`,
          metricBenchmark: 'MoSPI statutory completion SLA: 180 days',
          deviationValue: `+${elapsedDays - 180} days overdue`,
          scoreImpact: 32,
        });
        score += 32;
      } else if (isPending && elapsedDays > 180) {
        triggers.push({
          ruleId: 'EXECUTION_DELAY',
          ruleName: 'Execution Delay Warning',
          severity: 'MEDIUM',
          description: `Project execution period (${elapsedDays} days) has exceeded the standard 180-day delivery threshold.`,
          metricBenchmark: 'Standard milestone SLA: 180 days',
          deviationValue: `+${elapsedDays - 180} days delay`,
          scoreImpact: 18,
        });
        score += 18;
      } else if (sanctionDate && expenditureDate) {
        const durationDays = Math.floor((expenditureDate.getTime() - sanctionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (durationDays > 240) {
          triggers.push({
            ruleId: 'EXECUTION_DELAY',
            ruleName: 'Extended Payment Gestation',
            severity: 'MEDIUM',
            description: `Gestation between sanction and payment release spanned ${durationDays} days.`,
            metricBenchmark: 'Expected release window: 90 days',
            deviationValue: `+${durationDays - 90} days lag`,
            scoreImpact: 14,
          });
          score += 14;
        }
      }
    }

    // --- RULE 4: SPLIT-BILL EVASION (TENDER SPLITTING) ---
    if (splitBillFlags[idx]) {
      const { count, windowDays } = splitBillFlags[idx];
      triggers.push({
        ruleId: 'SPLIT_BILL_EVASION',
        ruleName: 'Split-Bill Evasion Pattern',
        severity: 'HIGH',
        description: `Vendor/agency received ${count} distinct sanctions within a narrow ${windowDays}-day window beneath statutory e-tender thresholds.`,
        metricBenchmark: 'Single-source procurement threshold: INR 10,00,000',
        deviationValue: `${count} sanctions within ${windowDays} days`,
        scoreImpact: 36,
      });
      score += 36;
    }

    // --- RULE 5: COST OVERRUN / FISCAL DISCREPANCY ---
    let estimatedOverrun = 0;
    if (r.disbursedAmount > 0 && r.sanctionAmount > 0) {
      if (r.disbursedAmount > r.sanctionAmount) {
        estimatedOverrun = r.disbursedAmount - r.sanctionAmount;
        triggers.push({
          ruleId: 'DISCREPANCY_OVERRUN',
          ruleName: 'Unauthorized Financial Overrun',
          severity: 'HIGH',
          description: `Disbursed expenditure (INR ${r.disbursedAmount.toLocaleString('en-IN')}) exceeds approved sanction (INR ${r.sanctionAmount.toLocaleString('en-IN')}).`,
          metricBenchmark: 'Zero expenditure variance over approved limit',
          deviationValue: `INR +${estimatedOverrun.toLocaleString('en-IN')} overrun`,
          scoreImpact: 40,
        });
        score += 40;
      }
    }

    // Normalized composite score calculation
    const finalScore = Math.min(100, Math.max(0, score));
    let level: RiskLevel = 'LOW';
    if (finalScore >= 80) level = 'HIGH';
    else if (finalScore >= 50) level = 'MEDIUM';

    return {
      ...r,
      riskScore: finalScore,
      riskLevel: level,
      triggeredRules: triggers,
      estimatedOverrunRisk: estimatedOverrun,
      auditStatus: 'PENDING_REVIEW',
      auditNotes: [],
    };
  });
}

// Compute Category Benchmarks (median, quartiles, and thresholds) for all categories
export function computeCategoryBenchmarks(records: CanonicalWorkRecord[]): Record<string, CategoryBenchmark> {
  const categoryAmounts: Record<string, number[]> = {};

  records.forEach((r) => {
    const cat = r.workCategory || 'General';
    if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
    if (r.sanctionAmount > 0) {
      categoryAmounts[cat].push(r.sanctionAmount);
    }
  });

  const benchmarks: Record<string, CategoryBenchmark> = {};

  Object.entries(categoryAmounts).forEach(([cat, amounts]) => {
    const sorted = [...amounts].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) return;

    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const q1 = sorted[q1Idx] || median * 0.7;
    const q3 = sorted[q3Idx] || median * 1.3;

    benchmarks[cat] = {
      category: cat,
      count: n,
      median,
      q1,
      q3,
      warningThreshold: median * 1.55,
      criticalThreshold: median * 2.2,
    };
  });

  return benchmarks;
}

// Compute comprehensive distances to normal vs anomaly boundaries for a single record
export function computeRecordDistances(
  record: CanonicalWorkRecord,
  benchmarks: Record<string, CategoryBenchmark>
): RecordAnomalyDistances {
  const cat = record.workCategory || 'General';
  const bm = benchmarks[cat] || {
    category: cat,
    count: 1,
    median: 500000,
    q1: 300000,
    q3: 700000,
    warningThreshold: 775000,
    criticalThreshold: 1100000,
  };

  // Cost distance
  const currentCost = record.sanctionAmount || 0;
  const ratioToMedian = bm.median > 0 ? currentCost / bm.median : 1.0;
  let costStatus: 'NORMAL' | 'ELEVATED' | 'WARNING' | 'ANOMALY' = 'NORMAL';
  if (ratioToMedian >= 2.2) costStatus = 'ANOMALY';
  else if (ratioToMedian >= 1.55) costStatus = 'WARNING';
  else if (ratioToMedian >= 1.2) costStatus = 'ELEVATED';

  // Headroom: positive if under critical threshold, negative if exceeded
  const costHeadroom = bm.criticalThreshold - currentCost;

  // Timeline distance
  const now = new Date(2026, 8, 3); // 03-Sep-2026 baseline
  const sancDate = parseDate(record.sanctionDate);
  let elapsedDays = 0;
  if (sancDate) {
    elapsedDays = Math.max(0, Math.floor((now.getTime() - sancDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  let timelineStatus: 'NORMAL' | 'PROLONGED' | 'OVERDUE' | 'CRITICAL_BREACH' = 'NORMAL';
  if (elapsedDays > 365) timelineStatus = 'CRITICAL_BREACH';
  else if (elapsedDays > 180) timelineStatus = 'OVERDUE';
  else if (elapsedDays > 120) timelineStatus = 'PROLONGED';

  const timelineHeadroom = 180 - elapsedDays; // positive = days left before 180 SLA

  // Duplicate distance
  const dupTrigger = record.triggeredRules.find((r) => r.ruleId === 'DUPLICATE_WORK');
  let duplicateSimilarity = 0.15; // default normal baseline
  let dupStatus: 'NORMAL' | 'ELEVATED' | 'WARNING' | 'ANOMALY' = 'NORMAL';

  if (dupTrigger) {
    const match = dupTrigger.description.match(/(\d+)%/);
    if (match) {
      duplicateSimilarity = parseInt(match[1], 10) / 100;
    } else {
      duplicateSimilarity = dupTrigger.severity === 'HIGH' ? 0.75 : 0.58;
    }
    dupStatus = dupTrigger.severity === 'HIGH' ? 'ANOMALY' : 'WARNING';
  } else if (record.riskScore > 30) {
    duplicateSimilarity = 0.35;
    dupStatus = 'ELEVATED';
  }

  // Overrun distance
  const overrunAmount = Math.max(0, record.disbursedAmount - record.sanctionAmount);

  return {
    cost: {
      current: currentCost,
      median: bm.median,
      warningThreshold: bm.warningThreshold,
      criticalThreshold: bm.criticalThreshold,
      ratioToMedian,
      status: costStatus,
      headroomAmount: costHeadroom,
    },
    timeline: {
      sanctionDate: record.sanctionDate || 'N/A',
      elapsedDays,
      standardSLA: 180,
      criticalSLA: 365,
      status: timelineStatus,
      headroomDays: timelineHeadroom,
    },
    duplicate: {
      maxSimilarity: duplicateSimilarity,
      normalThreshold: 0.4,
      warningThreshold: 0.55,
      criticalThreshold: 0.72,
      status: dupStatus,
    },
    overrun: {
      sanctioned: record.sanctionAmount,
      disbursed: record.disbursedAmount,
      overrunAmount,
      status: overrunAmount > 0 ? 'OVERRUN' : 'CLEARED',
    },
  };
}

