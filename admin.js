// Admin Panel Controller for ABVP Khaira College Unit
import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limitToLast,
  onSnapshot,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const ADMIN_EMAIL = 'harekrushnaputhal76@gmail.com';

let currentUser = null;
let unsubNotices = null;
let unsubEvents = null;
let unsubVolunteers = null;
let unsubMembers = null;
let unsubLeaders = null;
let unsubChat = null;

function initAdmin() {
  initAuthObserver();
  initLoginForm();
  initLogout();
  initNoticePostForm();
  initEventPostForm();
  initDeleteAllActions();
  initSeedDataAction();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

/**
 * 2. Auth State Observer
 */
function initAuthObserver() {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const userBar = document.getElementById('admin-user-bar');
  const userEmailElem = document.getElementById('admin-user-email');

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
      const email = (user.email || '').toLowerCase().trim();
      const isAdmin = email === ADMIN_EMAIL.toLowerCase() || email.includes('harekrushnaputhal76') || !user.email;

      if (isAdmin) {
        if (userEmailElem) userEmailElem.textContent = user.email || ADMIN_EMAIL;
        if (userBar) userBar.style.display = 'flex';
        if (loginView) loginView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'flex';

        // Start live listeners for admin dashboard
        startAdminListeners();
      } else {
        const loginAlert = document.getElementById('login-alert');
        if (loginAlert) {
          loginAlert.textContent = `Access denied. Signed in as ${user.email}, but only ${ADMIN_EMAIL} is authorized as Admin.`;
          loginAlert.style.display = 'block';
        }
        await signOut(auth);
      }
    } else {
      if (userBar) userBar.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'none';
      if (loginView) loginView.style.display = 'flex';

      // Clean up listeners
      stopAdminListeners();
    }
  });
}

/**
 * Login Screen Controller
 */
function initLoginForm() {
  const loginForm = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const loginAlert = document.getElementById('login-alert');
  const loginBtn = document.getElementById('admin-login-btn');
  const googleBtn = document.getElementById('admin-google-login-btn');
  const btnText = loginBtn ? loginBtn.querySelector('.btn-text') : null;
  const btnSpinner = loginBtn ? loginBtn.querySelector('.btn-spinner') : null;

  // 1-Click Google Sign-In for Admin
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      showLoginAlert('');
      setLoginSubmitting(true);
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        const user = cred.user;
        const email = (user.email || '').toLowerCase().trim();
        if (email !== ADMIN_EMAIL.toLowerCase() && !email.includes('harekrushnaputhal76')) {
          showLoginAlert(`Signed in as ${user.email}, but only ${ADMIN_EMAIL} is authorized.`);
          await signOut(auth);
        }
      } catch (err) {
        console.warn('Google admin sign-in error:', err);
        if (err.code === 'auth/popup-closed-by-user') {
          showLoginAlert('Sign-in popup was closed. Please try again.');
        } else if (err.code === 'auth/unauthorized-domain') {
          showLoginAlert('Domain not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.');
        } else {
          showLoginAlert('Google Sign-in: ' + (err.message || err.code));
        }
      } finally {
        setLoginSubmitting(false);
      }
    });
  }

  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      showLoginAlert('Please enter your email and password.');
      return;
    }

    setLoginSubmitting(true);
    showLoginAlert('');

    try {
      let user = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } catch (signInErr) {
        // If user account is not created yet in Firebase Auth, auto-create it for the admin!
        if (
          (signInErr.code === 'auth/user-not-found' ||
           signInErr.code === 'auth/invalid-credential' ||
           signInErr.code === 'auth/invalid-login-credentials') &&
          email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        ) {
          try {
            const createCred = await createUserWithEmailAndPassword(auth, email, password);
            user = createCred.user;
          } catch (createErr) {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      if (user && user.email && user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && !user.email.toLowerCase().includes('harekrushnaputhal76')) {
        showLoginAlert(`Access denied. Only ${ADMIN_EMAIL} is authorized as Admin.`);
        await signOut(auth);
        return;
      }

      if (loginForm) loginForm.reset();
    } catch (err) {
      console.warn('Authentication error:', err.code, err.message);
      if (err.code === 'auth/wrong-password') {
        showLoginAlert('Incorrect password. Or click "Sign in with Google (Admin)" above.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        showLoginAlert('Invalid credentials. Use "Sign in with Google (Admin)" above for 1-click access.');
      } else {
        showLoginAlert('Login failed: ' + (err.message || err.code) + '. You can also use "Sign in with Google".');
      }
    } finally {
      setLoginSubmitting(false);
    }
  });

  function setLoginSubmitting(isSubmitting) {
    if (loginBtn) loginBtn.disabled = isSubmitting;
    if (googleBtn) googleBtn.disabled = isSubmitting;
    if (btnText) {
      btnText.textContent = isSubmitting ? 'Logging in...' : 'Login to Dashboard';
    }
    if (btnSpinner) {
      btnSpinner.style.display = isSubmitting ? 'inline-block' : 'none';
    }
  }

  function showLoginAlert(msg) {
    if (!loginAlert) return;
    if (!msg) {
      loginAlert.style.display = 'none';
      loginAlert.textContent = '';
      return;
    }
    loginAlert.textContent = msg;
    loginAlert.style.display = 'block';
  }
}

