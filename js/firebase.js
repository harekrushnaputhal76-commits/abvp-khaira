// Import Firebase modular SDK modules (standardized on 10.12.2)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// Firebase web application configuration for avbp-9ab57 (DO NOT MODIFY)
const firebaseConfig = {
  apiKey: "AIzaSyAgCgOkECLLhaB8FhXZnfuHaNiAhbUEzWs",
  authDomain: "avbp-9ab57.firebaseapp.com",
  projectId: "avbp-9ab57",
  storageBucket: "avbp-9ab57.firebasestorage.app",
  messagingSenderId: "271196405124",
  appId: "1:271196405124:web:c20905fb4e39fe067871d1",
  measurementId: "G-J9XFW3DMMH"
};

// Initialize Firebase App instance once
const app = initializeApp(firebaseConfig);

// Initialize Firestore database service
const db = getFirestore(app);

// Initialize Firebase Authentication service
const auth = getAuth(app);

// Initialize Google Analytics only when supported by the browser environment
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.warn("Analytics initialization skipped:", err);
});

// Export initialized instances
export { app, db, auth, analytics };
