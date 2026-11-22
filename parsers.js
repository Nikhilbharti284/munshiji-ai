window.MJ = window.MJ || {};
MJ.txHash = async function (date, amount, merchant) {
  const raw = [String(date || ''), Math.round(Number(amount) || 0), MJ.normKey(merchant)].join('|');
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }
  } catch (e) {}
  let h = 2166136261; for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
};

MJ.parseMultiBank = async function (state, text) {
  const seen = new Set();
  for (const t of state.transactions) seen.add(t.hash || await MJ.txHash(t.date, t.amount, t.merchant));
  let rawItems = [], skippedCredits = 0;
  if ((text.match(/,/g) || []).length >= 4 && window.Papa) {
    const parsed = window.Papa.parse(String(text || '').trim(), { header: true, skipEmptyLines: true });
    if (parsed.data && parsed.data.length && Object.keys(parsed.data[0]).length >= 3) {
      parsed.data.forEach(row => {
        const keys = Object.keys(row), get = re => { const k = keys.find(x => re.test(x)); return k ? String(row[k] || '').trim() : ''; };
        const dStr = get(/date|txn|value/i) || row[keys[0]] || '', narr = get(/narr|desc|partic|merchant|detail|remark/i) || row[keys[1]] || '';
        const dr = parseFloat(get(/debit|withdraw|dr|outflow|amount/i).replace(/[^0-9.]/g, '')) || 0;
        const cr = parseFloat(get(/credit|deposit|cr|inflow/i).replace(/[^0-9.]/g, '')) || 0;
        if (cr > 0 && dr === 0) { skippedCredits++; return; }
        if (dr > 0 && narr) rawItems.push({ date: MJ.extractDate(dStr), merchant: narr.toUpperCase().slice(0, 40), raw: narr, amount: Math.round(dr), source: 'Bank CSV' });
      });
    }
  }
  if (!rawItems.length) { const r = MJ.parseLines(state, text); rawItems = r.added; skippedCredits += r.skippedCredits; }
  const added = []; let skippedDuplicates = 0;
  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i], hash = await MJ.txHash(it.date, it.amount, it.merchant);
    if (seen.has(hash)) { skippedDuplicates++; continue; }
    seen.add(hash);
    added.push({ id: 'tx_' + Date.now() + '_' + i, hash, date: it.date, month: it.date.slice(0, 7), merchant: it.merchant, raw: it.raw || it.merchant, amount: it.amount, category: it.category || MJ.categorize(state, it.merchant).category, source: it.source || 'Bank Import' });
  }
  return { added, skippedCredits, skippedDuplicates };
};
