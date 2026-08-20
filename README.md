# Masjid Contribution Tracker — Live Version

A free, live-updating web app: anyone with the link sees who has paid each
month's ₦1,000 contribution, admins can mark payments, and each member can
check their own record with a name + PIN.

## How it works
- **Storage:** Firebase Firestore (free tier — plenty for 90+ members).
- **Admin login:** a real Firebase email/password account. Only signed-in
  admins can edit data.
- **Member check:** members pick their name and enter a PIN you give them.
  This is a convenience, not a secret lock — the payment data is meant to be
  publicly visible anyway (that's the whole point), so don't reuse a PIN
  someone uses elsewhere.

## One-time setup (15–20 minutes)

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com → **Add project** → give it a
   name (e.g. `mssn-masjid-fund`) → finish the wizard (you can turn off
   Google Analytics, it's not needed).
2. Once created, click the **`</>`** (web) icon to register a web app.
   Give it a nickname, skip Firebase Hosting (you're using GitHub Pages).
3. Firebase will show you a `firebaseConfig` object. Copy it.

### 2. Turn on Firestore
1. In the left sidebar: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode**, pick any region close to Nigeria
   (e.g. `eur3` or `europe-west`), click Enable.
3. Go to the **Rules** tab and replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /members/{memberId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

This makes the data **publicly readable** (so anyone with the link sees the
list) but **only writable by a signed-in admin**. Click **Publish**.

### 3. Turn on Admin login
1. Left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user** → enter the admin's email and a
   password. Repeat for each admin you want. This is what they'll type into
   the app's Admin tab.

### 4. Add your Firebase config to the app
Open `assets/firebase-config.js` in this folder and paste in the values
Firebase gave you in step 1, e.g.:

```js
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mssn-masjid-fund.firebaseapp.com",
  projectId: "mssn-masjid-fund",
  storageBucket: "mssn-masjid-fund.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Also set `CONTRIBUTION_START` to the year/month the contribution began — the
app auto-generates every month from there to today.

### 5. Put it on GitHub Pages
1. Create a new GitHub repo (e.g. `masjid-fund-tracker`), upload everything
   in this folder (`index.html`, `assets/`) keeping the same structure.
2. Repo **Settings → Pages** → Source: `Deploy from a branch` → Branch:
   `main` / `root` → Save.
3. Your link will be `https://<your-username>.github.io/masjid-fund-tracker/`.
   Share that link with everyone.

### 6. Add your members
1. Open the site → **Admin** tab → log in with the account you made in
   step 3.
2. Use **Bulk add members**: paste one member per line as `Name, PIN`
   (e.g. `Ahmad Bello, 1023`). If you leave off the PIN it defaults to
   `0000` — tell each member to keep or change it (there's a "PIN" field
   only, no PIN-reset UI yet, so re-add or manually edit in the Firestore
   console if someone forgets theirs).

## Using it day to day
- **Everyone tab:** pick a month, see who's marked paid. If you're logged
  in as admin, each badge is a button — tap to toggle paid/unpaid.
- **My status tab:** members pick their name + PIN to see their full
  history across all months.
- **Admin tab:** log in/out, add members one at a time or in bulk.

## Costs
Firebase's free "Spark" plan comfortably covers this (well under the free
read/write limits for 90+ members checked occasionally). No credit card
needed unless you exceed generous free limits, which is very unlikely here.