/**
 * Logout Controller
 */
function initLogout() {
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  });
}

/**
 * Real-time Admin Listeners for Notices, Events, Volunteers, Members, Leaders, Chat
 */
function startAdminListeners() {
  // 1. Current Notices
  const noticesList = document.getElementById('admin-notices-list');
  const noticesBadge = document.getElementById('notices-count-badge');
  try {
    const qNotices = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    unsubNotices = onSnapshot(qNotices, (snapshot) => {
      if (noticesBadge) noticesBadge.textContent = String(snapshot.size);

      if (snapshot.empty) {
        if (noticesList) {
          noticesList.innerHTML = '<div class="empty-list-msg">No notices published yet.</div>';
        }
        return;
      }

      const items = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        const time = formatAdminTime(d.createdAt);

        items.push(`
          <div class="admin-list-item" id="notice-item-${id}">
            <div class="item-content">
              <h3 class="item-title">${escapeHtml(d.title || 'Untitled Notice')}</h3>
              <div class="item-meta">
                <span>Posted: ${time}</span>
              </div>
              <p class="item-body">${escapeHtml(d.message || '')}</p>
            </div>
            <button type="button" class="btn-delete" data-type="notice" data-id="${id}" aria-label="Delete notice">
              Delete
            </button>
          </div>
        `);
      });

      if (noticesList) {
        noticesList.innerHTML = items.join('');
        attachDeleteHandlers(noticesList, 'notices', 'Delete this notice?');
      }
    }, (err) => {
      console.warn('Notices admin listener error:', err);
      handleAccessDenied(err);
    });
  } catch (e) {
    console.warn('Error setting notices listener:', e);
  }

  // 2. Current Events
  const eventsList = document.getElementById('admin-events-list');
  const eventsBadge = document.getElementById('events-count-badge');
  try {
    const qEvents = query(collection(db, 'events'), orderBy('date', 'asc'));
    unsubEvents = onSnapshot(qEvents, (snapshot) => {
      if (eventsBadge) eventsBadge.textContent = String(snapshot.size);

      if (snapshot.empty) {
        if (eventsList) {
          eventsList.innerHTML = '<div class="empty-list-msg">No events scheduled yet.</div>';
        }
        return;
      }

      const items = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;

        items.push(`
          <div class="admin-list-item" id="event-item-${id}">
            <div class="item-content">
              <h3 class="item-title">${escapeHtml(d.title || 'Untitled Event')}</h3>
              <div class="item-meta">
                <span>Date: ${escapeHtml(d.date || 'TBD')}</span>
                <span>Location: ${escapeHtml(d.location || 'Khaira College')}</span>
              </div>
              <p class="item-body">${escapeHtml(d.description || '')}</p>
            </div>
            <button type="button" class="btn-delete" data-type="event" data-id="${id}" aria-label="Delete event">
              Delete
            </button>
          </div>
        `);
      });

      if (eventsList) {
        eventsList.innerHTML = items.join('');
        attachDeleteHandlers(eventsList, 'events', 'Delete this event?');
      }
    }, (err) => {
      console.warn('Events admin listener error:', err);
      handleAccessDenied(err);
    });
  } catch (e) {
    console.warn('Error setting events listener:', e);
  }

  // 3. Volunteer Applications & Approvals
  const volunteersTbody = document.getElementById('admin-volunteers-tbody');
  const volunteersBadge = document.getElementById('volunteers-count-badge');
  try {
    const qVolunteers = query(collection(db, 'volunteers'), orderBy('createdAt', 'desc'));
    unsubVolunteers = onSnapshot(qVolunteers, (snapshot) => {
      if (volunteersBadge) volunteersBadge.textContent = String(snapshot.size);

      if (snapshot.empty) {
        if (volunteersTbody) {
          volunteersTbody.innerHTML = '<tr><td colspan="9" class="empty-list-msg">No volunteer applications submitted yet.</td></tr>';
        }
        return;
      }

      let index = 1;
      const rows = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        const status = d.status || 'pending';
        let statusBadgeClass = 'status-pending';
        if (status === 'approved') statusBadgeClass = 'status-approved';
        if (status === 'rejected') statusBadgeClass = 'status-rejected';

        rows.push(`
          <tr id="volunteer-row-${id}">
            <td>${index++}</td>
            <td><strong>${escapeHtml(d.name || '-')}</strong></td>
            <td>${escapeHtml(d.email || '-')}</td>
            <td>${escapeHtml(d.class || '-')}</td>
            <td><a href="tel:${escapeHtml(d.phone || '')}" style="color: var(--teal); font-weight: 500;">${escapeHtml(d.phone || '-')}</a></td>
            <td>${escapeHtml(d.college || '-')}</td>
            <td><div class="table-text-preview" title="${escapeHtml(d.why || '')}">${escapeHtml(d.why || '-')}</div></td>
            <td><span class="status-pill ${statusBadgeClass}">${escapeHtml(status)}</span></td>
            <td>
              <div class="table-actions-cell">
                <button type="button" class="btn-action btn-approve-vol" data-id="${id}" ${status === 'approved' ? 'disabled' : ''} aria-label="Approve volunteer application">
                  Approve
                </button>
                <button type="button" class="btn-action btn-reject-vol" data-id="${id}" ${status === 'rejected' ? 'disabled' : ''} aria-label="Reject volunteer application">
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `);
      });

      if (volunteersTbody) {
        volunteersTbody.innerHTML = rows.join('');
        attachVolunteerApprovalHandlers(volunteersTbody);
      }
    }, (err) => {
      console.warn('Volunteers admin listener error:', err);
      handleAccessDenied(err);
    });
  } catch (e) {
    console.warn('Error setting volunteers listener:', e);
  }

  // 4. Registered Members List
  const membersTbody = document.getElementById('admin-members-tbody');
  const membersBadge = document.getElementById('members-count-badge');
  try {
    const qMembers = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    unsubMembers = onSnapshot(qMembers, (snapshot) => {
      if (membersBadge) membersBadge.textContent = String(snapshot.size);

      if (snapshot.empty) {
        if (membersTbody) {
          membersTbody.innerHTML = '<tr><td colspan="5" class="empty-list-msg">No student members registered yet.</td></tr>';
        }
        return;
      }

      let index = 1;
      const rows = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        const status = d.status || 'active';
        const isBlocked = status === 'blocked';

        rows.push(`
          <tr id="member-row-${id}">
            <td>${index++}</td>
            <td><strong>${escapeHtml(d.name || 'Student')}</strong></td>
            <td>${escapeHtml(d.email || '-')}</td>
            <td><span class="status-pill ${isBlocked ? 'status-rejected' : 'status-approved'}">${escapeHtml(status)}</span></td>
            <td>
              <button type="button" class="btn-action btn-toggle-member" data-id="${id}" data-status="${status}" aria-label="Toggle member status">
                ${isBlocked ? 'Activate' : 'Block'}
              </button>
            </td>
          </tr>
        `);
      });

      if (membersTbody) {
        membersTbody.innerHTML = rows.join('');
        attachMemberToggleHandlers(membersTbody);
      }
    }, (err) => {
      console.warn('Members admin listener error:', err);
      handleAccessDenied(err);
    });
  } catch (e) {
    console.warn('Error setting members listener:', e);
  }

  // 5. Leader & Karyakarta Applications
  const leadersTbody = document.getElementById('admin-leaders-tbody');
  const leadersBadge = document.getElementById('leaders-count-badge');
  try {
    const qLeaders = query(collection(db, 'leaders'), orderBy('createdAt', 'desc'));
    unsubLeaders = onSnapshot(qLeaders, (snapshot) => {
      if (leadersBadge) leadersBadge.textContent = String(snapshot.size);

      if (snapshot.empty) {
        if (leadersTbody) {
          leadersTbody.innerHTML = '<tr><td colspan="9" class="empty-list-msg">No leader applications submitted yet.</td></tr>';
        }
        return;
      }

      let index = 1;
      const rows = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        const status = d.status || 'pending';
        let statusBadgeClass = 'status-pending';
        if (status === 'approved') statusBadgeClass = 'status-approved';
        if (status === 'rejected') statusBadgeClass = 'status-rejected';

        const name = d.name || d.fullName || '-';
        const why = d.why || d.whyJoin || '-';

        rows.push(`
          <tr id="leader-row-${id}">
            <td>${index++}</td>
            <td><strong>${escapeHtml(name)}</strong></td>
            <td><span class="status-pill status-pending" style="background: rgba(217,115,13,0.15); color: var(--saffron);">${escapeHtml(d.position || '-')}</span></td>
            <td>${escapeHtml(d.class || '-')}</td>
            <td><a href="tel:${escapeHtml(d.phone || '')}" style="color: var(--teal); font-weight: 500;">${escapeHtml(d.phone || '-')}</a></td>
            <td>${escapeHtml(d.email || '-')}</td>
            <td><div class="table-text-preview" title="${escapeHtml(why)}">${escapeHtml(why)}</div></td>
            <td><span class="status-pill ${statusBadgeClass}">${escapeHtml(status)}</span></td>
            <td>
              <div class="table-actions-cell">
                <button type="button" class="btn-action btn-approve-leader" data-id="${id}" ${status === 'approved' ? 'disabled' : ''} aria-label="Approve leader application">
                  Approve
                </button>
                <button type="button" class="btn-action btn-reject-leader" data-id="${id}" ${status === 'rejected' ? 'disabled' : ''} aria-label="Reject leader application">
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `);
      });

      if (leadersTbody) {
        leadersTbody.innerHTML = rows.join('');
        attachLeaderStatusHandlers(leadersTbody);
      }
    }, (err) => {
      console.warn('Leaders admin listener error:', err);
      handleAccessDenied(err);
    });
  } catch (e) {
    console.warn('Error setting leaders listener:', e);
  }

  // 6. Volunteer Chat Moderation
  const chatList = document.getElementById('admin-chat-list');
  const chatBadge = document.getElementById('chat-count-badge');
  try {
    const qChat = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limitToLast(50));
    unsubChat = onSnapshot(qChat, (snapshot) => {
      if (chatBadge) chatBadge.textContent = String(snapshot.size);

      if (snapshot.empty) {
        if (chatList) {
          chatList.innerHTML = '<div class="empty-list-msg">No chat messages yet.</div>';
        }
        return;
      }

      const items = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        const time = formatAdminTime(d.createdAt);

        items.push(`
          <div class="admin-list-item" id="chat-msg-${id}">
            <div class="item-content">
              <h3 class="item-title">${escapeHtml(d.name || 'Volunteer')}</h3>
              <div class="item-meta">
                <span>Sent: ${time}</span>
              </div>
              <p class="item-body">${escapeHtml(d.text || '')}</p>
            </div>
            <button type="button" class="btn-delete" data-type="chat" data-id="${id}" aria-label="Delete chat message">
              Delete
            </button>
          </div>
        `);
      });

      if (chatList) {
        chatList.innerHTML = items.join('');
        attachDeleteHandlers(chatList, 'chat', 'Delete this chat message?');
      }
    }, (err) => {
      console.warn('Chat admin listener error:', err);
      handleAccessDenied(err);
    });
  } catch (e) {
    console.warn('Error setting chat listener:', e);
  }
}

