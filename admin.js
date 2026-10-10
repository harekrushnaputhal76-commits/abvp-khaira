// Admin Panel Controller for ABVP Khaira College Unit (Real Cloud Firestore Only)
import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
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
  limit,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const ADMIN_EMAIL = 'harekrushnaputhal76@gmail.com';

// Active unsubscribe handles
let unsubNotices = null;
let unsubEvents = null;
let unsubVolunteers = null;
let unsubMembers = null;
let unsubLeaders = null;
let unsubChat = null;

// Chart.js instances
let chartVolunteers = null;
let chartMembers = null;
let chartLeaders = null;
let chartTimeline = null;

// Brand color palette
const CHART_COLORS = {
  saffron: '#D9730D',
  maroon: '#6B1E1E',
  navy: '#0F172A',
  teal: '#2F6F62',
  gray: '#94A3B8'
};

function initAdmin() {
  initAuthObserver();
  initLoginForm();
  initLogout();
  initNoticePostForm();
  initEventPostForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

/**
 * 1. Authentication State Observer
 */
function initAuthObserver() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const email = (user.email || '').toLowerCase().trim();
      if (email === ADMIN_EMAIL.toLowerCase()) {
        activateAdminDashboard(user.email);
      } else {
        showLoginAlert(`Access denied. Signed in as ${user.email}, but only ${ADMIN_EMAIL} is authorized.`);
        deactivateAdminDashboard();
        try {
          await signOut(auth);
        } catch (e) {
          console.warn('Sign out error:', e);
        }
      }
    } else {
      deactivateAdminDashboard();
    }
  });
}

/**
 * 2. Login Form (Email & Password Only)
 */
function initLoginForm() {
  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const submitBtn = document.getElementById('admin-login-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoginAlert('');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      showLoginAlert('Please enter both your admin email address and password.');
      return;
    }

    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      showLoginAlert(`Access denied. ${email} is not authorized as Unit Administrator.`);
      return;
    }

    setLoginSubmitting(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const userEmail = (user.email || '').toLowerCase().trim();

      if (userEmail === ADMIN_EMAIL.toLowerCase()) {
        activateAdminDashboard(user.email);
        if (passwordInput) passwordInput.value = '';
      } else {
        showLoginAlert(`Access denied. Only ${ADMIN_EMAIL} is authorized.`);
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Admin sign-in failure:', err);
      let msg = 'Authentication failed. Please verify your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please re-enter your administrative credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please wait a few minutes before trying again.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection error. Please check your internet connection.';
      } else if (err.message) {
        msg = err.message;
      }
      showLoginAlert(msg);
    } finally {
      setLoginSubmitting(false);
    }
  });
}

function setLoginSubmitting(isSubmitting) {
  const btn = document.getElementById('admin-login-btn');
  if (!btn) return;
  btn.disabled = isSubmitting;
  const textElem = btn.querySelector('.btn-text');
  const spinnerElem = btn.querySelector('.btn-spinner');
  if (textElem) textElem.textContent = isSubmitting ? 'Authenticating...' : 'Sign In';
  if (spinnerElem) spinnerElem.style.display = isSubmitting ? 'inline-block' : 'none';
}

function showLoginAlert(msg) {
  const alertElem = document.getElementById('login-alert');
  if (!alertElem) return;
  if (!msg) {
    alertElem.style.display = 'none';
    alertElem.textContent = '';
    return;
  }
  alertElem.textContent = msg;
  alertElem.style.display = 'block';
}

/**
 * 3. Logout
 */
function initLogout() {
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Logout error:', e);
    }
    deactivateAdminDashboard();
  });
}

/**
 * 4. Dashboard Activation & Deactivation
 */
function activateAdminDashboard(email) {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const userBar = document.getElementById('admin-user-bar');
  const userEmailElem = document.getElementById('admin-user-email');

  if (userEmailElem) userEmailElem.textContent = email || ADMIN_EMAIL;
  if (userBar) userBar.style.display = 'flex';
  if (loginView) loginView.style.display = 'none';
  if (dashboardView) dashboardView.style.display = 'flex';

  startAdminListeners();
}

function deactivateAdminDashboard() {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const userBar = document.getElementById('admin-user-bar');

  if (userBar) userBar.style.display = 'none';
  if (dashboardView) dashboardView.style.display = 'none';
  if (loginView) loginView.style.display = 'flex';

  stopAdminListeners();
  destroyCharts();
}

