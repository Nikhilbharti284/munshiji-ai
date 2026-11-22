window.MJ = window.MJ || {};
MJ.txHash = async function (date, amount, merchant, refOrBal) {
  const raw = [String(date || ''), Math.round(Number(amount) || 0), MJ.normKey(merchant), String(refOrBal || '')].join('|');
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }
  } catch (e) {}
  let h = 2166136261; for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
};

MJ.sliceCsvToHeader = function (text) {
  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const l = lines[i];
    if (/\bdate\b/i.test(l) && /\b(narration|particulars|description|details|merchant|remarks)\b/i.test(l) && l.includes(',')) return lines.slice(i).join('\n');
  }
  return text;
};

MJ.parseMultiBank = async function (state, text) {
  const seen = new Set();
  for (const t of state.transactions) seen.add(t.hash || await MJ.txHash(t.date, t.amount, t.merchant, t.ref || ''));
  let rawItems = [], skippedCredits = 0;
  const cleanedCsv = MJ.sliceCsvToHeader(text);
  if ((cleanedCsv.match(/,/g) || []).length >= 4 && window.Papa) {
    const parsed = window.Papa.parse(cleanedCsv.trim(), { header: true, skipEmptyLines: true });
    if (parsed.data && parsed.data.length && Object.keys(parsed.data[0]).length >= 3) {
      parsed.data.forEach((row, idx) => {
        const keys = Object.keys(row), get = re => { const k = keys.find(x => re.test(x)); return k ? String(row[k] || '').trim() : ''; };
        const dStr = get(/date|txn|value/i) || row[keys[0]] || '', narr = get(/narr|desc|partic|merchant|detail|remark/i) || row[keys[1]] || '';
        const ref = get(/ref|utr|chq|cheque|bal|closing/i) || ('row_' + idx);
        const drCr = get(/dr\s*\/?\s*cr|type|indicator/i).toUpperCase();
        const amtOnly = parseFloat(get(/^amount$|txn\s*amount/i).replace(/[^0-9.]/g, '')) || 0;
        let dr = parseFloat(get(/debit|withdraw|dr\b|outflow/i).replace(/[^0-9.]/g, '')) || 0;
        let cr = parseFloat(get(/credit|deposit|cr\b|inflow/i).replace(/[^0-9.]/g, '')) || 0;
        if (amtOnly > 0 && dr === 0 && cr === 0) { if (/^CR|CREDIT/.test(drCr)) cr = amtOnly; else dr = amtOnly; }
        if (cr > 0 && dr === 0) { skippedCredits++; return; }
        if (dr > 0 && narr) rawItems.push({ date: MJ.extractDate(dStr), merchant: narr.toUpperCase().slice(0, 42), raw: narr, amount: Math.round(dr), ref, source: 'Bank CSV' });
      });
    }
  }
  if (!rawItems.length) {
    const r = MJ.parseLines(state, text);
    rawItems = r.added.map((x, idx) => ({ ...x, ref: x.raw.match(/\b(?:ref|utr)[\s:#-]*([a-z0-9]{5,})/i)?.[1] || ('sms_' + idx) }));
    skippedCredits += r.skippedCredits;
  }
  const added = []; let skippedDuplicates = 0;
  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i], hash = await MJ.txHash(it.date, it.amount, it.merchant, it.ref || '');
    if (seen.has(hash)) { skippedDuplicates++; continue; }
    seen.add(hash);
    added.push({ id: 'tx_' + Date.now() + '_' + i, hash, ref: it.ref || '', date: it.date, month: it.date.slice(0, 7), merchant: it.merchant, raw: it.raw || it.merchant, amount: it.amount, category: it.category || MJ.categorize(state, it.merchant).category, source: it.source || 'Bank Import' });
  }
  return { added, skippedCredits, skippedDuplicates };
};
