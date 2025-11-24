const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const XLSX = require('xlsx');

function writeCsv(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeXlsx(filePath, sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filePath);
}

function parseFile(filePath) {
  const name = filePath.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return { headers: parsed.meta.fields || [], rows: parsed.data };
  }
  const wb = XLSX.readFile(filePath, { type: 'file' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  const headers = (aoa[0] || []).map(h => String(h || '').trim());
  const rows = [];
  for (let i = 1; i < aoa.length; i++) {
    const rowArr = aoa[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rowArr[j];
    }
    if (Object.values(obj).some(v => v !== null && v !== undefined && String(v).trim() !== '')) rows.push(obj);
  }
  return { headers, rows };
}

async function main() {
  const outDir = path.resolve(__dirname, 'import_tests');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Creating test files in', outDir);

  // 1. CSV with headers
  const csv1 = 'tcNumber,firstName,lastName,phone,email\n12345678901,Ahmet,Demir,05551234567,ahmet@example.com\n23456789012,Ayse,Yilmaz,05559876543,ayse@example.com\n';
  const csv1Path = path.join(outDir, 'patients_with_headers.csv');
  writeCsv(csv1Path, csv1);

  // 2. CSV without headers
  const csv2 = '12345678901,Ahmet,Demir,05551234567,ahmet@example.com\n23456789012,Ayse,Yilmaz,05559876543,ayse@example.com\n';
  const csv2Path = path.join(outDir, 'patients_no_headers.csv');
  writeCsv(csv2Path, csv2);

  // 3. CSV semicolon-delimited
  const csv3 = 'tcNumber;firstName;lastName;phone;email\n34567890123;Mehmet;Kara;05550001111;mehmet@example.com\n';
  const csv3Path = path.join(outDir, 'patients_semicolon.csv');
  writeCsv(csv3Path, csv3);

  // 4. CSV with formula injection
  const csv4 = "tcNumber,firstName,lastName,phone,email\n45678901234,=cmd|'/C calc'!A0,Attack,05553332211,hacker@example.com\n";
  const csv4Path = path.join(outDir, 'patients_formula.csv');
  writeCsv(csv4Path, csv4);

  // 5. XLSX simple sheet
  const xls1Path = path.join(outDir, 'patients_sheet.xlsx');
  writeXlsx(xls1Path, {
    'Sheet1': [
      ['tcNumber','firstName','lastName','phone','email'],
      ['56789012345','Fatma','Sahin','05554443322','fatma@example.com'],
      ['67890123456','Can','Oz','05556667788','can@example.com']
    ]
  });

  // 6. XLSX multiple sheets
  const xls2Path = path.join(outDir, 'patients_multi_sheet.xlsx');
  writeXlsx(xls2Path, {
    'SheetA': [
      ['a','b'],
      [1,2]
    ],
    'Patients': [
      ['tcNumber','firstName','lastName','phone','email'],
      ['78901234567','Derya','Guner','05557778899','derya@example.com']
    ]
  });

  // 7. Large CSV (~5000 rows)
  const largePath = path.join(outDir, 'patients_large.csv');
  const header = 'tcNumber,firstName,lastName,phone,email\n';
  fs.writeFileSync(largePath, header, 'utf8');
  for (let i = 0; i < 5000; i++) {
    const tc = (80000000000 + i).toString();
    const line = `${tc},Bulk${i},User${i},0555${(1000000 + i).toString().slice(-7)},bulk${i}@example.com\n`;
    fs.appendFileSync(largePath, line, 'utf8');
  }

  // Now parse each file and report
  const files = [csv1Path, csv2Path, csv3Path, csv4Path, xls1Path, xls2Path, largePath];
  for (const f of files) {
    console.log('\n--- Parsing', path.basename(f), '---');
    try {
      const { headers, rows } = parseFile(f);
      console.log('Headers:', headers.slice(0, 10));
      console.log('Row count:', rows.length);
      console.log('First row sample:', rows[0]);
    } catch (e) {
      console.error('Parse error for', f, e);
    }
  }

  console.log('\nFiles created and parsed. You can upload them to backend with curl:');
  console.log('curl -v -F "file=@<path>" http://localhost:5003/api/patients/bulk_upload');
}

main().catch(e => { console.error(e); process.exit(1); });
