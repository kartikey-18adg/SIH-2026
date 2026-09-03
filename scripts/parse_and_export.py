import os
import sys
import io
import json
import csv
import zipfile
import xml.etree.ElementTree as ET

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

def read_xlsx_rows(path, max_rows=None):
    with zipfile.ZipFile(path, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall(f'{NS}si'):
                texts = [t.text or '' for t in si.findall(f'.//{NS}t')]
                shared_strings.append(''.join(texts))
        
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = sheet_tree.findall(f'.//{NS}row')
        
        def get_cell_val(c):
            t_attr = c.get('t')
            v_el = c.find(f'{NS}v')
            is_t = c.findall(f'.//{NS}t')
            if is_t:
                return ''.join([t.text or '' for t in is_t]).strip()
            if t_attr == 's' and v_el is not None and v_el.text:
                idx = int(v_el.text)
                return shared_strings[idx].strip() if idx < len(shared_strings) else ''
            if v_el is not None and v_el.text:
                return v_el.text.strip()
            return ''

        result = []
        for r_idx, r in enumerate(rows):
            if max_rows and r_idx >= max_rows:
                break
            vals = [get_cell_val(c) for c in r.findall(f'{NS}c')]
            if any(vals):
                result.append(vals)
        return result

def main():
    sanctioned_path = 'data/Works Sanctioned.xlsx'
    expenditure_path = 'data/Expenditure on Completed and On-going Works as on Date.xlsx'
    
    print("Reading expenditure data...")
    exp_rows = read_xlsx_rows(expenditure_path)
    # Header is at row 1
    exp_header = exp_rows[1]
    print("Exp header:", exp_header)
    
    # Map work ID to expenditures
    exp_by_work_id = {}
    for r in exp_rows[2:]:
        if len(r) >= 11:
            work_id = r[3].strip().replace(" ", "").upper()
            vendor = r[8].strip()
            status = r[9].strip()
            amt_str = r[10].strip()
            try:
                amt = float(amt_str)
            except:
                amt = 0.0
            exp_date = r[7].strip()
            if work_id not in exp_by_work_id:
                exp_by_work_id[work_id] = []
            exp_by_work_id[work_id].append({
                'vendor': vendor,
                'expenditureDate': exp_date,
                'paymentStatus': status,
                'disbursedAmount': amt
            })
            
    print(f"Indexed {len(exp_by_work_id)} expenditure records.")
    
    print("Reading sanctioned data...")
    sanc_rows = read_xlsx_rows(sanctioned_path)
    sanc_header = sanc_rows[1]
    print("Sanc header:", sanc_header)
    
    records = []
    csv_rows = []
    
    # CSV headers
    csv_headers = [
        "Work ID",
        "Work Category",
        "Work Title",
        "State",
        "IDA (Nodal Agency)",
        "Hon'ble MP",
        "Constituency",
        "Work Description",
        "Recommended Date",
        "Sanction Date",
        "Sanction Amount (INR)",
        "Disbursed Amount (INR)",
        "Vendor Name",
        "Expenditure Date",
        "Work Status"
    ]
    
    for r in sanc_rows[2:]:
        if len(r) >= 11:
            sr_no = r[0].strip()
            category = r[1].strip()
            work_field = r[2].strip()
            state = r[3].strip()
            ida = r[4].strip()
            mp_name = r[5].strip()
            constituency = r[6].strip()
            desc = r[7].strip()
            rec_date = r[8].strip()
            sanc_date = r[9].strip()
            sanc_amt_str = r[10].strip()
            status = r[11].strip() if len(r) > 11 else 'Sanctioned'
            
            try:
                sanc_amt = float(sanc_amt_str)
            except:
                sanc_amt = 0.0
                
            # Extract Work ID from work field (format: WS/ MP620/2024-2025/133166-Construction ...)
            work_id = work_field
            title = work_field
            
            import re
            m = re.match(r'^(.*?\d{4}-\d{4}/\d+)-(.*)$', work_field)
            if m:
                work_id = m.group(1).strip()
                title = m.group(2).strip()
            elif '-' in work_field:
                parts = work_field.split('-', 1)
                work_id = parts[0].strip()
                title = parts[1].strip()
            
            clean_work_id = work_id.replace(" ", "").upper()
            
            # Check if expenditure exists
            disbursed_amt = 0.0
            vendor = ""
            exp_date = ""
            
            if clean_work_id in exp_by_work_id:
                items = exp_by_work_id[clean_work_id]
                disbursed_amt = sum(item['disbursedAmount'] for item in items)
                vendor = ", ".join(list(set(item['vendor'] for item in items if item['vendor'])))
                exp_date = items[-1]['expenditureDate']
            
            rec = {
                "id": work_id,
                "srNo": sr_no,
                "workCategory": category,
                "workTitle": title,
                "state": state,
                "ida": ida,
                "mpName": mp_name,
                "constituency": constituency,
                "workDescription": desc,
                "recommendedDate": rec_date,
                "sanctionDate": sanc_date,
                "sanctionAmount": sanc_amt,
                "disbursedAmount": disbursed_amt,
                "vendorName": vendor,
                "expenditureDate": exp_date,
                "status": status
            }
            records.append(rec)
            
            csv_rows.append([
                work_id,
                category,
                title,
                state,
                ida,
                mp_name,
                constituency,
                desc,
                rec_date,
                sanc_date,
                sanc_amt,
                disbursed_amt,
                vendor,
                exp_date,
                status
            ])
            
    print(f"Processed {len(records)} official records.")
    
    # Save to public/data/official_mospi_mplads.json
    with open('public/data/official_mospi_mplads.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print("Saved public/data/official_mospi_mplads.json")
    
    # Save a CSV sample as well
    with open('public/data/official_mospi_sample.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(csv_headers)
        writer.writerows(csv_rows)
    print("Saved public/data/official_mospi_sample.csv")

if __name__ == '__main__':
    main()