/**
 * 5. Start Real-Time Firestore Listeners
 */
function startAdminListeners() {
  stopAdminListeners();

  listenToNotices();
  listenToEvents();
  listenToVolunteers();
  listenToMembers();
  listenToLeaders();
  listenToChat();
}

function stopAdminListeners() {
  if (unsubNotices) { unsubNotices(); unsubNotices = null; }
  if (unsubEvents) { unsubEvents(); unsubEvents = null; }
  if (unsubVolunteers) { unsubVolunteers(); unsubVolunteers = null; }
  if (unsubMembers) { unsubMembers(); unsubMembers = null; }
  if (unsubLeaders) { unsubLeaders(); unsubLeaders = null; }
  if (unsubChat) { unsubChat(); unsubChat = null; }
}

/**
 * SECTION 1: Notices Collection
 */
function listenToNotices() {
  const listElem = document.getElementById('admin-notices-list');
  const badgeElem = document.getElementById('notices-count-badge');

  try {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    unsubNotices = onSnapshot(q, (snapshot) => {
      renderNotices(snapshot.docs, listElem, badgeElem);
    }, (err) => {
      console.warn('Notices orderBy error, falling back to unordered listener:', err);
      // Fallback in case index is creating
      unsubNotices = onSnapshot(collection(db, 'notices'), (snapshot) => {
        const sortedDocs = [...snapshot.docs].sort((a, b) => {
          const tA = getDocTimestamp(a.data().createdAt);
          const tB = getDocTimestamp(b.data().createdAt);
          return tB - tA;
        });
        renderNotices(sortedDocs, listElem, badgeElem);
      }, (e) => {
        showFirestoreError('Failed to load notices: ' + e.message);
      });
    });
  } catch (err) {
    showFirestoreError('Error setting notices listener: ' + err.message);
  }
}

function renderNotices(docs, container, badge) {
  if (badge) badge.textContent = docs ? docs.length : 0;
  if (!container) return;

  if (!docs || docs.length === 0) {
    container.innerHTML = '<div class="empty-list-msg">No records yet.</div>';
    return;
  }

  container.innerHTML = docs.map((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const title = escapeHtml(data.title || 'Untitled Notice');
    const message = escapeHtml(data.message || '');
    const dateFormatted = formatTimestamp(data.createdAt);

    return `
      <div class="admin-list-item" data-id="${id}">
        <div class="item-content">
          <h3 class="item-title">${title}</h3>
          <p class="item-meta">${dateFormatted}</p>
          <p class="item-desc">${message}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="btn-delete btn-delete-notice" data-id="${id}" title="Delete notice">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach delete handlers
  container.querySelectorAll('.btn-delete-notice').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Are you sure you want to delete this notice?')) return;
      try {
        await deleteDoc(doc(db, 'notices', id));
      } catch (err) {
        alert('Failed to delete notice: ' + err.message);
      }
    });
  });
}

function initNoticePostForm() {
  const form = document.getElementById('post-notice-form');
  const titleInput = document.getElementById('notice-title');
  const messageInput = document.getElementById('notice-message');
  const submitBtn = document.getElementById('notice-submit-btn');
  const alertElem = document.getElementById('notice-form-alert');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alertElem) { alertElem.style.display = 'none'; alertElem.textContent = ''; }

    const title = titleInput ? titleInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!title || !message) {
      showFormAlert(alertElem, 'Please provide both notice title and message.', true);
      return;
    }

    setBtnLoading(submitBtn, true, 'Publishing...');

    try {
      await addDoc(collection(db, 'notices'), {
        title,
        message,
        createdAt: serverTimestamp()
      });

      form.reset();
      showFormAlert(alertElem, 'Notice published successfully to public website!', false);
    } catch (err) {
      console.warn('Error publishing notice:', err);
      showFormAlert(alertElem, 'Failed to publish notice: ' + err.message, true);
    } finally {
      setBtnLoading(submitBtn, false, 'Publish Notice');
    }
  });
}

/**
 * SECTION 2: Events Collection
 */
function listenToEvents() {
  const listElem = document.getElementById('admin-events-list');
  const badgeElem = document.getElementById('events-count-badge');

  try {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    unsubEvents = onSnapshot(q, (snapshot) => {
      renderEvents(snapshot.docs, listElem, badgeElem);
    }, (err) => {
      console.warn('Events query fallback:', err);
      unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        const sortedDocs = [...snapshot.docs].sort((a, b) => {
          const dA = a.data().date || '';
          const dB = b.data().date || '';
          return dA.localeCompare(dB);
        });
        renderEvents(sortedDocs, listElem, badgeElem);
      }, (e) => {
        showFirestoreError('Failed to load events: ' + e.message);
      });
    });
  } catch (err) {
    showFirestoreError('Error setting events listener: ' + err.message);
  }
}

function renderEvents(docs, container, badge) {
  if (badge) badge.textContent = docs ? docs.length : 0;
  if (!container) return;

  if (!docs || docs.length === 0) {
    container.innerHTML = '<div class="empty-list-msg">No records yet.</div>';
    return;
  }

  container.innerHTML = docs.map((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const title = escapeHtml(data.title || 'Untitled Event');
    const date = escapeHtml(data.date || 'TBA');
    const location = escapeHtml(data.location || 'Khaira');
    const description = escapeHtml(data.description || '');

    return `
      <div class="admin-list-item" data-id="${id}">
        <div class="item-content">
          <h3 class="item-title">${title}</h3>
          <p class="item-meta">Date: ${date} &bull; Location: ${location}</p>
          <p class="item-desc">${description}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="btn-delete btn-delete-event" data-id="${id}" title="Delete event">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-delete-event').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Are you sure you want to delete this event?')) return;
      try {
        await deleteDoc(doc(db, 'events', id));
      } catch (err) {
        alert('Failed to delete event: ' + err.message);
      }
    });
  });
}

