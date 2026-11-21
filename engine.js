window.MJ = window.MJ || {};
MJ.GUARDRAIL_RE = /(tata motors|adani|reliance|hdfc bank|infosys|tcs|zomato share|stock tip|share tip|equity pick|multibagger|bitcoin|crypto|ethereum|doge|nifty|banknifty|call option|put option|f&o|intraday|which fund|which mutual fund|which stock|which share|buy\s+(?:stocks?|shares?|equity|crypto|bitcoin|eth|calls?|puts?|nifty|options?|mutual funds?)|invest\b.*\b(?:stocks?|shares?|crypto|bitcoin|tata|adani|reliance|nifty))/i;

MJ.categorize = function (state, text) {
  const upper = MJ.normKey(text);
  for (const k of Object.keys(state.learnedRules || {})) {
    if (k && upper.includes(k.toUpperCase())) return { category: state.learnedRules[k], learned: true };
  }
  for (const r of MJ.BASE_RULES) {
    const re = new RegExp('\\b' + r.kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(upper)) return { category: r.cat, learned: false };
  }
  return { category: 'Transfers & Uncategorized', learned: false };
};

MJ.extractDate = function (line) {
  const mMap = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
  const iso = line.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dmyT = line.match(/\b(\d{1,2})[-\s/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s/](\d{2,4})\b/i);
  if (dmyT) return (dmyT[3].length === 2 ? '20' + dmyT[3] : dmyT[3]) + '-' + mMap[dmyT[2].toLowerCase()] + '-' + dmyT[1].padStart(2, '0');
  const dmyN = line.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2}|\d{2})\b/);
  if (dmyN) return (dmyN[3].length === 2 ? '20' + dmyN[3] : dmyN[3]) + '-' + dmyN[2].padStart(2, '0') + '-' + dmyN[1].padStart(2, '0');
  return '2026-11-21';
};

MJ.parseLines = function (state, text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const added = []; let skippedCredits = 0;
  lines.forEach((line, idx) => {
    if (/^date\s*,/i.test(line) && /amount|debit/i.test(line)) return;
    if (/\b(credited|credit alert|salary credited|received from|refunded|cashback received)\b/i.test(line) && !/\bdebited\b/i.test(line)) {
      skippedCredits++; return;
    }
    let amount = 0, merchant = '', source = 'Bank SMS', date = MJ.extractDate(line);
    const csv = line.split(',');
    if (csv.length >= 3 && /\d/.test(csv[2])) {
      const a = parseFloat(csv[2].replace(/[^0-9.]/g, ''));
      if (!isNaN(a) && a > 0) { date = MJ.extractDate(csv[0]); merchant = csv[1].trim().toUpperCase(); amount = Math.round(a); source = 'CSV Import'; }
    }
    if (!amount) {
      const m = line.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) || line.match(/\b([0-9,]{2,7}(?:\.[0-9]{1,2})?)\b/);
      if (m) amount = Math.round(parseFloat(m[1].replace(/,/g, '')) || 0);
      const to = line.match(/(?:to|at|for|vpa)\s+([A-Za-z0-9_.@ \-]{2,28}?)(?:\s+on|\s+via|\s+ref|\.|$)/i);
      merchant = to ? to[1].trim().toUpperCase() : ('UPI TXN #' + (idx + 1));
      if (/phonepe/i.test(line)) source = 'PhonePe SMS';
      else if (/gpay|google pay/i.test(line)) source = 'GPay SMS';
      else if (/hdfc/i.test(line)) source = 'HDFC SMS';
      else if (/sbi/i.test(line)) source = 'SBI SMS';
      else if (/upi/i.test(line)) source = 'UPI SMS';
    }
    if (amount > 0 && merchant) {
      added.push({ id: 'ti_' + Date.now() + '_' + idx, date, month: date.slice(0, 7), merchant, raw: line, amount, category: MJ.categorize(state, merchant).category, source });
    }
  });
  return { added, skippedCredits };
};

MJ.computeFinancials = function (state) {
  const curTx = state.transactions.filter(t => t.month === '2026-11');
  const byCat = {}; MJ.CATEGORIES.forEach(c => { byCat[c] = 0; });
  let variableTotal = 0;
  curTx.forEach(t => { const a = Number(t.amount) || 0; byCat[t.category] = (byCat[t.category] || 0) + a; variableTotal += a; });
  const income = Math.max(0, Number(state.profile.income) || 0);
  const fixed = Math.max(0, (Number(state.profile.rent) || 0) + (Number(state.profile.emi) || 0));
  const totalSpend = fixed + variableTotal, surplus = income - totalSpend;
  const savingsRate = income > 0 ? Math.round((surplus / income) * 100) : 0;
  const runwayMonths = Number(((Number(state.profile.emergencyFund) || 0) / Math.max(1, fixed + Math.max(variableTotal * 0.65, 8000))).toFixed(1));
  return { income, fixed, variableTotal, totalSpend, surplus, savingsRate, runwayMonths, byCat, curTx };
};

