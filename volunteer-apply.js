// Volunteer Application & Live Chat Controller for ABVP Khaira College
import { db } from './firebase.js';
import { signIn } from './auth.js';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limitToLast,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let currentUser = null;
let unsubVolunteerDoc = null;
let unsubChat = null;
let modalOpen = false;

/**
 * Initializes the three-dot menu and volunteer application modal
 */
export function initVolunteerApply() {
  initThreeDotMenu();
  initModalTriggers();
  initApplicationForm();
  initChatForm();
}

/**
 * Updates volunteer UI on auth state change
 * @param {Object|null} user 
 */
export function updateVolunteerAuth(user) {
  currentUser = user;

  // Clean up any active volunteer doc listener
  if (unsubVolunteerDoc) {
    unsubVolunteerDoc();
    unsubVolunteerDoc = null;
  }
  if (unsubChat) {
    unsubChat();
    unsubChat = null;
  }

  if (modalOpen) {
    renderVolunteerModalState();
  }
}

/**
 * 1. Three-Dot Menu (⋮) Controller
 */
function initThreeDotMenu() {
  const dotsBtn = document.getElementById('more-dots-btn');
  const dropdownMenu = document.getElementById('more-dropdown-menu');
  const applyBtn = document.getElementById('open-volunteer-apply-btn');

  if (!dotsBtn || !dropdownMenu) return;

  dotsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdownMenu.style.display === 'none' || !dropdownMenu.style.display;
    dropdownMenu.style.display = isHidden ? 'block' : 'none';
    dotsBtn.setAttribute('aria-expanded', String(isHidden));
  });

  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== dotsBtn) {
      dropdownMenu.style.display = 'none';
      dotsBtn.setAttribute('aria-expanded', 'false');
    }
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      dropdownMenu.style.display = 'none';
      dotsBtn.setAttribute('aria-expanded', 'false');
      openVolunteerModal();
    });
  }
}

/**
 * 2. Modal Open / Close Logic
 */
function initModalTriggers() {
  const modal = document.getElementById('volunteer-apply-modal');
  const closeBtn = document.getElementById('volunteer-modal-close');
  const backdrop = document.getElementById('volunteer-modal-backdrop');
  const googleLoginBtn = document.getElementById('volunteer-google-login-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeVolunteerModal);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeVolunteerModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOpen) {
      closeVolunteerModal();
    }
  });

  if (googleLoginBtn) {
    // Call signIn() directly with NO await before it
    googleLoginBtn.addEventListener('click', () => {
      googleLoginBtn.disabled = true;
      signIn().finally(() => {
        googleLoginBtn.disabled = false;
      });
    });
  }
}