function initEventPostForm() {
  const form = document.getElementById('add-event-form');
  const titleInput = document.getElementById('event-title');
  const dateInput = document.getElementById('event-date');
  const locationInput = document.getElementById('event-location');
  const descInput = document.getElementById('event-description');
  const submitBtn = document.getElementById('event-submit-btn');
  const alertElem = document.getElementById('event-form-alert');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alertElem) { alertElem.style.display = 'none'; alertElem.textContent = ''; }

    const title = titleInput ? titleInput.value.trim() : '';
    const date = dateInput ? dateInput.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!title || !date || !location || !description) {
      showFormAlert(alertElem, 'Please fill in all required event details.', true);
      return;
    }

    setBtnLoading(submitBtn, true, 'Scheduling...');

    try {
      await addDoc(collection(db, 'events'), {
        title,
        date,
        location,
        description,
        createdAt: serverTimestamp()
      });

      form.reset();
      showFormAlert(alertElem, 'Event scheduled successfully!', false);
    } catch (err) {
      console.warn('Error scheduling event:', err);
      showFormAlert(alertElem, 'Failed to schedule event: ' + err.message, true);
    } finally {
      setBtnLoading(submitBtn, false, 'Add Event');
    }
  });
}

/**
 * SECTION 3: Volunteers Collection (Table + Status Updates + Charts 1 & 4)
 */
