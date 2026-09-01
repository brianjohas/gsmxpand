// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUSnGtI1ewXyqqt3GKxpVZ5VlGL7kVCKc",
  authDomain: "gsmxpand-unlocking.firebaseapp.com",
  projectId: "gsmxpand-unlocking",
  storageBucket: "gsmxpand-unlocking.firebasestorage.app",
  messagingSenderId: "397270192976",
  appId: "1:397270192976:web:562eeac7423a3204009255",
  measurementId: "G-WTLDYD96LH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Analytics only works in a real browser context served over http(s), and isn't
// supported in every environment (e.g. some in-app browsers) — guard it so it
// never breaks the rest of the app if it's unavailable.
let analytics = null;
analyticsIsSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {
    /* analytics unsupported in this environment — safe to ignore */
  });

// Export database (and analytics, in case other scripts want it later)
export { db, analytics };