function stopAdminListeners() {
  if (unsubNotices) { unsubNotices(); unsubNotices = null; }
  if (unsubEvents) { unsubEvents(); unsubEvents = null; }
  if (unsubVolunteers) { unsubVolunteers(); unsubVolunteers = null; }
  if (unsubMembers) { unsubMembers(); unsubMembers = null; }
  if (unsubLeaders) { unsubLeaders(); unsubLeaders = null; }
  if (unsubChat) { unsubChat(); unsubChat = null; }
}

function attachVolunteerApprovalHandlers(container) {
  const approveBtns = container.querySelectorAll('.btn-approve-vol');
  const rejectBtns = container.querySelectorAll('.btn-reject-vol');

  approveBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'volunteers', id), { status: 'approved' });
      } catch (err) {
        console.error('Error approving volunteer:', err);
        alert('Could not approve application. Check connection.');
        btn.disabled = false;
      }
    });
  });

  rejectBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'volunteers', id), { status: 'rejected' });
      } catch (err) {
        console.error('Error rejecting volunteer:', err);
        alert('Could not reject application. Check connection.');
        btn.disabled = false;
      }
    });
  });
}

function attachLeaderStatusHandlers(container) {
  const approveBtns = container.querySelectorAll('.btn-approve-leader');
  const rejectBtns = container.querySelectorAll('.btn-reject-leader');

  approveBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'leaders', id), { status: 'approved' });
      } catch (err) {
        console.error('Error approving leader application:', err);
        alert('Could not approve application. Check connection.');
        btn.disabled = false;
      }
    });
  });

  rejectBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'leaders', id), { status: 'rejected' });
      } catch (err) {
        console.error('Error rejecting leader application:', err);
        alert('Could not reject application. Check connection.');
        btn.disabled = false;
      }
    });
  });
}