function listenToVolunteers() {
  const tbody = document.getElementById('admin-volunteers-tbody');
  const badgeElem = document.getElementById('volunteers-count-badge');

  try {
    unsubVolunteers = onSnapshot(collection(db, 'volunteers'), (snapshot) => {
      const docs = snapshot.docs;
      if (badgeElem) badgeElem.textContent = docs ? docs.length : 0;

      // Update Chart 1 (status distribution) & Chart 4 (timeline)
      updateVolunteersChart(docs);
      updateTimelineChart(docs);

      if (!tbody) return;

      if (!docs || docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-list-msg">No records yet.</td></tr>';
        return;
      }

      // Sort newest first
      const sortedDocs = [...docs].sort((a, b) => {
        const tA = getDocTimestamp(a.data().createdAt);
        const tB = getDocTimestamp(b.data().createdAt);
        return tB - tA;
      });

      tbody.innerHTML = sortedDocs.map((docSnap, index) => {
        const data = docSnap.data();
        const id = docSnap.id;
        const name = escapeHtml(data.name || 'Anonymous');
        const email = escapeHtml(data.email || '—');
        const className = escapeHtml(data.class || data.studentClass || '—');
        const phone = escapeHtml(data.phone || '—');
        const college = escapeHtml(data.college || 'Khaira College');
        const why = escapeHtml(data.why || data.reason || '—');
        const status = (data.status || 'pending').toLowerCase();
        const createdAt = formatTimestamp(data.createdAt);

        let statusBadgeClass = 'status-pending';
        if (status === 'approved') statusBadgeClass = 'status-approved';
        if (status === 'rejected') statusBadgeClass = 'status-rejected';

        return `
          <tr data-id="${id}">
            <td>${index + 1}</td>
            <td><strong>${name}</strong></td>
            <td>${email}</td>
            <td>${className}</td>
            <td>${phone}</td>
            <td>${college}</td>
            <td style="max-width: 200px; white-space: normal; word-break: break-word;">${why}</td>
            <td><span class="status-badge ${statusBadgeClass}">${escapeHtml(status)}</span></td>
            <td>${createdAt}</td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <button type="button" class="btn-action btn-approve-vol" data-id="${id}" ${status === 'approved' ? 'disabled' : ''}>
                  Approve
                </button>
                <button type="button" class="btn-action btn-reject-vol" data-id="${id}" ${status === 'rejected' ? 'disabled' : ''}>
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Actions
      tbody.querySelectorAll('.btn-approve-vol').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (!id) return;
          try {
            await updateDoc(doc(db, 'volunteers', id), { status: 'approved' });
          } catch (err) {
            alert('Failed to approve volunteer: ' + err.message);
          }
        });
      });

      tbody.querySelectorAll('.btn-reject-vol').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (!id) return;
          try {
            await updateDoc(doc(db, 'volunteers', id), { status: 'rejected' });
          } catch (err) {
            alert('Failed to reject volunteer: ' + err.message);
          }
        });
      });
    }, (err) => {
      showFirestoreError('Failed to load volunteers: ' + err.message);
    });
  } catch (err) {
    showFirestoreError('Error setting volunteers listener: ' + err.message);
  }
}

/**
 * SECTION 4: Members Collection (Table + Status Toggle + Chart 2)
 */
function listenToMembers() {
  const tbody = document.getElementById('admin-members-tbody');
  const badgeElem = document.getElementById('members-count-badge');

  try {
    unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const docs = snapshot.docs;
      if (badgeElem) badgeElem.textContent = docs ? docs.length : 0;

      // Update Chart 2 (members status)
      updateMembersChart(docs);

      if (!tbody) return;

      if (!docs || docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-list-msg">No records yet.</td></tr>';
        return;
      }

      const sortedDocs = [...docs].sort((a, b) => {
        const tA = getDocTimestamp(a.data().createdAt);
        const tB = getDocTimestamp(b.data().createdAt);
        return tB - tA;
      });

      tbody.innerHTML = sortedDocs.map((docSnap, index) => {
        const data = docSnap.data();
        const id = docSnap.id;
        const name = escapeHtml(data.name || data.displayName || 'Member');
        const email = escapeHtml(data.email || '—');
        const status = (data.status || 'active').toLowerCase();
        const createdAt = formatTimestamp(data.createdAt);

        const isBlocked = status === 'blocked';
        const badgeClass = isBlocked ? 'status-blocked' : 'status-active';
        const toggleActionText = isBlocked ? 'Activate' : 'Block';
        const targetStatus = isBlocked ? 'active' : 'blocked';

        return `
          <tr data-id="${id}">
            <td>${index + 1}</td>
            <td><strong>${name}</strong></td>
            <td>${email}</td>
            <td><span class="status-badge ${badgeClass}">${isBlocked ? 'Blocked' : 'Active'}</span></td>
            <td>${createdAt}</td>
            <td>
              <button type="button" class="btn-action btn-toggle-member ${isBlocked ? 'btn-approve-vol' : 'btn-reject-vol'}" data-id="${id}" data-target-status="${targetStatus}">
                ${toggleActionText}
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-toggle-member').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const targetStatus = e.currentTarget.getAttribute('data-target-status');
          if (!id || !targetStatus) return;
          try {
            await updateDoc(doc(db, 'members', id), { status: targetStatus });
          } catch (err) {
            alert('Failed to update member status: ' + err.message);
          }
        });
      });
    }, (err) => {
      showFirestoreError('Failed to load members: ' + err.message);
    });
  } catch (err) {
    showFirestoreError('Error setting members listener: ' + err.message);
  }
}

/**
 * SECTION 5: Leaders Collection (Table + Status Updates + Chart 3)
 */
