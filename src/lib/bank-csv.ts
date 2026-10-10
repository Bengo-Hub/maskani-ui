/**
 * Reads a bank statement CSV into credit lines for POST /collections/bank-lines. Kenyan bank
 * exports differ in column names and carry a few lines of preamble, so the header row is the first
 * one naming both a date and an amount (or credit) column. Debits and zero lines are skipped.
 */

export interface BankCsvLine {
  date: string; // YYYY-MM-DD
  amount: string;
  reference: string;
  description: string;
  payer: string;
}

export interface BankCsvResult {
  lines: BankCsvLine[];
  /** Rows that looked like transactions but had no readable date. */
  skipped: number;
  /** The columns used, for the screen to show what was read. */
  columns: { date: string; amount: string; reference?: string; description?: string; payer?: string };
}

/** Splits CSV text into rows, honouring quoted fields with commas, quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

const find = (head: string[], ...names: RegExp[]) => {
  for (const n of names) {
    const i = head.findIndex((h) => n.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Reads 2026-10-01, 01/10/2026 (day first, as Kenyan banks print), 01-Oct-2026 or 01 Oct 26. */
export function bankDate(raw: string): string {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else if ((m = /^(\d{1,2})[\s/-]([A-Za-z]{3})[A-Za-z]*[\s/-](\d{2,4})/.exec(s))) { d = +m[1]; mo = MONTHS[m[2].toLowerCase()] ?? 0; y = +m[3]; }
  else return '';
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "KES 1,200.50", "(300.00)" and "1 200" all read as numbers; brackets mean a debit. */
function money(raw: string): number {
  const s = raw.trim();
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  const n = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
}

export function readBankCsv(text: string): BankCsvResult {
  const rows = parseCsv(text);
  const norm = (r: string[]) => r.map((h) => h.trim().toLowerCase());
  const at = rows.findIndex((r) => {
    const h = norm(r);
    return find(h, /date/) >= 0 && find(h, /credit|money in|deposit|amount/) >= 0;
  });
  if (at < 0) throw new Error('No header row with a date and an amount or credit column was found.');
  const raw = rows[at].map((h) => h.trim());
  const head = norm(rows[at]);
  const date = find(head, /^(transaction|trans|tran|txn|posting|book)?\s*date$/, /date/);
  const credit = find(head, /credit|money in|deposit/);
  const amount = credit >= 0 ? credit : find(head, /amount/);
  const reference = find(head, /reference|ref\.?\s*(no)?$|transaction id|trans id|cheque/);
  const description = find(head, /narrat|description|details|particulars|remarks/);
  const payer = find(head, /payer|customer|sender|from|name/);

  const lines: BankCsvLine[] = [];
  let skipped = 0;
  for (const r of rows.slice(at + 1)) {
    const amt = money(r[amount] ?? '');
    if (amt <= 0) continue; // debits, totals and blank lines
    const d = bankDate(r[date] ?? '');
    if (!d) { skipped++; continue; }
    const desc = description >= 0 ? (r[description] ?? '').trim() : '';
    lines.push({
      date: d,
      amount: amt.toFixed(2),
      // Some banks carry the reference only inside the narrative; the API then needs something to
      // tell repeats apart, so the date, amount and narrative stand in.
      reference: (reference >= 0 ? (r[reference] ?? '').trim() : '') || `${d}-${amt.toFixed(2)}-${desc}`.slice(0, 60),
      description: desc,
      payer: payer >= 0 && payer !== description ? (r[payer] ?? '').trim() : '',
    });
  }
  const col = (i: number) => (i >= 0 ? raw[i] : undefined);
  return { lines, skipped, columns: { date: raw[date], amount: raw[amount], reference: col(reference), description: col(description), payer: col(payer) } };
}
