window.MJ = window.MJ || {};
MJ.BRAND = {
  brandName: 'MunshiJi OS',
  tagline: 'Zero-Cloud Living Money OS',
  logoSymbol: '₹',
  primaryHex: '#009ADE',
  currency: 'INR',
  coachName: '',
  gumroadProductId: '', // Paste Gumroad Product ID when live
  lemonSqueezy: false,
  checkoutUrl: 'https://gumroad.com/', // Paste your live Gumroad/LemonSqueezy checkout link here
  sebiDisclaimer: 'Educational money modeling only — not a SEBI-registered investment advisor.'
};
(function () {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('coach')) { MJ.BRAND.brandName = q.get('coach').slice(0, 32); MJ.BRAND.coachName = MJ.BRAND.brandName; MJ.BRAND.tagline = 'Client Financial Planner (SEBI-Safe)'; }
    if (q.get('color') && /^[0-9a-fA-F]{6}$/.test(q.get('color'))) MJ.BRAND.primaryHex = '#' + q.get('color');
    if (q.get('currency') === 'USD') { MJ.BRAND.currency = 'USD'; MJ.BRAND.logoSymbol = '$'; }
    document.documentElement.style.setProperty('--brand', MJ.BRAND.primaryHex);
  } catch (e) {}
})();
MJ.fmtMoney = n => { const v = Math.round(Number(n) || 0), s = v < 0 ? '-' : ''; return MJ.BRAND.currency === 'USD' ? s + '$' + Math.abs(v).toLocaleString('en-US') : s + '₹' + Math.abs(v).toLocaleString('en-IN'); };