function listenToLeaders() {
  const tbody = document.getElementById('admin-leaders-tbody');
  const badgeElem = document.getElementById('leaders-count-badge');

  try {
    unsubLeaders = onSnapshot(collection(db, 'leaders'), (snapshot) => {
      const docs = snapshot.docs;
      if (badgeElem) badgeElem.textContent = docs ? docs.length : 0;

      // Update Chart 3 (leaders by position)
      updateLeadersChart(docs);

      if (!tbody) return;

      if (!docs || docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-list-msg">No records yet.</td></tr>';
        return;
      }

      const sortedDocs = [...docs].sort((a, b) => {
        const tA = getDocTimestamp(a.data().createdAt);
        const tB = getDocTimestamp(b.data().createdAt);
        return tB - tA;
      });

      tbody.innerHTML = sortedDocs.map((docSnap, index) => {
        const data = docSnap.data();
        const id = docSnap.id;
        const name = escapeHtml(data.name || 'Anonymous');
        const position = escapeHtml(data.position || 'General');
        const className = escapeHtml(data.class || data.studentClass || '—');
        const phone = escapeHtml(data.phone || '—');
        const email = escapeHtml(data.email || '—');
        const why = escapeHtml(data.why || data.motivation || '—');
        const status = (data.status || 'pending').toLowerCase();

        let badgeClass = 'status-pending';
        if (status === 'approved') badgeClass = 'status-approved';
        if (status === 'rejected') badgeClass = 'status-rejected';

        return `
          <tr data-id="${id}">
            <td>${index + 1}</td>
            <td><strong>${name}</strong></td>
            <td><span class="role-badge" style="font-weight: 600;">${position}</span></td>
            <td>${className}</td>
            <td>${phone}</td>
            <td>${email}</td>
            <td style="max-width: 200px; white-space: normal; word-break: break-word;">${why}</td>
            <td><span class="status-badge ${badgeClass}">${escapeHtml(status)}</span></td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <button type="button" class="btn-action btn-approve-leader btn-approve-vol" data-id="${id}" ${status === 'approved' ? 'disabled' : ''}>
                  Approve
                </button>
                <button type="button" class="btn-action btn-reject-leader btn-reject-vol" data-id="${id}" ${status === 'rejected' ? 'disabled' : ''}>
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-approve-leader').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (!id) return;
          try {
            await updateDoc(doc(db, 'leaders', id), { status: 'approved' });
          } catch (err) {
            alert('Failed to approve leader: ' + err.message);
          }
        });
      });

      tbody.querySelectorAll('.btn-reject-leader').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (!id) return;
          try {
            await updateDoc(doc(db, 'leaders', id), { status: 'rejected' });
          } catch (err) {
            alert('Failed to reject leader: ' + err.message);
          }
        });
      });
    }, (err) => {
      showFirestoreError('Failed to load leaders: ' + err.message);
    });
  } catch (err) {
    showFirestoreError('Error setting leaders listener: ' + err.message);
  }
}

/**
 * SECTION 6: Volunteer Chat Moderation (Last 50 Messages)
 */
function listenToChat() {
  const listElem = document.getElementById('admin-chat-list');
  const badgeElem = document.getElementById('chat-count-badge');

  try {
    const q = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limit(50));
    unsubChat = onSnapshot(q, (snapshot) => {
      renderChat(snapshot.docs, listElem, badgeElem);
    }, (err) => {
      console.warn('Chat query fallback:', err);
      // Fallback query without orderBy if index is missing
      const fallbackQuery = query(collection(db, 'chat'), limit(50));
      unsubChat = onSnapshot(fallbackQuery, (snapshot) => {
        const sortedDocs = [...snapshot.docs].sort((a, b) => {
          const tA = getDocTimestamp(a.data().createdAt);
          const tB = getDocTimestamp(b.data().createdAt);
          return tB - tA;
        });
        renderChat(sortedDocs, listElem, badgeElem);
      }, (e) => {
        showFirestoreError('Failed to load chat: ' + e.message);
      });
    });
  } catch (err) {
    showFirestoreError('Error setting chat listener: ' + err.message);
  }
}

function renderChat(docs, container, badge) {
  if (badge) badge.textContent = docs ? docs.length : 0;
  if (!container) return;

  if (!docs || docs.length === 0) {
    container.innerHTML = '<div class="empty-list-msg">No records yet.</div>';
    return;
  }

  container.innerHTML = docs.map((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const name = escapeHtml(data.name || data.userName || 'Anonymous Karyakarta');
    const text = escapeHtml(data.text || data.message || '');
    const timeFormatted = formatTimestamp(data.createdAt);

    return `
      <div class="admin-list-item" data-id="${id}">
        <div class="item-content">
          <h3 class="item-title">${name}</h3>
          <p class="item-meta">${timeFormatted}</p>
          <p class="item-desc" style="white-space: pre-wrap;">${text}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="btn-delete btn-delete-chat" data-id="${id}" title="Delete message">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-delete-chat').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Are you sure you want to delete this chat message?')) return;
      try {
        await deleteDoc(doc(db, 'chat', id));
      } catch (err) {
        alert('Failed to delete chat message: ' + err.message);
      }
    });
  });
}

