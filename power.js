window.MJ = window.MJ || {};
MJ.ttsEnabled = false;

MJ.speak = function (text) {
  if (!MJ.ttsEnabled || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text || '').slice(0, 260));
    u.lang = 'en-IN'; u.rate = 1.04;
    window.speechSynthesis.speak(u);
  } catch (e) {}
};

MJ.renderCategoryBars = function (fin) {
  const el = document.getElementById('category-pulse-bars');
  if (!el) return;
  el.innerHTML = Object.keys(MJ.BUDGETS).map(cat => {
    const spent = fin.byCat[cat] || 0, cap = MJ.BUDGETS[cat];
    const pct = Math.min(100, Math.round((spent / Math.max(1, cap)) * 100));
    const barCol = pct >= 95 ? 'bg-rose-600' : pct >= 78 ? 'bg-amber-500' : 'bg-teal-600';
    return '<div class="space-y-1"><div class="flex justify-between text-xs"><span class="font-medium text-slate-700">' + MJ.esc(cat) + '</span><span class="font-semibold text-slate-900">' + MJ.fmtINR(spent) + ' <span class="text-slate-400 font-normal">/ ' + MJ.fmtINR(cap) + ' (' + pct + '%)</span></span></div><div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="' + barCol + ' h-full rounded-full transition-all duration-300" style="width:' + pct + '%"></div></div></div>';
  }).join('');
};

MJ.renderProjectionChart = function (state, fin, deltaMo) {
  const canvas = document.getElementById('wealth-proj-chart');
  if (!canvas || !window.Chart) return;
  const labels = ['Now','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
  const start = Number(state.profile.emergencyFund) || 0;
  const baseArr = [], simArr = [];
  for (let i = 0; i < 12; i++) {
    baseArr.push(Math.round(start + Math.max(0, fin.surplus) * i));
    simArr.push(Math.round(start + Math.max(0, fin.surplus + deltaMo) * i));
  }
  const extra12 = simArr[11] - baseArr[11];
  const badge = document.getElementById('proj-12m-delta');
  if (badge) {
    badge.textContent = (extra12 >= 0 ? '+' : '') + MJ.fmtINR(extra12) + ' in 12 mo';
    badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full ' + (extra12 >= 0 ? 'bg-teal-50 text-teal-800' : 'bg-rose-50 text-rose-700');
  }
  if (MJ._projChart) MJ._projChart.destroy();
  MJ._projChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Current Path (₹)', data: baseArr, borderColor: '#94A3B8', borderDash: [5, 4], tension: 0.3, pointRadius: 2 },
        { label: 'What-If Path (₹)', data: simArr, borderColor: '#0F766E', backgroundColor: 'rgba(15,118,110,0.08)', fill: true, tension: 0.3, pointRadius: 3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k' } } } }
  });
};

MJ.applyStressTest = function (key, whatIf, fin, state, toast) {
  if (key === 'monk') {
    whatIf.diningCut = 50; whatIf.shoppingCut = 50; whatIf.rentDelta = 0; whatIf.incomeDelta = 0; whatIf.cancelUnused = true;
    toast('Monk Mode: Dining -50%, Shopping -50%, Unused subs cancelled!');
  } else if (key === 'rentshock') {
    whatIf.diningCut = 0; whatIf.shoppingCut = 0; whatIf.rentDelta = 6000; whatIf.incomeDelta = 0; whatIf.cancelUnused = false;
    toast('Metro Rent Shock: +₹6,000/mo fixed cost modeled!');
  } else if (key === 'hike') {
    whatIf.diningCut = 0; whatIf.shoppingCut = 0; whatIf.rentDelta = 0; whatIf.incomeDelta = 15000; whatIf.cancelUnused = false;
    toast('Salary Hike: +₹15,000/mo surplus modeled!');
  } else if (key === 'layoff') {
    const bareBones = Math.max(1, fin.fixed + 8000);
    const months = ((Number(state.profile.emergencyFund) || 0) / bareBones).toFixed(1);
    const msg = 'Layoff Survival Check: With ₹0 income and bare-bones spend (' + MJ.fmtINR(bareBones) + '/mo), your ' + MJ.fmtINR(state.profile.emergencyFund) + ' emergency fund lasts ' + months + ' months.';
    toast(msg, 'indigo');
    MJ.speak(msg);
  }
};

MJ.celebrate = function () { if (typeof window.confetti === 'function') window.confetti({ particleCount: 55, spread: 60, origin: { y: 0.7 } }); };
MJ.renderGoalRings = function (state, saveAndRender, toast) {
  const el = document.getElementById('goal-rings-grid'); if (!el) return;
  el.innerHTML = (state.goals || []).slice(0, 3).map(g => {
    const pct = Math.min(100, Math.round(((Number(g.saved) || 0) / Math.max(1, Number(g.target) || 1)) * 100));
    const dash = 113 - (113 * pct) / 100;
    return '<div class="pro-card bg-white rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><svg class="w-11 h-11 -rotate-90 shrink-0" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" fill="none" stroke="#E2E8F0" stroke-width="4"/><circle cx="21" cy="21" r="18" fill="none" stroke="#0F766E" stroke-width="4" stroke-linecap="round" stroke-dasharray="113" stroke-dashoffset="' + dash + '"/></svg><div class="min-w-0"><div class="text-xs font-bold text-slate-900 truncate">' + MJ.esc(g.name) + '</div><div class="text-[11px] text-slate-500">' + pct + '% &bull; ' + MJ.fmtINR(g.saved) + ' / ' + MJ.fmtINR(g.target) + '</div></div></div><button type="button" data-boost-goal="' + MJ.esc(g.id) + '" class="boost-goal-btn shrink-0 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold">+₹5k</button></div>';
  }).join('');
  el.querySelectorAll('.boost-goal-btn').forEach(btn => btn.addEventListener('click', () => {
    const g = state.goals.find(x => x.id === btn.dataset.boostGoal); if (!g) return;
    g.saved = Math.min(Number(g.target) || 0, (Number(g.saved) || 0) + 5000);
    saveAndRender(); MJ.celebrate(); toast('Boosted ' + g.name + ' by ₹5,000!');
  }));
};
