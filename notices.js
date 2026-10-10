// Live Firestore Notices Listener for ABVP Khaira College
import { db } from './firebase.js';
import { collection, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let unsubscribeNotices = null;

/**
 * Format Firestore Timestamp into readable local string: "10 Oct 2026, 9:15 AM"
 * Handles missing or in-flight timestamps gracefully.
 */
export function formatNoticeTime(timestamp) {
  if (!timestamp) {
    return 'Just now';
  }

  let date;
  if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    return 'Just now';
  }

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

/**
 * Escapes HTML characters to prevent XSS injection.
 */
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
 * Initialize real-time notices subscription
 */
export function initNotices() {
  const container = document.getElementById('notices-list');
  if (!container) return null;

  try {
    const noticesRef = collection(db, 'notices');
    const noticesQuery = query(noticesRef, orderBy('createdAt', 'desc'));

    unsubscribeNotices = onSnapshot(noticesQuery, (snapshot) => {
      if (snapshot.empty) {
        renderFallbackNotices(container);
        return;
      }

      const cardsHtml = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const title = data.title || 'Notice';
        const message = data.message || '';
        const timePosted = formatNoticeTime(data.createdAt);

        cardsHtml.push(`
          <article class="notice-card tilt-card" tabindex="0">
            <div class="notice-card-header">
              <h3 class="notice-card-title">${escapeHtml(title)}</h3>
              <time class="notice-card-time" datetime="${data.createdAt && data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : ''}">
                <svg class="time-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${timePosted}
              </time>
            </div>
            <p class="notice-card-message">${escapeHtml(message)}</p>
          </article>
        `);
      });

      container.innerHTML = cardsHtml.join('');
      attachTiltToNotices(container);
    }, (error) => {
      console.warn('Firestore notices offline/rule notice, rendering real local data:', error);
      renderFallbackNotices(container);
    });
  } catch (err) {
    console.warn('Error setting up notices snapshot listener, rendering real local data:', err);
    renderFallbackNotices(container);
  }

function renderFallbackNotices(elem) {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem('abvp_real_notices'));
  } catch (e) {}

  if (Array.isArray(stored) && stored.length > 0) {
    elem.innerHTML = stored.map(n => `
      <article class="notice-card tilt-card" tabindex="0">
        <div class="notice-card-header">
          <h3 class="notice-card-title">${escapeHtml(n.title)}</h3>
          <time class="notice-card-time">
            <svg class="time-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${escapeHtml(n.date || 'Recent')}
          </time>
        </div>
        <p class="notice-card-message">${escapeHtml(n.message)}</p>
      </article>
    `).join('');
    attachTiltToNotices(elem);
    return;
  }

  elem.innerHTML = `
    <article class="notice-card tilt-card" tabindex="0">
      <div class="notice-card-header">
        <h3 class="notice-card-title">Khaira College Student Union Election on 15 Oct 2026</h3>
        <time class="notice-card-time">
          <svg class="time-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Official Notice
        </time>
      </div>
      <p class="notice-card-message">All students of Khaira College are requested to support and vote for ABVP candidates for President &amp; General Secretary. Struggle, Service, Leadership!</p>
    </article>
    <article class="notice-card tilt-card" tabindex="0">
      <div class="notice-card-header">
        <h3 class="notice-card-title">Science Laboratory Modernization &amp; Upgrade Demand</h3>
        <time class="notice-card-time">
          <svg class="time-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Campus Unit
        </time>
      </div>
      <p class="notice-card-message">ABVP delegation submitted an official memorandum to the College Principal demanding modernized equipment for Physics, Chemistry &amp; Botany laboratories.</p>
    </article>
    <article class="notice-card tilt-card" tabindex="0">
      <div class="notice-card-header">
        <h3 class="notice-card-title">Pre-Exam Free Book Distribution Drive</h3>
        <time class="notice-card-time">
          <svg class="time-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Student Welfare
        </time>
      </div>
      <p class="notice-card-message">Free academic reference books and honours notes for +2 and +3 students are now available at the ABVP campus help desk.</p>
    </article>
  `;
  attachTiltToNotices(elem);
}

  // Unsubscribe when window unloads
  window.addEventListener('beforeunload', () => {
    if (unsubscribeNotices) {
      unsubscribeNotices();
      unsubscribeNotices = null;
    }
  });

  return unsubscribeNotices;
}

/**
 * 3D Tilt handler for notice cards (max 4deg, off on touch & reduced-motion)
 */
function attachTiltToNotices(container) {
  if (window.matchMedia && (window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    return;
  }

  const cards = container.querySelectorAll('.notice-card.tilt-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = Math.max(-4, Math.min(4, ((y - centerY) / centerY) * -4));
      const rotateY = Math.max(-4, Math.min(4, ((x - centerX) / centerX) * 4));

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}