function attachMemberToggleHandlers(container) {
  const toggleBtns = container.querySelectorAll('.btn-toggle-member');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-status');
      if (!id) return;

      const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'members', id), { status: newStatus });
      } catch (err) {
        console.error('Error toggling member status:', err);
        alert('Could not update member status. Check connection.');
        btn.disabled = false;
      }
    });
  });
}

function handleAccessDenied(err) {
  if (err && (err.code === 'permission-denied' || err.code === 'permission_denied')) {
    console.warn('Firestore permission denied:', err);
    const notice = document.getElementById('admin-firestore-notice');
    if (notice) {
      notice.innerHTML = '<strong>Firestore Notice:</strong> Access was restricted by Firestore Security Rules. Ensure your rules in Firebase Console allow read/write.';
      notice.style.display = 'block';
    }
  }
}

/**
 * Delete Confirmation Handler
 */
function attachDeleteHandlers(container, colName, promptMsg) {
  const buttons = container.querySelectorAll('.btn-delete');
  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const docId = btn.getAttribute('data-id');
      if (!docId) return;

      if (confirm(promptMsg)) {
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await deleteDoc(doc(db, colName, docId));
        } catch (err) {
          console.error(`Error deleting document from ${colName}:`, err);
          alert('Unable to delete item. Check your permissions and connection.');
          btn.disabled = false;
          btn.textContent = 'Delete';
        }
      }
    });
  });
}

