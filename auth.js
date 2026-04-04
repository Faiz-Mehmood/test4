/**
 * auth.js — Shared authentication + Firebase sync for Faiz's personal hub.
 *
 * SECURITY MODEL:
 *  - Password hash is stored in Firestore (hub/config), NOT in this file.
 *  - Even if someone reads the hash from Firestore or your repo, SHA-256
 *    is one-way — it cannot be decoded back to your password.
 *  - The FIREBASE_CONFIG is intentionally public — it only identifies
 *    your project. Real security comes from Firestore Rules (see SECURITY.md).
 *
 * FIRST-TIME SETUP — SET YOUR PASSWORD IN FIRESTORE:
 *  1. Open any page of your live site (or localhost).
 *  2. Open browser DevTools console.
 *  3. Run: await hashPassword('yourActualPassword')
 *  4. Copy the long hex string shown.
 *  5. Firebase Console → Firestore Database → hub collection → config document.
 *     (Create the document if it doesn't exist.)
 *  6. Add a field: passHash = [paste your hex string]
 *  7. Save. Your password is now stored securely. No code changes needed.
 *
 * TO CHANGE YOUR PASSWORD LATER: Just repeat steps 1-7 with a new password.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCdu2TI0_uGBbR7yvOM_c604nxg3Ms3P8s",
  authDomain: "faiz-hub.firebaseapp.com",
  projectId: "faiz-hub",
  storageBucket: "faiz-hub.firebasestorage.app",
  messagingSenderId: "235247285762",
  appId: "1:235247285762:web:15bd1336d2727e8b05d91b"
};

// ── CRYPTO ────────────────────────────────────────────────────────────────────
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── SESSION ───────────────────────────────────────────────────────────────────
function isLoggedIn() { return sessionStorage.getItem('faiz_auth') === 'true'; }
function logout() { sessionStorage.removeItem('faiz_auth'); window.location.href = 'index.html'; }

// ── FIREBASE INIT ─────────────────────────────────────────────────────────────
let _db = null;
function _initFirebase() {
  if (_db) return _db;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
  } catch(e) { console.warn('Firebase not ready – localStorage fallback active.', e); }
  return _db;
}

// ── FIRESTORE HELPERS ─────────────────────────────────────────────────────────
async function dbGet(col, doc) {
  const db = _initFirebase();
  if (db) {
    try { const s = await db.collection(col).doc(doc).get(); return s.exists ? s.data() : null; }
    catch(e) { console.warn('dbGet error', e); }
  }
  const raw = localStorage.getItem(col+'_'+doc);
  return raw ? JSON.parse(raw) : null;
}

async function dbSet(col, doc, data) {
  const db = _initFirebase();
  if (db) {
    try { await db.collection(col).doc(doc).set(data); return; }
    catch(e) { console.warn('dbSet error', e); }
  }
  localStorage.setItem(col+'_'+doc, JSON.stringify(data));
}

function dbListen(col, doc, callback) {
  const db = _initFirebase();
  if (db) {
    return db.collection(col).doc(doc).onSnapshot(
      s => callback(s.exists ? s.data() : null),
      e => console.warn('dbListen error', e)
    );
  }
  const raw = localStorage.getItem(col+'_'+doc);
  callback(raw ? JSON.parse(raw) : null);
  return () => {};
}

// ── LOGIN — hash fetched from Firestore, never hardcoded ──────────────────────
async function checkLogin(pw) {
  const hash = await hashPassword(pw);
  try {
    const db = _initFirebase();
    if (db) {
      const snap = await db.collection('hub').doc('config').get();
      if (snap.exists && snap.data().passHash) {
        return hash === snap.data().passHash;
      }
    }
  } catch(e) {
    console.warn('Could not fetch passHash from Firestore:', e);
  }
  // Fallback: localStorage (for offline/dev use — set via console: localStorage.setItem('faiz_passHash','yourhash'))
  const stored = localStorage.getItem('faiz_passHash');
  if (stored) return hash === stored;

  alert('Password not configured. See auth.js comments for setup instructions.');
  return false;
}

// ── AUTH UI ───────────────────────────────────────────────────────────────────
function applyAuthUI() {
  const loggedIn = isLoggedIn();
  document.querySelectorAll('.owner-only').forEach(el => { el.style.display = loggedIn ? '' : 'none'; });
  document.querySelectorAll('[contenteditable]').forEach(el => {
    el.contentEditable = loggedIn ? 'true' : 'false';
    if (!loggedIn) el.style.borderBottom = 'none';
  });
  document.querySelectorAll('.edit-hint').forEach(el => { el.style.display = loggedIn ? '' : 'none'; });

  const nav = document.querySelector('nav');
  if (!nav) return;
  const existing = nav.querySelector('.auth-btn');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.className = 'auth-btn';
  btn.style.cssText = `font-family:'Space Mono',monospace;font-size:0.6rem;letter-spacing:3px;padding:0.4rem 0.9rem;border-radius:6px;cursor:none;transition:all 0.2s;background:transparent;`;
  if (loggedIn) {
    btn.textContent = 'LOGOUT';
    btn.style.cssText += 'border:1px solid #2a3040;color:#4a6080;';
    btn.onmouseover = () => { btn.style.borderColor='#ff4d6d'; btn.style.color='#ff4d6d'; };
    btn.onmouseout  = () => { btn.style.borderColor='#2a3040'; btn.style.color='#4a6080'; };
    btn.onclick = logout;
  } else {
    btn.textContent = 'OWNER LOGIN';
    btn.style.cssText += 'border:1px solid #1e2a38;color:#4a6080;';
    btn.onmouseover = () => { btn.style.borderColor='var(--accent,#00d4ff)'; btn.style.color='var(--accent,#00d4ff)'; };
    btn.onmouseout  = () => { btn.style.borderColor='#1e2a38'; btn.style.color='#4a6080'; };
    btn.onclick = () => window.location.href = 'login.html?from=' + encodeURIComponent(window.location.pathname.split('/').pop());
  }
  nav.appendChild(btn);
}