MJ.detectSubs = function (state) {
  const map = {};
  state.transactions.forEach(t => {
    const key = MJ.normKey(t.merchant);
    if (!map[key]) map[key] = { merchant: t.merchant, key, byMonth: {}, category: t.category };
    map[key].byMonth[t.month] = (map[key].byMonth[t.month] || 0) + (Number(t.amount) || 0);
  });
  const subs = [];
  Object.values(map).forEach(item => {
    const ms = Object.keys(item.byMonth).sort();
    if (ms.length >= 2 || item.category === 'Subscriptions & OTT') {
      const latestAmt = item.byMonth[ms[ms.length - 1]] || 0;
      const prevAmt = ms.length >= 2 ? (item.byMonth[ms[ms.length - 2]] || 0) : latestAmt;
      const hike = prevAmt > 0 && latestAmt > prevAmt ? Math.round(((latestAmt - prevAmt) / prevAmt) * 100) : 0;
      subs.push({ key: item.key, merchant: item.merchant, category: item.category, latestAmt, prevAmt, hike, status: state.subUsageStatus[item.key] || 'active' });
    }
  });
  return subs.sort((a, b) => b.latestAmt - a.latestAmt);
};

MJ.parseVoice = function (state, whatIf, rawText) {
  const original = String(rawText || '').trim();
  if (!original) return null;
  const corrRe = /(\d+(?:,\d+)*%?)\s*(?:\.{2,}|,)?\s*(?:wait\s+no|no\s+wait|actually|sorry|instead|no|wait)\s*(?:no\s*|wait\s*)?(\d+(?:,\d+)*%?)/gi;
  const corrections = [];
  let highlightedRaw = MJ.esc(original).replace(corrRe, (_, o, n) => '<span class="token-filler">' + o + '</span> &rarr; <span class="token-corrected">' + n + '</span>');
  highlightedRaw = highlightedRaw.replace(/\b(uhh+|umm+|err+|basically|like|you know)\b/gi, '<span class="token-filler">$1</span>');
  let cleaned = original.replace(corrRe, (_, o, n) => { corrections.push(o + ' -> ' + n); return n; });
  cleaned = cleaned.replace(/\b(uhh+|umm+|err+|actually|basically|like|you know|wait|sorry|i mean|hey|munshiji|please)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const lower = cleaned.toLowerCase();

  if (MJ.GUARDRAIL_RE.test(original)) {
    return { intent: 'GUARDRAIL_REFUSAL', original, highlightedRaw, cleaned, corrections, payload: { intent: 'GUARDRAIL_REFUSAL', policy: 'SEBI_SAFE_EDUCATION_ONLY' }, summary: 'Refused specific security/crypto pick and routed to educational coach.' };
  }
  if (/(cut|reduce|trim|what if|if i|rent|increase|goes up|bonus|side income|goal|trip|save)/i.test(lower)) {
    let { diningCut, shoppingCut, rentDelta, incomeDelta } = whatIf;
    const pcts = cleaned.match(/(\d+)\s*%/g) || [];
    if (/(swiggy|zomato|dining|food|delivery|eat)/i.test(lower) && pcts.length) diningCut = Math.min(70, parseInt(pcts[pcts.length - 1], 10) || 0);
    else if (/(shopping|myntra|amazon)/i.test(lower) && pcts.length) shoppingCut = Math.min(70, parseInt(pcts[pcts.length - 1], 10) || 0);
    const rM = cleaned.match(/rent[^0-9+-]*([+-]?\d+(?:,\d+)*)/i);
    if (rM) { const v = parseInt(rM[1].replace(/,/g, ''), 10) || 0; const isNeg = /rent.{0,22}(down|less|drop|cut|lower|decreas|reduc)/i.test(lower) || /-(?=\d)/.test(rM[1]); rentDelta = Math.max(-10000, Math.min(15000, isNeg ? -v : v)); }
    const iM = cleaned.match(/(?:bonus|income|salary|side)[^0-9]*(\d+(?:,\d+)*)/i);
    if (iM) incomeDelta = Math.min(30000, parseInt(iM[1].replace(/,/g, ''), 10) || 0);
    return { intent: 'WHAT_IF_SIMULATION', original, highlightedRaw, cleaned, corrections, params: { diningCut, shoppingCut, rentDelta, incomeDelta }, payload: { intent: 'WHAT_IF_SIMULATION', diningCutPct: diningCut, shoppingCutPct: shoppingCut, rentDeltaINR: rentDelta, incomeDeltaINR: incomeDelta }, summary: 'Updated simulator: Dining -' + diningCut + '%, Rent ' + (rentDelta >= 0 ? '+' : '') + MJ.fmtINR(rentDelta) + '/mo.' };
  }
  const amts = cleaned.match(/\b(\d+(?:,\d+)*)\b/g);
  if (amts && amts.length) {
    const amount = parseInt(amts[amts.length - 1].replace(/,/g, ''), 10) || 0;
    if (amount > 0) {
      let merchant = /chaayos/i.test(original) ? 'CHAAYOS CAFE' : /swiggy/i.test(original) ? 'SWIGGY ORDER' : /zomato/i.test(original) ? 'ZOMATO ORDER' : /uber/i.test(original) ? 'UBER RIDE' : 'VOICE EXPENSE';
      const cat = MJ.categorize(state, merchant).category;
      return { intent: 'LOG_TRANSACTION', original, highlightedRaw, cleaned, corrections, tx: { id: 'tv_' + Date.now(), date: '2026-11-21', month: '2026-11', merchant, raw: original, amount, category: cat, source: 'Voice / Wispr' }, payload: { intent: 'LOG_TRANSACTION', merchant, amountINR: amount, category: cat }, summary: 'Logged ' + MJ.fmtINR(amount) + ' at ' + merchant + ' (' + cat + ').' };
    }
  }
  return { intent: 'COACH_QUERY', original, highlightedRaw, cleaned, corrections, payload: { intent: 'COACH_QUERY', query: cleaned }, summary: 'Routed cleaned query to Financial Coach.' };
};

MJ.coachReply = async function (state, q) {
  const fin = MJ.computeFinancials(state);
  if (MJ.GUARDRAIL_RE.test(q)) {
    return { type: 'guardrail', text: 'SEBI-Safe Guardrail Triggered: I am an educational money coach, not a SEBI-registered advisor, so I cannot recommend specific stocks, mutual funds, crypto, or F&O trades. Your current emergency runway is ' + fin.runwayMonths + ' months (vs 6-month target) — prioritize completing your liquid buffer first, then study diversified asset allocation.' };
  }
  if (state.apiKey && MJ.callLLM) {
    const liveText = await MJ.callLLM(state.apiKey, 'You are MunshiJi AI, a crisp English personal finance educator. Reply in 2-3 sentences. NEVER recommend specific stocks, funds, or crypto. Income ' + MJ.fmtINR(fin.income) + ', Spend ' + MJ.fmtINR(fin.totalSpend) + ', Surplus ' + MJ.fmtINR(fin.surplus) + '. Question: ' + q);
    if (liveText) return { type: 'normal', text: liveText };
  }
  if (false && state.apiKey) {
    try {
      const prompt = 'You are MunshiJi AI, a crisp English personal finance educator. Reply in 2-3 sentences. NEVER recommend specific stocks, funds, or crypto. Income ' + MJ.fmtINR(fin.income) + ', Spend ' + MJ.fmtINR(fin.totalSpend) + ', Surplus ' + MJ.fmtINR(fin.surplus) + '. Question: ' + q;
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(state.apiKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      if (r.ok) { const d = await r.json(); const t = d?.candidates?.[0]?.content?.parts?.[0]?.text; if (t) return { type: 'normal', text: t.trim() }; }
    } catch (e) {}
  }
  if (/emergency|runway|buffer/i.test(q)) return { type: 'normal', text: 'Your Emergency Fund is ' + MJ.fmtINR(state.profile.emergencyFund) + ' (' + fin.runwayMonths + ' months runway). Aim for 6 months of essential costs before taking high-volatility bets.' };
  if (/swiggy|zomato|dining|delivery/i.test(q)) { const d = fin.byCat['Dining & Delivery'] || 0; return { type: 'normal', text: 'You spent ' + MJ.fmtINR(d) + ' on Dining & Delivery this month. Trimming 30% saves ' + MJ.fmtINR(d * 0.3) + '/month (' + MJ.fmtINR(d * 3.6) + '/year).' }; }
  return { type: 'normal', text: 'Your live ledger shows a ' + fin.savingsRate + '% savings rate and ' + MJ.fmtINR(fin.surplus) + '/mo surplus. Cancel unused subscriptions or model a 30% dining cut in the What-If tab.' };
};
