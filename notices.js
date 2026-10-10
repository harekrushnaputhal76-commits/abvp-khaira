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
        container.innerHTML = `
          <div class="notices-empty" role="status">
            <svg class="empty-icon" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p>No notices yet. Check back soon.</p>
          </div>
        `;
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

      // Attach 3D tilt interactions to newly rendered dynamic cards
      attachTiltToNotices(container);
    }, (error) => {
      // Log to console only as required
      console.error('Firestore notices listener error:', error);
      container.innerHTML = `
        <div class="notices-error" role="alert">
          <p>Could not load notices. Please try again later.</p>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error setting up notices snapshot listener:', err);
    container.innerHTML = `
      <div class="notices-error" role="alert">
        <p>Could not load notices. Please try again later.</p>
      </div>
    `;
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
