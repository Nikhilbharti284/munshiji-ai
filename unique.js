window.MJ = window.MJ || {};

MJ.calcImpulse = function (state, fin, itemName, price) {
  const amt = Math.max(0, Number(price) || 0);
  const hourly = Math.max(50, (Number(state.profile.income) || 85000) / 176);
  const hours = Number((amt / hourly).toFixed(1));
  const workdays = Number((hours / 8).toFixed(1));
  const opp10yr = Math.round(amt * Math.pow(1.12, 10));
  const surplus = Math.max(1000, fin.surplus);
  const goalDelayMo = Number((amt / (surplus * 0.5)).toFixed(1));
  const verdict = amt > surplus * 0.35
    ? { label: '48-Hour Cooling-Off Recommended', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    : amt > surplus * 0.15
      ? { label: 'Proceed With Caution', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
      : { label: 'Safe Within Monthly Surplus', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  return { item: itemName || 'This Purchase', amt, hourly: Math.round(hourly), hours, workdays, opp10yr, goalDelayMo, verdict };
};

MJ.getSpendDNA = function (fin, subs) {
  const diningPct = fin.variableTotal > 0 ? Math.round(((fin.byCat['Dining & Delivery'] || 0) / fin.variableTotal) * 100) : 0;
  const unusedCount = subs.filter(s => s.status === 'unused').length;
  if (fin.savingsRate >= 40 && unusedCount === 0) return { title: 'Stealth Wealth Architect', tag: 'Top 5% Saver Discipline', desc: 'High savings velocity with zero zombie subscriptions.' };
  if (diningPct >= 22) return { title: 'Convenience-First Foodie', tag: diningPct + '% Variable Spend on Dining', desc: 'Strong income, but delivery convenience is quietly delaying goals.' };
  if (unusedCount >= 2) return { title: 'Silent Subscription Collector', tag: unusedCount + ' Unused Recurring Plans', desc: 'Autopay leaks are silently draining thousands every year.' };
  return { title: 'Balanced Money Strategist', tag: fin.savingsRate + '% Savings Rate', desc: 'Solid core cashflow with room to optimize emergency runway.' };
};

MJ.downloadDNACard = function (fin, subs) {
  const dna = MJ.getSpendDNA(fin, subs);
  const c = document.createElement('canvas'); c.width = 960; c.height = 500;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 960, 500);
  grad.addColorStop(0, '#00205C'); grad.addColorStop(1, '#0077B6');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 500);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(48, 48, 864, 404);
  ctx.fillStyle = '#7DD3FC'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText((MJ.BRAND ? MJ.BRAND.brandName : 'MUNSHIJI OS').toUpperCase() + '  •  MONEY DNA CARD (PRIVACY-SAFE)', 82, 102);
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 46px sans-serif'; ctx.fillText(dna.title, 82, 175);
  ctx.fillStyle = '#E0F2FE'; ctx.font = '24px sans-serif'; ctx.fillText(dna.desc, 82, 222);
  [['SAVINGS RATE', fin.savingsRate + '%'], ['EMERGENCY RUNWAY', fin.runwayMonths + ' Months'], ['PRIVACY MODE', '100% Zero-Cloud']].forEach((m, i) => {
    const x = 82 + i * 270;
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x, 275, 246, 118);
    ctx.fillStyle = '#BAE6FD'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(m[0], x + 20, 312);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(m[1], x + 20, 362);
  });
  ctx.fillStyle = '#93C5FD'; ctx.font = '18px sans-serif';
  ctx.fillText('Generated 100% offline in browser • Zero bank login required', 82, 430);
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'my_money_dna_card.png'; a.click();
};
