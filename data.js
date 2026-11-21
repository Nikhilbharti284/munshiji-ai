window.MJ = window.MJ || {};
MJ.STORAGE_KEY = 'munshiji_ai_modular_v1';
MJ.CATEGORIES = [
  'Dining & Delivery', 'Groceries & Kirana', 'Subscriptions & OTT',
  'Rent & Utilities', 'Travel & Commute', 'Shopping & Lifestyle',
  'Health & Fitness', 'Investments & SIP', 'Transfers & Uncategorized'
];
MJ.BUDGETS = {
  'Dining & Delivery': 5000, 'Groceries & Kirana': 7000,
  'Subscriptions & OTT': 2500, 'Travel & Commute': 4000,
  'Shopping & Lifestyle': 4500, 'Health & Fitness': 2500
};
MJ.BASE_RULES = [
  { kw: 'SWIGGY', cat: 'Dining & Delivery' }, { kw: 'ZOMATO', cat: 'Dining & Delivery' },
  { kw: 'CHAAYOS', cat: 'Dining & Delivery' }, { kw: 'CHAI', cat: 'Dining & Delivery' },
  { kw: 'CAFE', cat: 'Dining & Delivery' }, { kw: 'BLINKIT', cat: 'Groceries & Kirana' },
  { kw: 'ZEPTO', cat: 'Groceries & Kirana' }, { kw: 'KIRANA', cat: 'Groceries & Kirana' },
  { kw: 'NETFLIX', cat: 'Subscriptions & OTT' }, { kw: 'SPOTIFY', cat: 'Subscriptions & OTT' },
  { kw: 'JIOFIBER', cat: 'Subscriptions & OTT' }, { kw: 'HOTSTAR', cat: 'Subscriptions & OTT' },
  { kw: 'PRIME', cat: 'Subscriptions & OTT' }, { kw: 'RENT', cat: 'Rent & Utilities' },
  { kw: 'BESCOM', cat: 'Rent & Utilities' }, { kw: 'UBER', cat: 'Travel & Commute' },
  { kw: 'OLA', cat: 'Travel & Commute' }, { kw: 'RAPIDO', cat: 'Travel & Commute' },
  { kw: 'IRCTC', cat: 'Travel & Commute' }, { kw: 'MYNTRA', cat: 'Shopping & Lifestyle' },
  { kw: 'AMAZON', cat: 'Shopping & Lifestyle' }, { kw: 'FLIPKART', cat: 'Shopping & Lifestyle' },
  { kw: 'CULT', cat: 'Health & Fitness' }, { kw: 'GROWW', cat: 'Investments & SIP' },
  { kw: 'ZERODHA', cat: 'Investments & SIP' }, { kw: 'SIP', cat: 'Investments & SIP' }
];
MJ.defaultState = function () {
  return {
    apiKey: '',
    profile: { income: 85000, rent: 22000, emi: 14000, emergencyFund: 120000, targetEmergencyMonths: 6 },
    goals: [
      { id: 'g1', name: '6-Month Emergency Fund', target: 240000, saved: 120000, targetDate: '2027-06' },
      { id: 'g2', name: 'Goa Friends Trip', target: 45000, saved: 15000, targetDate: '2027-02' },
      { id: 'g3', name: 'MacBook / Bike Downpayment', target: 110000, saved: 30000, targetDate: '2027-10' }
    ],
    learnedRules: { 'RAMU_KAKA': 'Groceries & Kirana' },
    subUsageStatus: {
      'CULT FIT PASS': 'unused', 'DISNEY HOTSTAR': 'unused',
      'NETFLIX INDIA': 'active', 'JIOFIBER BROADBAND': 'active', 'SPOTIFY INDIA': 'active'
    },
    activityLog: [
      { time: 'Init', badge: 'RULE', text: 'Pre-loaded learned rule: RAMU_KAKA -> Groceries & Kirana' },
      { time: 'Init', badge: 'RADAR', text: 'Detected +18% MoM hike on JIOFIBER BROADBAND (₹999 -> ₹1,179)' }
    ],
    transactions: [
      { id: 't1', date: '2026-11-19', month: '2026-11', merchant: 'SWIGGY INSTAMART', raw: 'UPI/SWIGGY', amount: 1180, category: 'Dining & Delivery', source: 'UPI SMS' },
      { id: 't2', date: '2026-11-18', month: '2026-11', merchant: 'ZOMATO ORDER', raw: 'HDFC UPI/ZOMATO', amount: 890, category: 'Dining & Delivery', source: 'HDFC SMS' },
      { id: 't3', date: '2026-11-16', month: '2026-11', merchant: 'ZOMATO DINING', raw: 'UPI/ZOMATO', amount: 1450, category: 'Dining & Delivery', source: 'UPI SMS' },
      { id: 't4', date: '2026-11-15', month: '2026-11', merchant: 'SWIGGY LATE NIGHT', raw: 'UPI/SWIGGY', amount: 720, category: 'Dining & Delivery', source: 'UPI SMS' },
      { id: 't5', date: '2026-11-14', month: '2026-11', merchant: 'BLINKIT GROCERIES', raw: 'UPI/BLINKIT', amount: 2340, category: 'Groceries & Kirana', source: 'CSV' },
      { id: 't6', date: '2026-11-12', month: '2026-11', merchant: 'UPI/SHARMA_DAIRY', raw: 'Sent to SHARMA_DAIRY', amount: 960, category: 'Transfers & Uncategorized', source: 'PhonePe SMS' },
      { id: 't7', date: '2026-11-10', month: '2026-11', merchant: 'MYNTRA FASHION', raw: 'ICICI CC/MYNTRA', amount: 3950, category: 'Shopping & Lifestyle', source: 'PDF Paste' },
      { id: 't8', date: '2026-11-09', month: '2026-11', merchant: 'UBER INDIA', raw: 'UPI/UBER', amount: 1640, category: 'Travel & Commute', source: 'UPI SMS' },
      { id: 't9', date: '2026-11-07', month: '2026-11', merchant: 'JIOFIBER BROADBAND', raw: 'AUTOPAY/JIOFIBER', amount: 1179, category: 'Subscriptions & OTT', source: 'HDFC SMS' },
      { id: 't10', date: '2026-11-05', month: '2026-11', merchant: 'NETFLIX INDIA', raw: 'SI/NETFLIX', amount: 649, category: 'Subscriptions & OTT', source: 'HDFC SMS' },
      { id: 't11', date: '2026-11-04', month: '2026-11', merchant: 'CULT.FIT PASS', raw: 'AUTOPAY/CULT.FIT', amount: 1499, category: 'Health & Fitness', source: 'CSV' },
      { id: 't12', date: '2026-11-03', month: '2026-11', merchant: 'DISNEY+ HOTSTAR', raw: 'UPI/HOTSTAR', amount: 299, category: 'Subscriptions & OTT', source: 'UPI SMS' },
      { id: 't13', date: '2026-11-02', month: '2026-11', merchant: 'SPOTIFY INDIA', raw: 'UPI/SPOTIFY', amount: 119, category: 'Subscriptions & OTT', source: 'UPI SMS' },
      { id: 't14', date: '2026-11-02', month: '2026-11', merchant: 'RAMU_KAKA KIRANA', raw: 'UPI/RAMU_KAKA', amount: 1280, category: 'Groceries & Kirana', source: 'GPay SMS' },
      { id: 't15', date: '2026-10-07', month: '2026-10', merchant: 'JIOFIBER BROADBAND', raw: 'AUTOPAY/JIOFIBER', amount: 999, category: 'Subscriptions & OTT', source: 'HDFC SMS' },
      { id: 't16', date: '2026-10-05', month: '2026-10', merchant: 'NETFLIX INDIA', raw: 'SI/NETFLIX', amount: 649, category: 'Subscriptions & OTT', source: 'HDFC SMS' },
      { id: 't17', date: '2026-10-04', month: '2026-10', merchant: 'CULT.FIT PASS', raw: 'AUTOPAY/CULT.FIT', amount: 1499, category: 'Health & Fitness', source: 'CSV' },
      { id: 't18', date: '2026-10-03', month: '2026-10', merchant: 'DISNEY+ HOTSTAR', raw: 'UPI/HOTSTAR', amount: 299, category: 'Subscriptions & OTT', source: 'UPI SMS' },
      { id: 't19', date: '2026-10-02', month: '2026-10', merchant: 'SPOTIFY INDIA', raw: 'UPI/SPOTIFY', amount: 119, category: 'Subscriptions & OTT', source: 'UPI SMS' }
    ],
    chatLog: [{ role: 'coach', type: 'normal', text: 'Welcome to MunshiJi AI! Ask about your emergency runway, spending drift, or test my SEBI-safe guardrail by asking for a stock or crypto tip.' }]
  };
};
MJ.fmtINR = n => { const v = Math.round(Number(n) || 0); return (v < 0 ? '-' : '') + '₹' + Math.abs(v).toLocaleString('en-IN'); };
MJ.esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
MJ.normKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9_ ]/g, ' ').replace(/\s+/g, ' ').trim();
MJ.loadState = () => { try { const r = localStorage.getItem(MJ.STORAGE_KEY); if (r) { const p = JSON.parse(r); if (p && p.profile && Array.isArray(p.transactions)) return p; } } catch (e) {} return MJ.defaultState(); };
MJ.saveState = st => { try { localStorage.setItem(MJ.STORAGE_KEY, JSON.stringify(st)); } catch (e) {} };
