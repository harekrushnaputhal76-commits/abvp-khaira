// Student Direct Join ("Join ABVP") module for ABVP Khaira College
import { db } from './firebase.js';
import { signIn } from './auth.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let memberInitialized = false;

/**
 * Initializes the #join-abvp section
 */
export function initMemberSection() {
  const googleBtn = document.getElementById('join-abvp-google-btn');
  if (googleBtn && !memberInitialized) {
    memberInitialized = true;
    // Call signIn() directly inside the click handler with no await before it
    googleBtn.addEventListener('click', () => {
      googleBtn.disabled = true;
      signIn().finally(() => {
        googleBtn.disabled = false;
      });
    });
  }

  const directForm = document.getElementById('direct-student-join-form');
  const directNameInput = document.getElementById('direct-student-name');
  const directClassInput = document.getElementById('direct-student-class');
  const directError = document.getElementById('direct-join-error');
  const directSubmitBtn = document.getElementById('direct-student-submit-btn');

  if (directForm) {
    directForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = directNameInput ? directNameInput.value.trim() : '';
      const studentClass = directClassInput ? directClassInput.value : '';

      if (!name) {
        if (directError) {
          directError.textContent = 'Please enter your full name.';
          directError.style.display = 'block';
        }
        return;
      }
      if (!studentClass) {
        if (directError) {
          directError.textContent = 'Please select your class.';
          directError.style.display = 'block';
        }
        return;
      }

      if (directSubmitBtn) directSubmitBtn.disabled = true;
      if (directError) directError.style.display = 'none';

      try {
        const studentUid = 'student_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await setDoc(doc(db, 'members', studentUid), {
          uid: studentUid,
          name: name,
          class: studentClass,
          email: '',
          status: 'active',
          joinMethod: 'direct',
          createdAt: serverTimestamp()
        });

        // Update UI to active member
        updateMemberUI({
          uid: studentUid,
          displayName: name,
          email: ''
        });
      } catch (err) {
        console.warn('Direct join error, saving to local session:', err);
        // Fallback local member state
        updateMemberUI({
          uid: 'student_local_' + Date.now(),
          displayName: name,
          email: ''
        });
      } finally {
        if (directSubmitBtn) directSubmitBtn.disabled = false;
      }
    });
  }
}

/**
 * Handles member state on auth change
 * @param {Object|null} user 
 */
export async function updateMemberUI(user) {
  const loggedOutView = document.getElementById('join-abvp-logged-out');
  const loggedInView = document.getElementById('join-abvp-logged-in');
  const loadingElem = document.getElementById('join-abvp-loading');
  const feedbackElem = document.getElementById('join-abvp-success');
  const msgElem = document.getElementById('join-abvp-message');
  const descElem = document.getElementById('join-abvp-details');

  if (!loggedOutView || !loggedInView) return;

  if (!user) {
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
    if (feedbackElem) feedbackElem.style.display = 'none';
    if (loadingElem) loadingElem.style.display = 'none';
    return;
  }

  // User is signed in
  loggedOutView.style.display = 'none';
  loggedInView.style.display = 'block';
  if (loadingElem) loadingElem.style.display = 'flex';
  if (feedbackElem) feedbackElem.style.display = 'none';

  try {
    const memberDocRef = doc(db, 'members', user.uid);
    const memberSnap = await getDoc(memberDocRef);

    if (!memberSnap.exists()) {
      // First time join: create members document with status "active"
      await setDoc(memberDocRef, {
        uid: user.uid,
        name: user.displayName || 'Student',
        email: user.email || '',
        status: 'active',
        createdAt: serverTimestamp()
      });

      if (msgElem) msgElem.textContent = 'Welcome to ABVP Khaira!';
      if (descElem) descElem.textContent = 'You are now an active student member. Gyan, Sheel, Ekta!';
    } else {
      // Already a member: do not overwrite
      if (msgElem) msgElem.textContent = 'You are already a member.';
      if (descElem) {
        const d = memberSnap.data();
        descElem.textContent = `Welcome back, ${d.name || user.displayName || 'Member'}! Status: ${d.status || 'active'}.`;
      }
    }
  } catch (err) {
    console.error('Error verifying member record:', err);
    if (msgElem) msgElem.textContent = 'Welcome to ABVP Khaira!';
    if (descElem) descElem.textContent = 'Welcome, ' + (user.displayName || 'Student') + '!';
  } finally {
    if (loadingElem) loadingElem.style.display = 'none';
    if (feedbackElem) feedbackElem.style.display = 'block';
  }
}
