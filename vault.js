window.MJ = window.MJ || {};
MJ.deriveKey = async (pw, salt) => {
  const b = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, b, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};
MJ.encryptVault = async (obj, pw) => {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await MJ.deriveKey(pw, salt), new TextEncoder().encode(JSON.stringify(obj)));
  const out = new Uint8Array(28 + c.byteLength); out.set(salt, 0); out.set(iv, 16); out.set(new Uint8Array(c), 28);
  return btoa(String.fromCharCode(...out));
};
MJ.decryptVault = async (b64, pw) => {
  const b = Uint8Array.from(atob(String(b64 || '').trim()), c => c.charCodeAt(0));
  if (b.length < 29) throw new Error('Invalid vault');
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(16, 28) }, await MJ.deriveKey(pw, b.slice(0, 16)), b.slice(28));
  return JSON.parse(new TextDecoder().decode(p));
};

MJ.verifyLicense = async function (keyStr) {
  const k = String(keyStr || '').trim();
  if (!k || k.length < 8) return { valid: false, note: 'Enter a valid license key from your purchase receipt.' };
  const productId = (MJ.BRAND && MJ.BRAND.gumroadProductId) || '';
  if (productId) {
    try {
      const r = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'product_id=' + encodeURIComponent(productId) + '&license_key=' + encodeURIComponent(k)
      });
      const d = await r.json();
      if (d && d.success && !d.purchase?.refunded && !d.purchase?.chargebacked) return { valid: true, note: 'Pro Lifetime License verified via Gumroad!' };
      return { valid: false, note: d?.message || 'License key invalid or refunded.' };
    } catch (e) { return { valid: false, note: 'Could not reach license server.' }; }
  }
  if (MJ.BRAND && MJ.BRAND.lemonSqueezy) {
    try {
      const r = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'license_key=' + encodeURIComponent(k)
      });
      const d = await r.json();
      if (d && d.valid) return { valid: true, note: 'Pro License verified via Lemon Squeezy!' };
      return { valid: false, note: d?.error || 'Invalid Lemon Squeezy key.' };
    } catch (e) { return { valid: false, note: 'License validation failed.' }; }
  }
  return { valid: false, note: 'Add your Gumroad product_id in brandConfig.js to enable live verification.' };
};
