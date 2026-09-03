import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CanonicalWorkRecord, ColumnMapping } from '../types';

export interface RawParseResult {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  fileName: string;
  fileSize: string;
}

// Clean number strings like "₹ 4,97,185", "500000.00", "N/A"
export function cleanNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[₹,\s]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Clean text string
export function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str === 'N/A' || str === 'n/a' || str === '-' ? '' : str;
}

// Guess the best column match based on known aliases
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findBest = (patterns: string[]): string => {
    for (const p of patterns) {
      const pNorm = norm(p);
      const match = headers.find((h) => {
        const hNorm = norm(h);
        return hNorm === pNorm || hNorm.includes(pNorm);
      });
      if (match) return match;
    }
    return '';
  };

  return {
    id: findBest(['workid', 'work id', 'work', 'workcode', 'id', 'srno']),
    workCategory: findBest(['workcategory', 'category', 'work category', 'sector', 'type']),
    workTitle: findBest(['worktitle', 'title', 'work', 'projectname']),
    state: findBest(['state', 'statename']),
    ida: findBest(['ida', 'nodalagency', 'implementingagency', 'districtmagistrate', 'deputycommissioner', 'agency']),
    mpName: findBest(['honblemembersofparliament', 'honblemps', 'mpname', 'memberofparliament', 'mp']),
    constituency: findBest(['constituency', 'district', 'constituencyname']),
    workDescription: findBest(['workdescription', 'description', 'workdesc', 'details', 'work']),
    recommendedDate: findBest(['recommendeddate', 'recommendationdate', 'recdate']),
    sanctionDate: findBest(['sanctiondate', 'sanctioneddate', 'approvaldate']),
    sanctionAmount: findBest(['sanctionamount', 'sanctionamount', 'sanctionamt', 'approvedamount', 'sanctionedcost', 'amount']),
    disbursedAmount: findBest(['funddisbursedamount', 'disbursedamount', 'amountdisbursed', 'expenditure', 'funddisbursed', 'spent']),
    vendorName: findBest(['vendorname', 'vendor', 'contractor', 'agencyname']),
    expenditureDate: findBest(['expendituredate', 'paymentdate', 'disbursementdate', 'completiondate']),
    status: findBest(['workstatus', 'paymentstatus', 'status', 'currentstatus']),
  };
}

// Parse CSV file content or string
export function parseCSV(file: File): Promise<RawParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawData = results.data as string[][];
          if (!rawData || rawData.length === 0) {
            throw new Error('CSV file is empty');
          }

          // Check if Row 0 is a title and Row 1 is the header
          let headerRowIndex = 0;
          if (rawData.length > 1 && rawData[0].filter((c) => c && c.trim()).length <= 2) {
            headerRowIndex = 1;
          }

          const rawHeaders = rawData[headerRowIndex].map((h, i) => (h && h.trim() ? h.trim() : `Column_${i + 1}`));
          const rawRows: Record<string, any>[] = [];

          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const rowArr = rawData[i];
            if (rowArr.some((c) => c && c.trim())) {
              const rowObj: Record<string, any> = {};
              rawHeaders.forEach((h, colIdx) => {
                rowObj[h] = rowArr[colIdx] || '';
              });
              rawRows.push(rowObj);
            }
          }

          const detectedMapping = guessColumnMapping(rawHeaders);
          const sizeKb = (file.size / 1024).toFixed(1) + ' KB';

          resolve({
            headers: rawHeaders,
            rawRows,
            detectedMapping,
            fileName: file.name,
            fileSize: sizeKb,
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}

// Parse Excel XLSX / XLS file
export async function parseExcel(file: File): Promise<RawParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const sheetData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });

  if (!sheetData || sheetData.length === 0) {
    throw new Error('Excel sheet is empty');
  }

  // Check if Row 0 is title header
  let headerRowIndex = 0;
  if (sheetData.length > 1 && sheetData[0].filter((c) => c && String(c).trim()).length <= 2) {
    headerRowIndex = 1;
  }

  const rawHeaders = sheetData[headerRowIndex].map((h, i) => (h && String(h).trim() ? String(h).trim() : `Column_${i + 1}`));
  const rawRows: Record<string, any>[] = [];

  for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
    const rowArr = sheetData[i];
    if (rowArr.some((c) => c && String(c).trim())) {
      const rowObj: Record<string, any> = {};
      rawHeaders.forEach((h, colIdx) => {
        rowObj[h] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]) : '';
      });
      rawRows.push(rowObj);
    }
  }

  const detectedMapping = guessColumnMapping(rawHeaders);
  const sizeKb = (file.size / 1024).toFixed(1) + ' KB';

  return {
    headers: rawHeaders,
    rawRows,
    detectedMapping,
    fileName: file.name,
    fileSize: sizeKb,
  };
}