export function openVolunteerModal() {
  const modal = document.getElementById('volunteer-apply-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.classList.add('lightbox-locked');
  modalOpen = true;
  renderVolunteerModalState();
}

export function closeVolunteerModal() {
  const modal = document.getElementById('volunteer-apply-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.classList.remove('lightbox-locked');
  modalOpen = false;

  if (unsubChat) {
    unsubChat();
    unsubChat = null;
  }
}

/**
 * 3. Renders the appropriate view inside the modal
 */
function renderVolunteerModalState() {
  const loggedOutView = document.getElementById('volunteer-view-logged-out');
  const formView = document.getElementById('volunteer-view-form');
  const pendingView = document.getElementById('volunteer-view-pending');
  const rejectedView = document.getElementById('volunteer-view-rejected');
  const approvedView = document.getElementById('volunteer-view-approved');

  function hideAllViews() {
    if (loggedOutView) loggedOutView.style.display = 'none';
    if (formView) formView.style.display = 'none';
    if (pendingView) pendingView.style.display = 'none';
    if (rejectedView) rejectedView.style.display = 'none';
    if (approvedView) approvedView.style.display = 'none';
  }

  if (!currentUser) {
    hideAllViews();
    if (loggedOutView) loggedOutView.style.display = 'block';
    return;
  }

  // Pre-fill user data in form
  const nameInput = document.getElementById('apply-name');
  const emailInput = document.getElementById('apply-email');
  if (nameInput && !nameInput.value) {
    nameInput.value = currentUser.displayName || '';
  }
  if (emailInput) {
    emailInput.value = currentUser.email || '';
  }

  // Listen to volunteers/{uid}
  if (unsubVolunteerDoc) {
    unsubVolunteerDoc();
    unsubVolunteerDoc = null;
  }

  try {
    const volDocRef = doc(db, 'volunteers', currentUser.uid);
    unsubVolunteerDoc = onSnapshot(volDocRef, (snap) => {
      hideAllViews();

      if (!snap.exists()) {
        // Not applied yet: show application form
        if (formView) formView.style.display = 'block';
      } else {
        const data = snap.data();
        const status = data.status || 'pending';

        if (status === 'approved') {
          if (approvedView) approvedView.style.display = 'block';
          // Start chat listener
          startVolunteerChat();
        } else if (status === 'rejected') {
          if (rejectedView) rejectedView.style.display = 'block';
        } else {
          // Default: pending
          if (pendingView) pendingView.style.display = 'block';
        }
      }
    }, (err) => {
      console.warn('Volunteer doc listener warning:', err);
      hideAllViews();
      if (formView) formView.style.display = 'block';
    });
  } catch (e) {
    console.warn('Error starting volunteer listener:', e);
  }
}

/**
 * 4. Application Form Submission
 */
function initApplicationForm() {
  const form = document.getElementById('volunteer-apply-form');
  const nameInput = document.getElementById('apply-name');
  const classSelect = document.getElementById('apply-class');
  const phoneInput = document.getElementById('apply-phone');
  const collegeInput = document.getElementById('apply-college');
  const whyTextarea = document.getElementById('apply-why');
  const whyCounter = document.getElementById('apply-why-counter');
  const alertBox = document.getElementById('volunteer-form-alert');
  const submitBtn = document.getElementById('apply-submit-btn');

  if (!form) return;

  // Phone: strictly numbers only
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  // Why textarea counter
  if (whyTextarea && whyCounter) {
    whyTextarea.addEventListener('input', () => {
      whyCounter.textContent = `${whyTextarea.value.length} / 300`;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showFormAlert('Please sign in with Google first.', 'error');
      return;
    }

    // Reset errors
    clearFormErrors();

    const name = nameInput ? nameInput.value.trim() : '';
    const classVal = classSelect ? classSelect.value : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const college = collegeInput ? collegeInput.value.trim() : '';
    const why = whyTextarea ? whyTextarea.value.trim() : '';

    let isValid = true;

    if (!name || name.length > 60) {
      setFieldError('error-apply-name', 'Name is required (max 60 characters).');
      isValid = false;
    }

    if (!classVal) {
      setFieldError('error-apply-class', 'Please select your class.');
      isValid = false;
    }

    if (!/^\d{10}$/.test(phone)) {
      setFieldError('error-apply-phone', 'Phone number must be exactly 10 digits.');
      isValid = false;
    }

    if (!college || college.length > 100) {
      setFieldError('error-apply-college', 'College name is required (max 100 characters).');
      isValid = false;
    }

    if (!why || why.length > 300) {
      setFieldError('error-apply-why', 'Please describe your motivation (max 300 characters).');
      isValid = false;
    }

    if (!isValid) return;

    // Disable button & show spinner
    setSubmitting(true);
    showFormAlert('', '');

    try {
      // Exactly the 9 allowed fields: uid, name, email, class, phone, college, why, status, createdAt
      const volunteerDoc = {
        uid: currentUser.uid,
        name: name,
        email: currentUser.email || '',
        class: classVal,
        phone: phone,
        college: college,
        why: why,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'volunteers', currentUser.uid), volunteerDoc);
    } catch (err) {
      console.error('Error submitting volunteer application:', err);
      showFormAlert('Could not submit application. Please check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  });

  function setSubmitting(submitting) {
    if (!submitBtn) return;
    submitBtn.disabled = submitting;
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.btn-spinner');
    if (btnText) btnText.textContent = submitting ? 'Submitting Application...' : 'Submit Volunteer Application';
    if (spinner) spinner.style.display = submitting ? 'inline-block' : 'none';
  }

  function showFormAlert(msg, type) {
    if (!alertBox) return;
    if (!msg) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
      return;
    }
    alertBox.textContent = msg;
    alertBox.className = `form-alert ${type}`;
    alertBox.style.display = 'block';
  }

  function setFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearFormErrors() {
    ['error-apply-name', 'error-apply-class', 'error-apply-phone', 'error-apply-college', 'error-apply-why'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }
}

/**
 * 5. Volunteer Live Chat Controller
 */
function initChatForm() {
  const form = document.getElementById('chat-send-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const alertBox = document.getElementById('chat-alert');

  if (!form || !input) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();

    if (!text) return;
    if (text.length > 500) {
      showChatAlert('Message exceeds maximum 500 characters.');
      return;
    }

    if (!currentUser) {
      showChatAlert('You must be signed in to send messages.');
      return;
    }

    if (sendBtn) sendBtn.disabled = true;
    hideChatAlert();

    try {
      // Exactly the 4 allowed fields: text, uid, name, createdAt
      await addDoc(collection(db, 'chat'), {
        text: text,
        uid: currentUser.uid,
        name: currentUser.displayName || 'Volunteer',
        createdAt: serverTimestamp()
      });

      input.value = '';
    } catch (err) {
      console.warn('Chat send error:', err);
      if (err.code === 'permission-denied') {
        showChatAlert('You do not have access to the volunteer chat.');
      } else {
        showChatAlert('Could not send message. Please try again.');
      }
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  });

  function showChatAlert(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
  }

  function hideChatAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  }
}

function startVolunteerChat() {
  if (unsubChat) {
    unsubChat();
    unsubChat = null;
  }

  const container = document.getElementById('chat-messages');
  const alertBox = document.getElementById('chat-alert');

  try {
    const qChat = query(collection(db, 'chat'), orderBy('createdAt', 'asc'), limitToLast(50));
    unsubChat = onSnapshot(qChat, (snapshot) => {
      if (!container) return;

      if (alertBox) alertBox.style.display = 'none';

      if (snapshot.empty) {
        container.innerHTML = '<div class="chat-empty-msg">No messages yet. Say hello to fellow karyakartas!</div>';
        return;
      }

      const bubbles = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const isOwn = currentUser && d.uid === currentUser.uid;
        const senderName = escapeHtml(d.name || 'Volunteer');
        const text = escapeHtml(d.text || '');
        const time = formatChatTime(d.createdAt);

        bubbles.push(`
          <div class="chat-bubble-row ${isOwn ? 'own-row' : 'other-row'}">
            <span class="chat-sender-name">${senderName}</span>
            <div class="chat-bubble ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}">
              <p class="chat-bubble-text">${text}</p>
              <span class="chat-bubble-time">${time}</span>
            </div>
          </div>
        `);
      });

      container.innerHTML = bubbles.join('');
      // Auto-scroll to newest message
      container.scrollTop = container.scrollHeight;
    }, (err) => {
      console.warn('Volunteer chat listener error:', err);
      if (container) {
        container.innerHTML = '<div class="chat-denied-msg">You do not have access to the volunteer chat.</div>';
      }
      if (alertBox) {
        alertBox.textContent = 'You do not have access to the volunteer chat.';
        alertBox.style.display = 'block';
      }
    });
  } catch (err) {
    console.warn('Error starting chat listener:', err);
  }
}

function formatChatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return 'Just now';
  try {
    const d = timestamp.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Just now';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
