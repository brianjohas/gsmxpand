// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCi2WZNclVtCk_fT51qQ1-2PJgJeWuHglU",
  authDomain: "gsmxpand-unlocking.firebaseapp.com",
  projectId: "gsmxpand-unlocking",
  storageBucket: "gsmxpand-unlocking.firebasestorage.app",
  messagingSenderId: "444551053426",
  appId: "1:444551053426:web:df1f16a823e5af5f7402eb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export database
export { db };