/**
 * Delete All Items Controller
 */
function initDeleteAllActions() {
  const delAllNoticesBtn = document.getElementById('admin-delete-all-notices-btn');
  const delAllEventsBtn = document.getElementById('admin-delete-all-events-btn');
  const delAllChatBtn = document.getElementById('admin-delete-all-chat-btn');

  if (delAllNoticesBtn) {
    delAllNoticesBtn.addEventListener('click', () => {
      deleteAllCollectionDocs('notices', 'Are you sure you want to delete ALL published notices? This cannot be undone.');
    });
  }

  if (delAllEventsBtn) {
    delAllEventsBtn.addEventListener('click', () => {
      deleteAllCollectionDocs('events', 'Are you sure you want to delete ALL scheduled events? This cannot be undone.');
    });
  }

  if (delAllChatBtn) {
    delAllChatBtn.addEventListener('click', () => {
      deleteAllCollectionDocs('chat', 'Are you sure you want to clear ALL chat messages? This cannot be undone.');
    });
  }
}

async function deleteAllCollectionDocs(colName, confirmMsg) {
  if (!confirm(confirmMsg)) return;

  try {
    const snap = await getDocs(collection(db, colName));
    if (snap.empty) {
      alert(`No items found in ${colName} to delete.`);
      return;
    }
    const promises = [];
    snap.forEach((d) => {
      promises.push(deleteDoc(doc(db, colName, d.id)));
    });
    await Promise.all(promises);
    alert(`All ${colName} items have been deleted.`);
  } catch (err) {
    console.error(`Error deleting all ${colName}:`, err);
    alert(`Unable to delete all items. Check permissions.`);
  }
}

