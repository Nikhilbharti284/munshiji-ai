window.MJ = window.MJ || {};
MJ.ttsEnabled = true;
MJ._autoTimer = null;

MJ.speak = function (text) {
  if (!MJ.ttsEnabled || !window.speechSynthesis) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text || '').slice(0, 260)); u.lang = 'en-IN'; u.rate = 1.03; window.speechSynthesis.speak(u); } catch (e) {}
};
MJ.celebrate = function () { if (typeof window.confetti === 'function') window.confetti({ particleCount: 60, spread: 65, origin: { y: 0.72 } }); };
MJ.detectScamSMS = text => /(bit\.ly|tinyurl|kyc\s+update|account\s+blocked|claim\s+₹|lottery|click\s+here\s+to\s+verify|pan\s+suspended)/i.test(String(text || ''));

MJ.renderCategoryBars = function (fin) {
  const el = document.getElementById('category-pulse-bars');
  if (el) el.innerHTML = Object.keys(MJ.BUDGETS).map(cat => {
    const spent = fin.byCat[cat] || 0, cap = MJ.BUDGETS[cat], pct = Math.min(100, Math.round((spent / Math.max(1, cap)) * 100));
    const col = pct >= 95 ? 'bg-rose-600' : pct >= 78 ? 'bg-amber-500' : 'bg-teal-600';
    return '<div class="space-y-1"><div class="flex justify-between text-xs"><span class="font-medium text-slate-700">' + MJ.esc(cat) + '</span><span class="font-semibold text-slate-900">' + MJ.fmtINR(spent) + ' <span class="text-slate-400 font-normal">/ ' + MJ.fmtINR(cap) + ' (' + pct + '%)</span></span></div><div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="' + col + ' h-full rounded-full transition-all duration-500" style="width:' + pct + '%"></div></div></div>';
  }).join('');
  const splitEl = document.getElementById('salary-split-bar');
  if (splitEl && fin.income > 0) {
    const needs = Math.min(100, Math.round(((fin.fixed + (fin.byCat['Groceries & Kirana'] || 0) + (fin.byCat['Travel & Commute'] || 0)) / fin.income) * 100));
    const save = Math.max(0, Math.min(100, fin.savingsRate)), wants = Math.max(0, 100 - needs - save);
    splitEl.innerHTML = '<div class="flex h-3 rounded-full overflow-hidden bg-slate-100"><div style="width:' + needs + '%" class="bg-slate-800"></div><div style="width:' + wants + '%" class="bg-amber-500"></div><div style="width:' + save + '%" class="bg-teal-600"></div></div><div class="flex flex-wrap justify-between gap-2 text-[11px] pt-1.5 text-slate-600"><span><b class="text-slate-900">Needs ' + needs + '%</b> (ideal 50%)</span><span><b class="text-amber-700">Wants ' + wants + '%</b> (ideal 30%)</span><span><b class="text-teal-700">Savings ' + save + '%</b> (ideal 20%+)</span></div>';
  }
};

MJ.renderGoalRings = function (state, saveAndRender, toast) {
  const el = document.getElementById('goal-rings-grid'); if (!el) return;
  const icons = ['🛡️', '🌴', '💻'];
  el.innerHTML = (state.goals || []).slice(0, 3).map((g, i) => {
    const pct = Math.min(100, Math.round(((Number(g.saved) || 0) / Math.max(1, Number(g.target) || 1)) * 100)), dash = 113 - (113 * pct) / 100;
    return '<div class="pro-card bg-white rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between gap-2.5"><div class="flex items-center gap-3 min-w-0"><div class="relative w-12 h-12 shrink-0 flex items-center justify-center"><svg class="w-12 h-12 -rotate-90" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" fill="none" stroke="#E2E8F0" stroke-width="4"/><circle cx="21" cy="21" r="18" fill="none" stroke="#0F766E" stroke-width="4" stroke-linecap="round" stroke-dasharray="113" stroke-dashoffset="' + dash + '"/></svg><span class="absolute text-sm">' + (icons[i] || '🎯') + '</span></div><div class="min-w-0"><div class="text-xs font-bold text-slate-900 truncate">' + MJ.esc(g.name) + '</div><div class="text-[11px] text-slate-500">' + pct + '% &bull; ' + MJ.fmtINR(g.saved) + ' / ' + MJ.fmtINR(g.target) + '</div></div></div><button type="button" data-boost-goal="' + MJ.esc(g.id) + '" class="boost-goal-btn shrink-0 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold">+₹5k</button></div>';
  }).join('');
  el.querySelectorAll('.boost-goal-btn').forEach(btn => btn.addEventListener('click', () => {
    const g = state.goals.find(x => x.id === btn.dataset.boostGoal); if (!g) return;
    g.saved = Math.min(Number(g.target) || 0, (Number(g.saved) || 0) + 5000);
    saveAndRender(); MJ.celebrate(); toast('Boosted ' + g.name + ' by ₹5,000!');
  }));
};