// Parse raw JSON array
export function parseJSON(jsonText: string, fileName = 'dataset.json', fileSize = '0 KB'): RawParseResult {
  const data = JSON.parse(jsonText);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('JSON dataset must be a non-empty array of objects');
  }
  const headers = Object.keys(data[0]);
  const detectedMapping = guessColumnMapping(headers);

  return {
    headers,
    rawRows: data,
    detectedMapping,
    fileName,
    fileSize,
  };
}

// Transform raw rows into normalized CanonicalWorkRecord using column mapping
export function applyColumnMapping(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): Array<Omit<CanonicalWorkRecord, 'riskScore' | 'riskLevel' | 'triggeredRules' | 'estimatedOverrunRisk' | 'auditStatus' | 'auditNotes'>> {
  return rawRows.map((row, idx) => {
    let idVal = cleanString(mapping.id ? row[mapping.id] : '');
    let titleVal = cleanString(mapping.workTitle ? row[mapping.workTitle] : '');

    // Extract ID if embedded in title like "WS/ MP620/2024-2025/133166-Construction of ..."
    if (idVal && !titleVal) {
      const fiscalMatch = idVal.match(/^(.*?\d{4}-\d{4}\/\d+)-(.*)$/);
      if (fiscalMatch) {
        idVal = fiscalMatch[1].trim();
        titleVal = fiscalMatch[2].trim();
      } else if (idVal.includes('-')) {
        const parts = idVal.split('-');
        idVal = parts[0].trim();
        titleVal = parts.slice(1).join('-').trim();
      }
    } else if (!idVal) {
      idVal = `MPLAD-${String(idx + 1).padStart(5, '0')}`;
    }

    const descVal = cleanString(mapping.workDescription ? row[mapping.workDescription] : (titleVal || idVal));

    return {
      id: idVal,
      srNo: idx + 1,
      workCategory: cleanString(mapping.workCategory ? row[mapping.workCategory] : 'General'),
      workTitle: titleVal || descVal.slice(0, 80),
      state: cleanString(mapping.state ? row[mapping.state] : ''),
      ida: cleanString(mapping.ida ? row[mapping.ida] : ''),
      mpName: cleanString(mapping.mpName ? row[mapping.mpName] : ''),
      constituency: cleanString(mapping.constituency ? row[mapping.constituency] : ''),
      workDescription: descVal,
      recommendedDate: cleanString(mapping.recommendedDate ? row[mapping.recommendedDate] : ''),
      sanctionDate: cleanString(mapping.sanctionDate ? row[mapping.sanctionDate] : ''),
      sanctionAmount: cleanNumber(mapping.sanctionAmount ? row[mapping.sanctionAmount] : 0),
      disbursedAmount: cleanNumber(mapping.disbursedAmount ? row[mapping.disbursedAmount] : 0),
      vendorName: cleanString(mapping.vendorName ? row[mapping.vendorName] : ''),
      expenditureDate: cleanString(mapping.expenditureDate ? row[mapping.expenditureDate] : ''),
      status: cleanString(mapping.status ? row[mapping.status] : 'Sanctioned'),
      rawRecord: row,
    };
  });
}