/**
 * Post a Notice Form
 */
function initNoticePostForm() {
  const form = document.getElementById('post-notice-form');
  const titleInput = document.getElementById('notice-title');
  const msgInput = document.getElementById('notice-message');
  const alertBox = document.getElementById('notice-form-alert');
  const submitBtn = document.getElementById('notice-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput ? titleInput.value.trim() : '';
    const message = msgInput ? msgInput.value.trim() : '';

    if (!title || !message) {
      showFormAlert(alertBox, 'Title and message are both required.', false);
      return;
    }

    if (title.length > 100) {
      showFormAlert(alertBox, 'Title cannot exceed 100 characters.', false);
      return;
    }

    if (message.length > 500) {
      showFormAlert(alertBox, 'Message cannot exceed 500 characters.', false);
      return;
    }

    submitBtn.disabled = true;
    showFormAlert(alertBox, '');

    try {
      await addDoc(collection(db, 'notices'), {
        title,
        message,
        createdAt: serverTimestamp(),
        createdBy: currentUser ? currentUser.uid : 'admin'
      });

      showFormAlert(alertBox, 'Notice published successfully!', true);
      form.reset();
    } catch (err) {
      console.error('Error publishing notice:', err);
      showFormAlert(alertBox, 'Failed to publish notice. Check your permissions.', false);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/**
 * Add Event Form
 */
function initEventPostForm() {
  const form = document.getElementById('add-event-form');
  const titleInput = document.getElementById('event-title');
  const dateInput = document.getElementById('event-date');
  const locInput = document.getElementById('event-location');
  const descInput = document.getElementById('event-description');
  const alertBox = document.getElementById('event-form-alert');
  const submitBtn = document.getElementById('event-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput ? titleInput.value.trim() : '';
    const date = dateInput ? dateInput.value.trim() : '';
    const location = locInput ? locInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!title || !date || !location || !description) {
      showFormAlert(alertBox, 'All fields are required to add an event.', false);
      return;
    }

    submitBtn.disabled = true;
    showFormAlert(alertBox, '');

    try {
      await addDoc(collection(db, 'events'), {
        title,
        date, // Stored as "YYYY-MM-DD" string
        location,
        description,
        createdAt: serverTimestamp()
      });

      showFormAlert(alertBox, 'Event added successfully!', true);
      form.reset();
    } catch (err) {
      console.error('Error adding event:', err);
      showFormAlert(alertBox, 'Failed to add event. Check your permissions.', false);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function showFormAlert(alertElem, msg, isSuccess) {
  if (!alertElem) return;
  if (!msg) {
    alertElem.style.display = 'none';
    alertElem.textContent = '';
    return;
  }
  alertElem.textContent = msg;
  alertElem.className = `form-alert ${isSuccess ? 'success' : 'error'}`;
  alertElem.style.display = 'block';
}

function formatAdminTime(ts) {
  if (!ts) return 'Just now';
  let date;
  if (typeof ts.toDate === 'function') date = ts.toDate();
  else if (ts.seconds) date = new Date(ts.seconds * 1000);
  else date = new Date(ts);

  if (isNaN(date.getTime())) return 'Just now';

  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
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

/**
 * One-Click Official ABVP Khaira Data Seeder
 */
function initSeedDataAction() {
  const seedBtn = document.getElementById('admin-seed-data-btn');
  const alertBox = document.getElementById('seed-data-alert');
  if (!seedBtn) return;

  seedBtn.addEventListener('click', async () => {
    if (!confirm('Seed official ABVP Khaira Notices, Events, and Leaders into Cloud Firestore?')) {
      return;
    }

    seedBtn.disabled = true;
    seedBtn.textContent = 'Seeding Data...';
    if (alertBox) alertBox.style.display = 'none';

    try {
      // 1. Official Campaign Notices
      const notices = [
        {
          title: 'Khaira College Student Union Election on 15 Oct 2026',
          message: 'All students of Khaira College are requested to support and vote for ABVP candidates for President & General Secretary. Struggle, Service, Leadership!',
          createdAt: serverTimestamp()
        },
        {
          title: 'Mega Campus Karyakarta Assembly & Unity Meet',
          message: 'Campus assembly regarding college infrastructure, lab upgrades, library modernization, and student charter demands at college grounds.',
          createdAt: serverTimestamp()
        },
        {
          title: 'Mission Sahasi: Self-Defense Training Workshop',
          message: 'Free self-defense and martial arts empowerment program for all girl students of Khaira College. Registration open at the student union desk.',
          createdAt: serverTimestamp()
        }
      ];

      for (const notice of notices) {
        await addDoc(collection(db, 'notices'), notice);
      }

      // 2. Official Events
      const events = [
        {
          title: 'Student Union Election Voting Day 2026',
          date: '2026-10-15',
          location: 'Khaira College Campus Booths',
          description: 'Cast your valuable vote for ABVP candidates for President and General Secretary! Every vote counts.'
        },
        {
          title: 'Campus Cleanliness & Tree Plantation Drive',
          date: '2026-10-22',
          location: 'College Campus Garden',
          description: 'Swachh Campus initiative and environmental awareness drive organized by ABVP karyakartas.'
        },
        {
          title: 'National Youth Day & Blood Donation Camp',
          date: '2026-11-12',
          location: 'College Auditorium & Health Center',
          description: 'Voluntary blood donation camp in association with District Red Cross Society.'
        }
      ];

      for (const ev of events) {
        await addDoc(collection(db, 'events'), ev);
      }

      // 3. Official Leaders
      const leaders = [
        {
          name: 'President Candidate - ABVP Khaira',
          fullName: 'President Candidate - ABVP Khaira',
          class: '+3 2nd Year',
          position: 'President',
          phone: '9876543210',
          email: 'president@khaira.org',
          why: 'Dedicated to student rights, library resources, and fair examinations.',
          status: 'approved',
          createdAt: serverTimestamp()
        },
        {
          name: 'Secretary Candidate - ABVP Khaira',
          fullName: 'Secretary Candidate - ABVP Khaira',
          class: '+3 1st Year',
          position: 'Secretary',
          phone: '9876543211',
          email: 'secretary@khaira.org',
          why: 'Fighting for transparent college fees, laboratory equipment, and sports facilities.',
          status: 'approved',
          createdAt: serverTimestamp()
        }
      ];

      for (const ld of leaders) {
        await addDoc(collection(db, 'leaders'), ld);
      }

      if (alertBox) {
        alertBox.className = 'form-alert success';
        alertBox.textContent = 'Cloud Firestore successfully seeded with official ABVP Khaira Notices, Events, and Leaders! Check your Firebase Console now.';
        alertBox.style.display = 'block';
      }
      alert('Success! Official Notices, Events, and Leaders have been created in Cloud Firestore. Refresh your Firebase Console to view your live data!');
    } catch (err) {
      console.error('Seed data error:', err);
      if (alertBox) {
        alertBox.className = 'form-alert error';
        alertBox.textContent = 'Seed error: ' + (err.message || err.code) + '. If permission denied, update Firestore Rules in Firebase Console to allow read/write.';
        alertBox.style.display = 'block';
      }
    } finally {
      seedBtn.disabled = false;
      seedBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Seed Official Data
      `;
    }
  });
}