/**
 * =========================================================================
 * STEP 3: REAL-TIME CHARTS (Chart.js with actual Firestore document counts)
 * Colors: Saffron #D9730D, Maroon #6B1E1E, Navy #0F172A, Teal #2F6F62
 * =========================================================================
 */

/**
 * Chart 1 (bar): Volunteers by status (pending, approved, rejected)
 */
function updateVolunteersChart(docs) {
  const canvas = document.getElementById('chart-volunteers');
  if (!canvas || typeof Chart === 'undefined') return;

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  if (docs && docs.length > 0) {
    docs.forEach((d) => {
      const s = (d.data().status || 'pending').toLowerCase();
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
      else pending++;
    });
  }

  const labels = ['Pending', 'Approved', 'Rejected'];
  const data = [pending, approved, rejected];
  const total = pending + approved + rejected;

  if (chartVolunteers) {
    chartVolunteers.data.labels = labels;
    chartVolunteers.data.datasets[0].data = data;
    chartVolunteers.options.plugins.title.text = total === 0 ? 'No data yet.' : `Total Applications: ${total}`;
    chartVolunteers.update();
  } else {
    const ctx = canvas.getContext('2d');
    chartVolunteers = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Volunteers',
          data: data,
          backgroundColor: [CHART_COLORS.saffron, CHART_COLORS.teal, CHART_COLORS.maroon],
          borderColor: [CHART_COLORS.saffron, CHART_COLORS.teal, CHART_COLORS.maroon],
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: total === 0 ? 'No data yet.' : `Total Applications: ${total}`,
            font: { family: 'Cinzel, Georgia, serif', size: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }
}

/**
 * Chart 2 (doughnut): Members by status (active, blocked)
 */
function updateMembersChart(docs) {
  const canvas = document.getElementById('chart-members');
  if (!canvas || typeof Chart === 'undefined') return;

  let active = 0;
  let blocked = 0;

  if (docs && docs.length > 0) {
    docs.forEach((d) => {
      const s = (d.data().status || 'active').toLowerCase();
      if (s === 'blocked') blocked++;
      else active++;
    });
  }

  const total = active + blocked;
  const labels = ['Active', 'Blocked'];
  const data = total === 0 ? [0, 0] : [active, blocked];

  if (chartMembers) {
    chartMembers.data.labels = labels;
    chartMembers.data.datasets[0].data = data;
    chartMembers.options.plugins.title.text = total === 0 ? 'No data yet.' : `Registered Members: ${total}`;
    chartMembers.update();
  } else {
    const ctx = canvas.getContext('2d');
    chartMembers = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [CHART_COLORS.teal, CHART_COLORS.maroon],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { family: 'Cabin, sans-serif' } }
          },
          title: {
            display: true,
            text: total === 0 ? 'No data yet.' : `Registered Members: ${total}`,
            font: { family: 'Cinzel, Georgia, serif', size: 12 }
          }
        }
      }
    });
  }
}

/**
 * Chart 3 (bar): Leaders by position
 */
