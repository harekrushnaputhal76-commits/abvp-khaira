// Google Authentication helper for ABVP Khaira College
import { auth } from './firebase.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Create GoogleAuthProvider once
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Initiates Google sign-in popup
 * Returns the signed-in user object or null if failed/closed
 */
export async function signIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    let message = "Could not complete sign in. Please try again.";

    if (error.code === 'auth/popup-closed-by-user') {
      message = "Login window was closed. Please try again.";
    } else if (error.code === 'auth/popup-blocked') {
      message = "Please allow popups for this site and try again.";
    } else if (error.code === 'auth/unauthorized-domain') {
      message = `This domain (${window.location.hostname}) is not authorised in Firebase Auth.\n\nOpening as http://localhost:3000 will work immediately. You can also add "${window.location.hostname}" in Firebase Console > Authentication > Settings > Authorized Domains.`;
      if (window.location.hostname === '127.0.0.1') {
        window.location.hostname = 'localhost';
      }
    } else if (error.code === 'auth/operation-not-allowed') {
      message = "Google login is not enabled yet.";
    }

    alert(message);
    return null;
  }
}

/**
 * Signs out current user
 */
export async function signOut() {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
  }
}

/**
 * Subscribes to Firebase Auth state changes
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Returns current authenticated user
 */
export function getCurrentUser() {
  return auth.currentUser;
}
