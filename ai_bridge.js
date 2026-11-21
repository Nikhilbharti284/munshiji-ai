window.MJ = window.MJ || {};

MJ.callLLM = async function (apiKey, prompt) {
  const key = String(apiKey || '').trim();
  if (!key) return null;
  try {
    if (key.startsWith('AIza')) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (r.ok) { const d = await r.json(); return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null; }
    } else if (key.startsWith('gsk_')) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 220 })
      });
      if (r.ok) { const d = await r.json(); return d?.choices?.[0]?.message?.content?.trim() || null; }
    }
  } catch (e) {}
  return null;
};

MJ.generateDeepAudit = async function (state) {
  const fin = MJ.computeFinancials(state), subs = MJ.detectSubs(state);
  const unused = subs.filter(s => s.status === 'unused'), hikes = subs.filter(s => s.hike > 0);
  const prompt = 'You are MunshiJi AI, a crisp personal finance coach. Write 3 short bullet points (max 65 words) diagnosing this ledger. NEVER recommend specific stocks, mutual funds, or crypto. Data: Income ' + MJ.fmtINR(fin.income) + ', Spend ' + MJ.fmtINR(fin.totalSpend) + ', Savings ' + fin.savingsRate + '%, Emergency Runway ' + fin.runwayMonths + ' mo, Unused Subs ' + unused.length + ', Hikes ' + hikes.length + ', Dining ' + MJ.fmtINR(fin.byCat['Dining & Delivery'] || 0) + '.';
  const live = await MJ.callLLM(state.apiKey, prompt);
  if (live) return { source: state.apiKey.startsWith('gsk_') ? 'Groq Llama-3.3 Live AI' : 'Gemini 2.5 Flash Live AI', text: live };
  return {
    source: 'Deterministic Local Engine',
    text: '• Savings velocity is ' + fin.savingsRate + '% (' + MJ.fmtINR(fin.surplus) + '/mo), with ' + Math.max(0, 6 - fin.runwayMonths).toFixed(1) + ' months left to reach a full 6-month emergency cushion.\n• Cancelling ' + unused.length + ' unused subscriptions + 30% Dining trim unlocks ' + MJ.fmtINR((unused.reduce((a, s) => a + s.latestAmt, 0) + Math.round((fin.byCat['Dining & Delivery'] || 0) * 0.3)) * 12) + '/year.\n• ' + (hikes.length ? hikes[0].merchant + ' jumped +' + hikes[0].hike + '% MoM — review or switch to an annual tier.' : 'No silent subscription price hikes detected.')
  };
};
