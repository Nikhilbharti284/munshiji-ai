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
MJ.verifyLicense = async keyStr => {
  const k = String(keyStr || '').trim().toUpperCase();
  return /^MJPRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k) ? { valid: true, note: 'Pro Lifetime Unlocked!' } : { valid: false, note: 'Invalid key (try demo: MJPRO-DEMO-2026)' };
};
