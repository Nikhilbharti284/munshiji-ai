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
