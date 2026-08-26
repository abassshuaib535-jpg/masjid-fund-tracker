// Paste the config object Firebase gives you when you create a Web App
// (Firebase Console → Project settings → General → Your apps → SDK setup and config).
// It looks exactly like this, just with your own values.

export const firebaseConfig = {
  apiKey: "AIzaSyCi5eErF1v6kwXHlXRpeNDylVOJB8wfAYE",
  authDomain: "mssn-masjid-fund.firebaseapp.com",
  projectId: "mssn-masjid-fund",
  storageBucket: "mssn-masjid-fund.firebasestorage.app",
  messagingSenderId: "904111621419",
  appId: "1:904111621419:web:cc7b4830b4cb8bccc4716e"
};

// The first month of the contribution (year, month where month is 1-12).
// The app will generate a column/entry for every month from here to today.
export const CONTRIBUTION_START = { year: 2026, month: 1 };

// The fixed monthly amount, just used for display text.
export const MONTHLY_AMOUNT = 1000;
