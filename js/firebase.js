// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
// MODIFIED IMPORT: Added doc, setDoc, and serverTimestamp
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
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

// --- REWRITE ADDITION: Function to start your collections ---
async function startCollections() {
  try {
    console.log("Setting up collections...");

    // 1. Recreate 'messages' with an easy-to-remember ID
    await setDoc(doc(db, "messages", "welcome-message-01"), {
      senderName: "System Administrator",
      text: "Our messages database has been successfully initialized!",
      readableTime: new Date().toLocaleString(),
      createdAt: serverTimestamp(),
      status: "active"
    });

    // 2. Recreate 'requests' with an easy-to-remember ID
    await setDoc(doc(db, "requests", "initial-request-01"), {
      requestType: "Database Setup",
      status: "initialized",
      readableTime: new Date().toLocaleString(),
      createdAt: serverTimestamp(),
      systemNote: "Starting the requests collection with a custom document ID."
    });

    console.log("✓ 'messages' and 'requests' collections successfully started!");
  } catch (error) {
    console.error("Error starting collections:", error);
  }
}

// Automatically runs the startup setup once when this script is loaded.
// TIP: Once the collections appear in your console, you can delete or comment out this line!
startCollections();

// Analytics setup (guarded for non-supported environments)
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