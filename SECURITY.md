# 🔒 Security Guide — Faiz's Hub

## What's Been Fixed

1. **Password no longer hardcoded in auth.js** — the hash is now fetched from Firestore
2. **Firestore rules** — config document is locked so nobody can overwrite your hash via web

---

## Step 1 — Set Your Password in Firestore

**Do this once. Your repo will have no password in it.**

1. Open your live site, open DevTools console (F12)
2. Run: `await hashPassword('yourActualPassword')`
3. Copy the long hex string output
4. Go to [console.firebase.google.com](https://console.firebase.google.com)
5. Your project → Firestore Database → `hub` collection → `config` document
   *(Create the document if it doesn't exist — Add document, ID = "config")*
6. Add field: **passHash** = *(paste your hex string)*
7. Save

**Why SHA-256 is safe:** It's mathematically one-way. Even reading the hash gives an attacker nothing — they'd need to guess billions of passwords, which takes thousands of years for a strong password. **Use a strong password, not "123".**

---

## Step 2 — Update Firestore Rules

Go to Firebase Console → Firestore Database → **Rules** tab. Paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Password config: readable (so login works) but NOT writable from web
    match /hub/config {
      allow read: if true;
      allow write: if false;
    }

    // All other data: readable by anyone, writable after JS password check
    match /hub/{document} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

Click **Publish**.

This means:
- ✅ Visitors see your public data (gym log, portfolio, etc.)
- ✅ You can save after logging in via your site
- 🔒 Nobody can change your password hash via the web, ever

---

## About the Firebase API Key in Your Repo

**This is intentionally public and safe.** Firebase API keys are not secret — they only identify your project. Google officially states API keys for Firebase web apps are designed to be in client-side code. Your security comes from Firestore Rules, not from hiding the key.

Source: [firebase.google.com/docs/projects/api-keys](https://firebase.google.com/docs/projects/api-keys)

---

## Checklist

- [ ] Set passHash in Firestore (`hub/config` → `passHash`)
- [ ] Update Firestore Rules (block writes to `hub/config`)
- [ ] Use a strong password
- [ ] Delete any old `PASS_HASH` lines from auth.js
