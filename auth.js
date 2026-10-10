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
      message = "Login popup was closed. Please try again.";
    } else if (error.code === 'auth/popup-blocked') {
      message = "Popups are blocked by your browser. Please allow popups for this site and try again.";
    } else if (error.code === 'auth/operation-not-allowed') {
      message = "Google Sign-In is not enabled yet in your Firebase Project.\n\nFix: Open Firebase Console -> Authentication -> Sign-in method -> Click 'Google' -> Toggle 'Enable' and click Save.";
    } else if (error.code === 'auth/unauthorized-domain') {
      message = `This domain (${window.location.hostname}) is not authorized in Firebase Auth.\n\nOpening as http://localhost:3000 will work immediately. You can also add "${window.location.hostname}" in Firebase Console > Authentication > Settings > Authorized Domains.`;
      if (window.location.hostname === '127.0.0.1') {
        window.location.hostname = 'localhost';
      }
    } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
      message = "Google Sign-In requires a web server (like VS Code Live Server at http://localhost:3000 or GitHub Pages) and cannot run on direct file:// double-click.";
    } else {
      message = `Sign-in notice: ${error.message || error.code}`;
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