function updateLeadersChart(docs) {
  const canvas = document.getElementById('chart-leaders');
  if (!canvas || typeof Chart === 'undefined') return;

  const positionCounts = {};
  let total = 0;

  if (docs && docs.length > 0) {
    docs.forEach((d) => {
      total++;
      const pos = (d.data().position || 'General').trim();
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
  }

  let labels = Object.keys(positionCounts);
  let data = Object.values(positionCounts);

  if (labels.length === 0) {
    labels = ['No data yet'];
    data = [0];
  }

  const backgroundColors = labels.map((_, i) => {
    const palette = [CHART_COLORS.saffron, CHART_COLORS.maroon, CHART_COLORS.teal, CHART_COLORS.navy];
    return palette[i % palette.length];
  });

  if (chartLeaders) {
    chartLeaders.data.labels = labels;
    chartLeaders.data.datasets[0].data = data;
    chartLeaders.data.datasets[0].backgroundColor = backgroundColors;
    chartLeaders.options.plugins.title.text = total === 0 ? 'No data yet.' : `Leader Applicants: ${total}`;
    chartLeaders.update();
  } else {
    const ctx = canvas.getContext('2d');
    chartLeaders = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Applications',
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: total === 0 ? 'No data yet.' : `Leader Applicants: ${total}`,
            font: { family: 'Cinzel, Georgia, serif', size: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }
}

/**
 * Chart 4 (bar / line): New volunteers per day, using createdAt grouped by date
 */
function updateTimelineChart(docs) {
  const canvas = document.getElementById('chart-volunteers-timeline');
  if (!canvas || typeof Chart === 'undefined') return;

  const dateMap = {};
  let total = 0;

  if (docs && docs.length > 0) {
    docs.forEach((d) => {
      const dateStr = extractIsoDate(d.data().createdAt);
      if (dateStr) {
        total++;
        dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
      }
    });
  }

  const sortedDates = Object.keys(dateMap).sort();
  let labels = sortedDates;
  let data = sortedDates.map((date) => dateMap[date]);

  if (labels.length === 0) {
    labels = ['No data yet'];
    data = [0];
  }

  if (chartTimeline) {
    chartTimeline.data.labels = labels;
    chartTimeline.data.datasets[0].data = data;
    chartTimeline.options.plugins.title.text = total === 0 ? 'No data yet.' : `Submissions Logged: ${total}`;
    chartTimeline.update();
  } else {
    const ctx = canvas.getContext('2d');
    chartTimeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'New Volunteers',
          data: data,
          borderColor: CHART_COLORS.saffron,
          backgroundColor: 'rgba(217, 115, 13, 0.15)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: CHART_COLORS.maroon,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: total === 0 ? 'No data yet.' : `Submissions Logged: ${total}`,
            font: { family: 'Cinzel, Georgia, serif', size: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }
}

function destroyCharts() {
  if (chartVolunteers) { chartVolunteers.destroy(); chartVolunteers = null; }
  if (chartMembers) { chartMembers.destroy(); chartMembers = null; }
  if (chartLeaders) { chartLeaders.destroy(); chartLeaders = null; }
  if (chartTimeline) { chartTimeline.destroy(); chartTimeline = null; }
}

/**
 * =========================================================================
 * UTILITY HELPERS
 * =========================================================================
 */
function setBtnLoading(btn, isLoading, defaultText) {
  if (!btn) return;
  btn.disabled = isLoading;
  const textElem = btn.querySelector('.btn-text');
  const spinnerElem = btn.querySelector('.btn-spinner');
  if (textElem) textElem.textContent = defaultText;
  if (spinnerElem) spinnerElem.style.display = isLoading ? 'inline-block' : 'none';
}

function showFormAlert(alertElem, msg, isError) {
  if (!alertElem) return;
  alertElem.textContent = msg;
  alertElem.className = `form-alert ${isError ? 'error' : 'success'}`;
  alertElem.style.display = 'block';
  setTimeout(() => {
    if (alertElem) alertElem.style.display = 'none';
  }, 6000);
}

function showFirestoreError(msg) {
  console.warn('Firestore warning:', msg);
  const noticeElem = document.getElementById('admin-firestore-notice');
  if (!noticeElem) return;
  noticeElem.textContent = msg;
  noticeElem.style.display = 'block';
}

function formatTimestamp(val) {
  if (!val) return '—';
  try {
    if (typeof val.toDate === 'function') {
      return val.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }
  } catch (e) {}
  return String(val);
}

function extractIsoDate(val) {
  if (!val) return null;
  try {
    let d = null;
    if (typeof val.toDate === 'function') {
      d = val.toDate();
    } else if (typeof val.seconds === 'number') {
      d = new Date(val.seconds * 1000);
    } else {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    if (d) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return null;
}

function getDocTimestamp(val) {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