MJ.renderProjectionChart = function (state, fin, deltaMo) {
  const canvas = document.getElementById('wealth-proj-chart'); if (!canvas || !window.Chart) return;
  const labels = ['Now','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'], start = Number(state.profile.emergencyFund) || 0;
  const baseArr = [], simArr = [];
  for (let i = 0; i < 12; i++) { baseArr.push(Math.round(start + Math.max(0, fin.surplus) * i)); simArr.push(Math.round(start + Math.max(0, fin.surplus + deltaMo) * i)); }
  const extra12 = simArr[11] - baseArr[11], badge = document.getElementById('proj-12m-delta');
  if (badge) badge.textContent = (extra12 >= 0 ? '+' : '') + MJ.fmtINR(extra12) + ' in 12 mo';
  if (MJ._projChart) MJ._projChart.destroy();
  MJ._projChart = new Chart(canvas, { type: 'line', data: { labels, datasets: [{ label: 'Current (₹)', data: baseArr, borderColor: '#94A3B8', borderDash: [5,4], tension: .3, pointRadius: 2 }, { label: 'What-If (₹)', data: simArr, borderColor: '#0F766E', backgroundColor: 'rgba(15,118,110,.10)', fill: true, tension: .3, pointRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => '₹' + Math.round(v/1000) + 'k' } } } } });
};

MJ.applyStressTest = function (key, whatIf, fin, state, toast) {
  if (key === 'monk') { Object.assign(whatIf, { diningCut: 50, shoppingCut: 50, rentDelta: 0, incomeDelta: 0, cancelUnused: true }); toast('Monk Mode activated!'); MJ.celebrate(); }
  else if (key === 'rentshock') { Object.assign(whatIf, { diningCut: 0, shoppingCut: 0, rentDelta: 6000, incomeDelta: 0, cancelUnused: false }); toast('Rent Shock +₹6,000/mo modeled!'); }
  else if (key === 'hike') { Object.assign(whatIf, { diningCut: 0, shoppingCut: 0, rentDelta: 0, incomeDelta: 15000, cancelUnused: false }); toast('Salary Hike +₹15,000/mo modeled!'); MJ.celebrate(); }
  else if (key === 'layoff') { const b = Math.max(1, fin.fixed + 8000), m = ((Number(state.profile.emergencyFund) || 0) / b).toFixed(1); const msg = 'Layoff Survival Check: With zero income, your emergency fund lasts ' + m + ' months.'; toast(msg, 'indigo'); MJ.speak(msg); }
};

MJ.runAutoDemo = function (cb) {
  if (MJ._autoTimer) { MJ._autoTimer.forEach(clearTimeout); MJ._autoTimer = null; if (window.speechSynthesis) window.speechSynthesis.cancel(); cb.onStatus('Auto-Demo stopped.'); return false; }
  const steps = [
    { ms: 0, msg: 'Step 1 of 5: Welcome to MunshiJi AI. Here is your live dashboard, Rupee Leak X-Ray, and 50 30 20 salary split.', fn: cb.s1 },
    { ms: 7500, msg: 'Step 2 of 5: Messy voice self-correction. Cutting Swiggy 30 percent, wait no 40 percent, and rent plus 3000 updates the What-If simulator and 12-month wealth chart live.', fn: cb.s2 },
    { ms: 16500, msg: 'Step 3 of 5: Multi-format bank SMS, CSV, and PDF ingestion automatically skips salary credits and learns permanent merchant rules.', fn: cb.s3 },
    { ms: 24500, msg: 'Step 4 of 5: Subscription Radar flags an 18 percent JioFiber price hike and 21,576 rupees per year in unused subscriptions.', fn: cb.s4 },
    { ms: 32500, msg: 'Step 5 of 5: Hard SEBI-safe guardrails strictly refuse specific stock or crypto tips and redirect to safe financial education.', fn: cb.s5 }
  ];
  MJ._autoTimer = steps.map((st, i) => setTimeout(() => { st.fn(); cb.onStatus(st.msg); MJ.speak(st.msg); if (i === steps.length - 1) { MJ._autoTimer = null; MJ.celebrate(); } }, st.ms));
  return true;
};
