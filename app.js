(function () {
  'use strict';
  let state = MJ.loadState();
  let whatIf = { diningCut: 0, shoppingCut: 0, rentDelta: 0, incomeDelta: 0, cancelUnused: false };
  let charts = { cat: null, cf: null, sim: null };
  const $ = id => document.getElementById(id);
  const TITLES = { overview: 'Overview', ingest: 'Ingest & Learned Rules', subscriptions: 'Subscriptions Radar', whatif: 'Profile & What-If Simulator', report: 'Monthly Report & Coach' };

  function toast(msg, tone) {
    const c = $('toast-container'); if (!c) return;
    const el = document.createElement('div');
    el.className = (tone === 'error' ? 'bg-rose-600 text-white' : tone === 'indigo' ? 'bg-teal-700 text-white' : 'bg-slate-900 text-white') + ' px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold';
    el.textContent = msg; c.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  function logAct(badge, text) {
    state.activityLog = state.activityLog || [];
    state.activityLog.unshift({ time: new Date().toTimeString().slice(0, 5), badge, text });
    if (state.activityLog.length > 20) state.activityLog.pop();
  }
  function switchTab(t) {
    if (!TITLES[t]) t = 'overview';
    if (location.hash !== '#/' + t) history.replaceState(null, '', '#/' + t);
    $('page-title').textContent = TITLES[t];
    document.querySelectorAll('.nav-item, .mob-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + t));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
  }

  function renderAll() {
    const fin = MJ.computeFinancials(state), subs = MJ.detectSubs(state);
    $('engine-badge').innerHTML = state.apiKey ? '<span class="w-2 h-2 rounded-full bg-indigo-500"></span> Zero-API + Gemini' : '<span class="w-2 h-2 rounded-full bg-teal-600"></span> Zero-API Engine';
    const alertCnt = String(subs.filter(s => s.hike > 0 || s.status === 'unused').length);
    $('sub-alert-badge').textContent = alertCnt; $('mob-sub-badge').textContent = alertCnt;
    const rKeys = Object.keys(state.learnedRules || {});
    $('learned-rules-pill').textContent = rKeys.length + ' Learned Rule' + (rKeys.length === 1 ? '' : 's');

    $('kpi-income').textContent = MJ.fmtINR(fin.income);
    $('kpi-spend').textContent = MJ.fmtINR(fin.totalSpend);
    $('kpi-spend-sub').textContent = 'Fixed ' + MJ.fmtINR(fin.fixed) + ' + Var ' + MJ.fmtINR(fin.variableTotal);
    $('kpi-surplus').textContent = MJ.fmtINR(fin.surplus);
    $('kpi-surplus').className = 'text-xl sm:text-2xl font-extrabold mt-1 ' + (fin.surplus >= 0 ? 'text-teal-700' : 'text-rose-600');
    $('kpi-savings-rate').textContent = 'Savings Rate: ' + fin.savingsRate + '%';
    $('kpi-runway').textContent = fin.runwayMonths + ' / ' + state.profile.targetEmergencyMonths + ' mo';
    $('kpi-runway-bar').style.width = Math.min(100, Math.round((fin.runwayMonths / Math.max(1, state.profile.targetEmergencyMonths)) * 100)) + '%';

    const unusedMo = subs.filter(s => s.status === 'unused').reduce((a, s) => a + s.latestAmt, 0);
    const dinTrim = Math.round((fin.byCat['Dining & Delivery'] || 0) * 0.3);
    $('xray-annual-leak').textContent = MJ.fmtINR((unusedMo + dinTrim) * 12) + '/yr';
    $('xray-summary').textContent = 'Cancelling ' + subs.filter(s => s.status === 'unused').length + ' unused subs (' + MJ.fmtINR(unusedMo) + '/mo) + 30% Dining trim (' + MJ.fmtINR(dinTrim) + '/mo) recovers ' + MJ.fmtINR((unusedMo + dinTrim) * 12) + ' per year.';

    const nudges = [];
    Object.keys(MJ.BUDGETS).forEach(cat => {
      const sp = fin.byCat[cat] || 0, cap = MJ.BUDGETS[cat], r = sp / cap;
      if (r >= 0.78) nudges.push({ tone: r >= 1 ? 'red' : 'amber', title: cat + ' (' + Math.round(r * 100) + '% of cap)', msg: 'Spent ' + MJ.fmtINR(sp) + ' / ' + MJ.fmtINR(cap) + ' monthly guideline.', act: cat === 'Subscriptions & OTT' ? 'goto-subs' : (cat === 'Shopping & Lifestyle' ? 'sim-shopping' : 'sim-dining'), lbl: cat === 'Subscriptions & OTT' ? 'Review Subs' : 'Simulate 30% Cut' });
    });
    const hikes = subs.filter(s => s.hike > 0);
    if (hikes.length) nudges.push({ tone: 'red', title: 'Price Hike Caught', msg: hikes[0].merchant + ' rose ' + MJ.fmtINR(hikes[0].prevAmt) + ' -> ' + MJ.fmtINR(hikes[0].latestAmt) + ' (+' + hikes[0].hike + '% MoM).', act: 'goto-subs', lbl: 'Inspect Subs' });
    const uncat = fin.curTx.filter(t => t.category === 'Transfers & Uncategorized');
    if (uncat.length) nudges.push({ tone: 'teal', title: uncat.length + ' Uncategorized UPI Tx', msg: uncat[0].merchant + ' (' + MJ.fmtINR(uncat[0].amount) + ') needs a category. Fix once to teach.', act: 'goto-ingest', lbl: 'Teach Rule' });
    $('nudges-list').innerHTML = nudges.map(n => '<div class="p-3.5 rounded-xl border ' + (n.tone === 'red' ? 'bg-rose-50/50 border-rose-200' : n.tone === 'teal' ? 'bg-teal-50/50 border-teal-200' : 'bg-amber-50/50 border-amber-200') + ' flex flex-col justify-between gap-2"><div><div class="text-xs font-bold text-slate-900">' + MJ.esc(n.title) + '</div><p class="text-xs text-slate-600 mt-1">' + MJ.esc(n.msg) + '</p></div><button type="button" data-nudge="' + n.act + '" class="nudge-btn self-start px-2.5 py-1 rounded-lg bg-white text-slate-800 text-[11px] font-semibold border border-slate-200 hover:bg-slate-50">' + n.lbl + ' &rarr;</button></div>').join('');

    if (window.Chart) {
      const cL = Object.keys(fin.byCat).filter(k => fin.byCat[k] > 0), cV = cL.map(k => fin.byCat[k]);
      if (charts.cat) charts.cat.destroy();
      charts.cat = new Chart($('category-chart'), { type: 'doughnut', data: { labels: cL, datasets: [{ data: cV, backgroundColor: ['#0F766E','#0284C7','#D97706','#E11D48','#4F46E5','#10B981','#64748B'], borderWidth: 2, borderColor: '#FFF' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } } } });
      if (charts.cf) charts.cf.destroy();
      charts.cf = new Chart($('cashflow-chart'), { type: 'bar', data: { labels: ['Income','Fixed','Variable','Surplus'], datasets: [{ data: [fin.income, fin.fixed, fin.variableTotal, Math.max(0, fin.surplus)], backgroundColor: ['#0F172A','#64748B','#D97706','#0F766E'], borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    }

    const selF = $('ledger-cat-filter');
    if (selF.options.length <= 1) MJ.CATEGORIES.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; selF.appendChild(o); });
    $('rules-count-badge').textContent = String(rKeys.length);
    $('learned-rules-list').innerHTML = rKeys.length ? rKeys.map(k => '<div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"><div><div class="font-bold text-slate-900">' + MJ.esc(k) + '</div><div class="text-[11px] text-teal-700">&rarr; ' + MJ.esc(state.learnedRules[k]) + '</div></div><button type="button" data-del-rule="' + MJ.esc(k) + '" class="del-rule-btn text-slate-400 hover:text-rose-600 px-1.5">✕</button></div>').join('') : '<div class="text-xs text-slate-400 italic">Edit any category below to teach MunshiJi.</div>';
    const sq = ($('ledger-search').value || '').toLowerCase(), cf = selF.value;
    $('ledger-tbody').innerHTML = state.transactions.filter(t => (cf === 'ALL' || t.category === cf) && (!sq || t.merchant.toLowerCase().includes(sq))).sort((a, b) => b.date.localeCompare(a.date)).map(t => '<tr><td class="py-2.5 pr-3 text-slate-500 whitespace-nowrap">' + MJ.esc(t.date) + '</td><td class="py-2.5 pr-3"><div class="font-semibold text-slate-900">' + MJ.esc(t.merchant) + '</div><div class="text-[10px] text-slate-400 truncate max-w-[160px]">' + MJ.esc(t.raw) + '</div></td><td class="py-2.5 pr-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">' + MJ.esc(t.source) + '</span></td><td class="py-2.5 pr-3"><select data-tx-id="' + MJ.esc(t.id) + '" class="tx-cat-select text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white">' + MJ.CATEGORIES.map(c => '<option value="' + c + '"' + (c === t.category ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></td><td class="py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">' + MJ.fmtINR(t.amount) + '</td></tr>').join('');

    $('sub-total-monthly').textContent = MJ.fmtINR(subs.reduce((a, s) => a + s.latestAmt, 0));
    $('sub-alerts-count').textContent = alertCnt;
    $('sub-annual-savings').textContent = MJ.fmtINR(unusedMo * 12) + '/yr';
    $('subscriptions-grid').innerHTML = subs.map(s => '<div class="p-4 rounded-2xl border ' + (s.hike > 0 ? 'border-rose-200 bg-rose-50/30' : s.status === 'unused' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white') + ' flex flex-col justify-between gap-2"><div class="flex justify-between"><div><div class="font-bold text-sm text-slate-900">' + MJ.esc(s.merchant) + '</div><div class="text-[11px] text-slate-500">' + MJ.esc(s.category) + '</div></div><div class="text-right"><div class="font-extrabold">' + MJ.fmtINR(s.latestAmt) + '/mo</div>' + (s.hike > 0 ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">+' + s.hike + '% MoM</span>' : '<span class="text-[10px] text-slate-400">Stable</span>') + '</div></div><div class="flex justify-between items-center pt-2 border-t border-slate-100"><span class="text-[11px] font-semibold ' + (s.status === 'unused' ? 'text-amber-800' : 'text-teal-700') + '">' + (s.status === 'unused' ? 'Unused — Save ' + MJ.fmtINR(s.latestAmt * 12) + '/yr' : 'Active') + '</span><button type="button" data-sub-key="' + MJ.esc(s.key) + '" class="toggle-sub-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900 text-white">' + (s.status === 'unused' ? 'Mark Active' : 'Flag Unused') + '</button></div></div>').join('');

    [['prof-income', state.profile.income], ['prof-rent', state.profile.rent], ['prof-emi', state.profile.emi], ['prof-emergency', state.profile.emergencyFund]].forEach(([id, v]) => { if (document.activeElement !== $(id)) $(id).value = v; });
    $('goals-editor-list').innerHTML = state.goals.map(g => '<div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"><div><div class="font-bold text-slate-900">' + MJ.esc(g.name) + '</div><div class="text-[11px] text-slate-500">Target ' + MJ.fmtINR(g.target) + ' &bull; By ' + MJ.esc(g.targetDate) + '</div></div><button type="button" data-del-goal="' + MJ.esc(g.id) + '" class="del-goal-btn text-slate-400 hover:text-rose-600 px-1.5">✕</button></div>').join('');
    $('sim-unused-amt').textContent = MJ.fmtINR(unusedMo);
    $('sim-dining-cut').value = whatIf.diningCut; $('val-dining-cut').textContent = whatIf.diningCut + '%';
    $('sim-shopping-cut').value = whatIf.shoppingCut; $('val-shopping-cut').textContent = whatIf.shoppingCut + '%';
    $('sim-rent-delta').value = whatIf.rentDelta; $('val-rent-delta').textContent = (whatIf.rentDelta >= 0 ? '+' : '') + MJ.fmtINR(whatIf.rentDelta) + '/mo';
    $('sim-income-delta').value = whatIf.incomeDelta; $('val-income-delta').textContent = '+' + MJ.fmtINR(whatIf.incomeDelta) + '/mo';
    $('sim-cancel-unused').checked = whatIf.cancelUnused;

    const deltaMo = Math.round((fin.byCat['Dining & Delivery'] || 0) * whatIf.diningCut / 100) + Math.round((fin.byCat['Shopping & Lifestyle'] || 0) * whatIf.shoppingCut / 100) + (whatIf.cancelUnused ? unusedMo : 0) + whatIf.incomeDelta - whatIf.rentDelta;
    const baseS = Math.max(1000, fin.surplus), simS = Math.max(1000, fin.surplus + deltaMo);
    $('sim-base-surplus').textContent = MJ.fmtINR(fin.surplus); $('sim-new-surplus').textContent = MJ.fmtINR(fin.surplus + deltaMo);
    $('sim-delta-surplus').textContent = (deltaMo >= 0 ? '+' : '') + MJ.fmtINR(deltaMo) + '/mo';

    const gN = [], gB = [], gS = [];
    $('goal-impact-list').innerHTML = state.goals.map(g => {
      const rem = Math.max(0, (Number(g.target) || 0) - (Number(g.saved) || 0));
      const bM = Number((rem / Math.max(1000, baseS * 0.5)).toFixed(1)), sM = Number((rem / Math.max(1000, simS * 0.5)).toFixed(1)), diff = Number((bM - sM).toFixed(1));
      gN.push(g.name.slice(0, 16)); gB.push(bM); gS.push(sM);
      return '<div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"><div><b>' + MJ.esc(g.name) + '</b> <span class="text-slate-500">(' + MJ.fmtINR(rem) + ' left)</span></div><div><b>' + bM + 'm &rarr; ' + sM + 'm</b> ' + (diff > 0 ? '<span class="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">' + diff + 'm faster</span>' : diff < 0 ? '<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">' + Math.abs(diff) + 'm slower</span>' : '') + '</div></div>';
    }).join('');
    if (window.Chart) {
      if (charts.sim) charts.sim.destroy();
      charts.sim = new Chart($('goal-sim-chart'), { type: 'bar', data: { labels: gN, datasets: [{ label: 'Current (Mo)', data: gB, backgroundColor: '#94A3B8', borderRadius: 6 }, { label: 'What-If (Mo)', data: gS, backgroundColor: '#0F766E', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false } });
    }

    const score = Math.min(100, Math.max(10, 40 + Math.min(25, Math.max(0, Math.round(fin.savingsRate * 0.8))) + Math.min(20, Math.round((fin.runwayMonths / 6) * 20)) + (unusedMo === 0 ? 15 : 6)));
    $('monthly-report-body').innerHTML = '<div class="flex justify-between items-center p-4 rounded-2xl bg-teal-50/70 border border-teal-200"><div><div class="text-xs font-bold text-teal-900">Financial Health Score</div><div class="text-xs text-slate-600">Savings rate, emergency runway &amp; subscription hygiene</div></div><div class="text-3xl font-extrabold text-teal-700">' + score + '<span class="text-sm text-slate-400">/100</span></div></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">Income<br><b>' + MJ.fmtINR(fin.income) + '</b></div><div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">Spend<br><b>' + MJ.fmtINR(fin.totalSpend) + '</b></div><div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">Surplus<br><b class="text-teal-700">' + MJ.fmtINR(fin.surplus) + ' (' + fin.savingsRate + '%)</b></div><div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">Rules<br><b class="text-slate-900">' + rKeys.length + ' Active</b></div></div>';
    $('memory-activity-log').innerHTML = (state.activityLog || []).map(x => '<div class="flex gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100"><span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">' + MJ.esc(x.badge) + '</span><span class="flex-1 text-slate-700">' + MJ.esc(x.text) + '</span><span class="text-[10px] text-slate-400">' + MJ.esc(x.time) + '</span></div>').join('');
    $('coach-chat-log').innerHTML = state.chatLog.map(m => m.role === 'user' ? '<div class="flex justify-end"><div class="max-w-[85%] px-3 py-2 rounded-2xl bg-slate-900 text-white text-xs">' + MJ.esc(m.text) + '</div></div>' : '<div class="flex justify-start"><div class="max-w-[92%] px-3 py-2 rounded-2xl text-xs ' + (m.type === 'guardrail' ? 'bg-rose-50 border border-rose-300 text-rose-950 font-medium' : 'bg-slate-50 border border-slate-200 text-slate-800') + '">' + MJ.esc(m.text) + '</div></div>').join('');
    if (MJ.renderCategoryBars) MJ.renderCategoryBars(fin);
    if (MJ.renderGoalRings) MJ.renderGoalRings(state, () => { MJ.saveState(state); renderAll(); }, toast);
    if (MJ.renderProjectionChart) MJ.renderProjectionChart(state, fin, deltaMo);
    if (window.lucide) window.lucide.createIcons();
  }

  async function runVoice(txt) {
    const p = MJ.parseVoice(state, whatIf, txt); if (!p) return toast('Enter or dictate a command first!', 'error');
    const b = $('voice-parse-result'); b.classList.remove('hidden');
    b.innerHTML = '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] font-bold text-slate-500 uppercase">1. Speech Diff</div><div class="text-slate-800 mt-1">' + p.highlightedRaw + '</div></div><div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] font-bold text-slate-500 uppercase">2. Extracted JSON</div><pre class="text-[10px] font-mono text-slate-700 whitespace-pre-wrap mt-1">' + MJ.esc(JSON.stringify(p.payload, null, 2)) + '</pre></div><div class="p-3 rounded-xl bg-teal-50 border border-teal-200"><div class="text-[10px] font-bold text-teal-800 uppercase">3. Action Executed</div><div class="text-teal-950 font-semibold mt-1">' + MJ.esc(p.summary) + '</div></div>';
    logAct('VOICE', p.intent + ': ' + p.summary);
    if (p.intent === 'WHAT_IF_SIMULATION') { Object.assign(whatIf, p.params); MJ.saveState(state); switchTab('whatif'); toast('What-If Simulator updated!'); if (MJ.speak) MJ.speak(p.summary); }
    else if (p.intent === 'LOG_TRANSACTION') { state.transactions.unshift(p.tx); MJ.saveState(state); switchTab('ingest'); toast('Logged ' + MJ.fmtINR(p.tx.amount)); }
    else { state.chatLog.push({ role: 'user', text: p.original }); const r = await MJ.coachReply(state, p.original); state.chatLog.push({ role: 'coach', type: r.type, text: r.text }); MJ.saveState(state); switchTab('report'); toast(r.type === 'guardrail' ? 'SEBI-Safe Guardrail triggered!' : 'Coach replied!', r.type === 'guardrail' ? 'indigo' : 'normal'); }
  }

  document.querySelectorAll('.nav-item, .mob-nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  window.addEventListener('hashchange', () => switchTab(location.hash.replace('#/', '') || 'overview'));
  $('judge-tour-btn').addEventListener('click', () => $('judge-tour-banner').classList.toggle('hidden'));
  $('close-tour-btn').addEventListener('click', () => $('judge-tour-banner').classList.add('hidden'));
  document.querySelectorAll('.tour-step-btn').forEach(b => b.addEventListener('click', () => {
    const s = b.dataset.tourStep;
    if (s === '1') { const t = 'Uhh what if I cut Swiggy dining out by 30%... wait no 40%, and my rent goes up by 3000?'; $('voice-command-input').value = t; runVoice(t); }
    else if (s === '2') { switchTab('ingest'); $('load-sample-sms-btn').click(); toast('Sample SMS loaded — click Parse or edit UPI/SHARMA_DAIRY!'); }
    else if (s === '3') { switchTab('subscriptions'); toast('Inspect the +18% JioFiber MoM hike & 2 unused subs!'); }
    else if (s === '4') { const t = 'Should I invest ₹50,000 in Tata Motors or Bitcoin right now?'; $('voice-command-input').value = t; runVoice(t); }
  }));
  $('open-add-tx-btn').addEventListener('click', () => $('add-tx-modal').classList.replace('hidden', 'flex'));
  $('close-add-tx-btn').addEventListener('click', () => $('add-tx-modal').classList.replace('flex', 'hidden'));
  $('save-quick-tx-btn').addEventListener('click', () => {
    const m = $('quick-merchant').value.trim().toUpperCase(), a = Number($('quick-amount').value) || 0;
    if (!m || a <= 0) return toast('Enter merchant & amount!', 'error');
    const cat = MJ.categorize(state, m).category;
    state.transactions.unshift({ id: 'tq_' + Date.now(), date: '2026-11-21', month: '2026-11', merchant: m, raw: 'Manual entry', amount: a, category: cat, source: 'Quick Add' });
    $('quick-merchant').value = ''; $('quick-amount').value = ''; $('add-tx-modal').classList.replace('flex', 'hidden');
    MJ.saveState(state); renderAll(); toast('Added ' + MJ.fmtINR(a) + ' (' + cat + ')');
  });
  $('xray-fix-btn').addEventListener('click', () => { whatIf.diningCut = 30; whatIf.cancelUnused = true; switchTab('whatif'); toast('Simulated 30% Dining trim + cancelling unused subs!'); });
  $('run-voice-cmd-btn').addEventListener('click', () => runVoice($('voice-command-input').value));
  $('voice-command-input').addEventListener('keydown', e => { if (e.key === 'Enter') runVoice(e.target.value); });
  document.querySelectorAll('.voice-preset-btn').forEach(b => b.addEventListener('click', () => {
    const map = { whatif: 'Uhh what if I cut Swiggy dining out by 30%... wait no 40%, and my rent goes up by 3000?', expense: 'Uhh please log 850... actually 650 rupees at Chaayos today', guardrail: 'Should I put ₹50,000 in Tata Motors or Bitcoin right now?' };
    $('voice-command-input').value = map[b.dataset.voicePreset]; runVoice(map[b.dataset.voicePreset]);
  }));
  $('mic-btn').addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Focus input box & dictate via Wispr Flow!', 'indigo'); $('voice-command-input').focus(); return; }
    const rec = new SR(); rec.lang = 'en-IN'; $('mic-btn').classList.add('pulse-mic');
    rec.onresult = ev => { const t = ev.results[0][0].transcript; $('voice-command-input').value = t; runVoice(t); };
    rec.onend = () => $('mic-btn').classList.remove('pulse-mic');
    rec.start();
  });
  $('nudges-list').addEventListener('click', e => { const b = e.target.closest('.nudge-btn'); if (!b) return; if (b.dataset.nudge === 'sim-dining') { whatIf.diningCut = 30; switchTab('whatif'); } else if (b.dataset.nudge === 'sim-shopping') { whatIf.shoppingCut = 30; switchTab('whatif'); } else if (b.dataset.nudge === 'goto-subs') switchTab('subscriptions'); else switchTab('ingest'); });
  $('load-sample-sms-btn').addEventListener('click', () => { $('messy-input').value = 'Rs.540.00 debited from A/c XX4821 via UPI to ZOMATO@okaxis on 20-Nov-26\nINR 410 sent to RAMU_KAKA via GPay on 20-Nov-26\nRs.85,000.00 credited to A/c XX4821 salary credited on 01-Nov-26\n2026-11-21, RAPIDO AUTO RIDE, 185'; });
  $('parse-ingest-btn').addEventListener('click', () => {
    const res = MJ.parseLines(state, $('messy-input').value);
    if (!res.added.length) return toast(res.skippedCredits ? 'Skipped ' + res.skippedCredits + ' credit SMS.' : 'No debit amounts found!', 'error');
    state.transactions = res.added.concat(state.transactions); $('messy-input').value = '';
    logAct('INGEST', 'Parsed ' + res.added.length + ' debits' + (res.skippedCredits ? ' (skipped ' + res.skippedCredits + ' credits)' : ''));
    MJ.saveState(state); renderAll(); toast('Ingested ' + res.added.length + ' debits!' + (res.skippedCredits ? ' (' + res.skippedCredits + ' credit skipped)' : ''));
  });
  $('csv-file-input').addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.name.toLowerCase().endsWith('.pdf') && window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        let txt = ''; for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { const pg = await pdf.getPage(i); txt += (await pg.getTextContent()).items.map(x => x.str).join(' ') + '\n'; }
        $('messy-input').value = txt.trim(); return toast('Extracted text from PDF — click Parse!');
      } catch (err) { return toast('Could not read scanned/encrypted PDF — paste text or CSV.', 'error'); }
    }
    const r = new FileReader(); r.onload = () => { $('messy-input').value = String(r.result || ''); toast('Loaded ' + f.name + ' — click Parse!'); }; r.readAsText(f);
  });
  $('ledger-search').addEventListener('input', renderAll); $('ledger-cat-filter').addEventListener('change', renderAll);
  $('ledger-tbody').addEventListener('change', e => {
    const sel = e.target.closest('.tx-cat-select'); if (!sel) return;
    const tx = state.transactions.find(t => t.id === sel.dataset.txId); if (!tx) return;
    const nk = MJ.normKey(tx.merchant).replace(/^UPI\s+/, '').split(' ')[0];
    if (nk && nk.length >= 3) {
      state.learnedRules[nk] = sel.value; let cnt = 0;
      state.transactions.forEach(x => { if (MJ.normKey(x.merchant).includes(nk)) { x.category = sel.value; cnt++; } });
      logAct('RULE', 'Learned "' + nk + '" -> ' + sel.value + ' (' + cnt + ' tx updated)');
      MJ.saveState(state); renderAll(); toast('Learned Rule: "' + nk + '" -> ' + sel.value, 'indigo');
    } else { tx.category = sel.value; MJ.saveState(state); renderAll(); }
  });
  $('learned-rules-list').addEventListener('click', e => { const b = e.target.closest('.del-rule-btn'); if (!b) return; delete state.learnedRules[b.dataset.delRule]; MJ.saveState(state); renderAll(); });
  $('subscriptions-grid').addEventListener('click', e => { const b = e.target.closest('.toggle-sub-btn'); if (!b) return; const k = b.dataset.subKey; state.subUsageStatus[k] = state.subUsageStatus[k] === 'unused' ? 'active' : 'unused'; MJ.saveState(state); renderAll(); });
  ['prof-income','prof-rent','prof-emi','prof-emergency'].forEach(id => $(id).addEventListener('input', e => { const v = Math.max(0, Number(e.target.value) || 0); if (id === 'prof-income') state.profile.income = v; if (id === 'prof-rent') state.profile.rent = v; if (id === 'prof-emi') state.profile.emi = v; if (id === 'prof-emergency') state.profile.emergencyFund = v; MJ.saveState(state); renderAll(); }));
  $('add-goal-btn').addEventListener('click', () => { const n = $('new-goal-name').value.trim(), t = Number($('new-goal-target').value) || 0, d = $('new-goal-date').value || '2027-12'; if (!n || t <= 0) return toast('Enter goal name & target!', 'error'); state.goals.push({ id: 'g_' + Date.now(), name: n, target: t, saved: 0, targetDate: d }); $('new-goal-name').value = ''; $('new-goal-target').value = ''; MJ.saveState(state); renderAll(); });
  $('goals-editor-list').addEventListener('click', e => { const b = e.target.closest('.del-goal-btn'); if (!b) return; state.goals = state.goals.filter(g => g.id !== b.dataset.delGoal); MJ.saveState(state); renderAll(); });
  ['sim-dining-cut','sim-shopping-cut','sim-rent-delta','sim-income-delta'].forEach(id => $(id).addEventListener('input', e => { const v = Number(e.target.value) || 0; if (id === 'sim-dining-cut') whatIf.diningCut = v; if (id === 'sim-shopping-cut') whatIf.shoppingCut = v; if (id === 'sim-rent-delta') whatIf.rentDelta = v; if (id === 'sim-income-delta') whatIf.incomeDelta = v; renderAll(); }));
  $('sim-cancel-unused').addEventListener('change', e => { whatIf.cancelUnused = e.target.checked; renderAll(); });
  $('reset-whatif-btn').addEventListener('click', () => { whatIf = { diningCut: 0, shoppingCut: 0, rentDelta: 0, incomeDelta: 0, cancelUnused: false }; renderAll(); });
  $('print-report-btn').addEventListener('click', () => window.print());
  $('export-json-btn').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); a.download = 'munshiji_ledger.json'; a.click(); });
  async function askCoach(q) { const t = String(q || '').trim(); if (!t) return; state.chatLog.push({ role: 'user', text: t }); $('coach-input').value = ''; renderAll(); const r = await MJ.coachReply(state, t); state.chatLog.push({ role: 'coach', type: r.type, text: r.text }); MJ.saveState(state); renderAll(); if (MJ.speak) MJ.speak(r.text); }
  $('coach-send-btn').addEventListener('click', () => askCoach($('coach-input').value));
  $('coach-input').addEventListener('keydown', e => { if (e.key === 'Enter') askCoach(e.target.value); });
  document.querySelectorAll('.coach-quick-btn').forEach(b => b.addEventListener('click', () => askCoach(b.dataset.coachQ)));
  const openSet = () => { $('api-key-input').value = state.apiKey || ''; $('settings-modal').classList.replace('hidden', 'flex'); };
  $('open-settings-btn').addEventListener('click', openSet); $('mob-settings-btn').addEventListener('click', openSet);
  $('close-settings-btn').addEventListener('click', () => $('settings-modal').classList.replace('flex', 'hidden'));
  $('save-settings-btn').addEventListener('click', () => { state.apiKey = $('api-key-input').value.trim(); MJ.saveState(state); $('settings-modal').classList.replace('flex', 'hidden'); renderAll(); toast('Settings saved!'); });
  $('clear-key-btn').addEventListener('click', () => { state.apiKey = ''; $('api-key-input').value = ''; MJ.saveState(state); renderAll(); toast('Running 100% zero-API mode.'); });
  $('reset-demo-btn').addEventListener('click', () => { state = MJ.defaultState(); whatIf = { diningCut: 0, shoppingCut: 0, rentDelta: 0, incomeDelta: 0, cancelUnused: false }; MJ.saveState(state); $('settings-modal').classList.replace('flex', 'hidden'); renderAll(); toast('Demo reset!'); });

  $('tts-toggle-btn').addEventListener('click', () => { MJ.ttsEnabled = !MJ.ttsEnabled; $('tts-toggle-btn').textContent = MJ.ttsEnabled ? 'Voice Reply: ON' : 'Voice Reply: OFF'; $('tts-toggle-btn').className = MJ.ttsEnabled ? 'text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-700 text-white transition' : 'text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition'; toast(MJ.ttsEnabled ? 'Voice Read-Aloud ON!' : 'Voice Read-Aloud OFF'); if (MJ.ttsEnabled) MJ.speak('Voice replies enabled. Ask MunshiJi anything.'); });
  document.querySelectorAll('.stress-btn').forEach(b => b.addEventListener('click', () => { MJ.applyStressTest(b.dataset.stress, whatIf, MJ.computeFinancials(state), state, toast); if (b.dataset.stress === 'monk' || b.dataset.stress === 'hike') MJ.celebrate(); renderAll(); }));
  $('theme-toggle-btn').addEventListener('click', () => { document.body.classList.toggle('dark-pro'); toast(document.body.classList.contains('dark-pro') ? 'Dark Pro Mode ON' : 'Light Mode ON'); });
  switchTab(location.hash.replace('#/', '') || 'overview');
})();
