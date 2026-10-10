// Live Firestore Events Listener for ABVP Khaira College
import { db } from './firebase.js';
import { collection, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let unsubscribeEvents = null;

/**
 * Format date string "YYYY-MM-DD" into readable "20 Oct 2026".
 * If invalid or alternative format, returns raw string safely without crashing.
 */
export function formatEventDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return dateStr ? String(dateStr) : '';
  }

  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return trimmed;
  }

  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
    return `${day} ${months[monthIdx]} ${year}`;
  }

  return trimmed;
}

/**
 * Escapes HTML characters to prevent XSS.
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
 * Initialize real-time events subscription
 */
export function initEvents() {
  const container = document.getElementById('events-list');
  if (!container) return null;

  try {
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, orderBy('date', 'asc'));

    unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = `
          <article class="event-card tilt-card" tabindex="0">
            <div class="event-card-top">
              <span class="event-card-date">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                15 Oct 2026
              </span>
              <span class="event-card-location">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Khaira College Campus
              </span>
            </div>
            <h3 class="event-card-title">Student Union Election Voting Day 2026</h3>
            <p class="event-card-desc">Cast your vote for ABVP candidates for President and General Secretary. Every vote counts for campus progress!</p>
          </article>
          <article class="event-card tilt-card" tabindex="0">
            <div class="event-card-top">
              <span class="event-card-date">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                22 Oct 2026
              </span>
              <span class="event-card-location">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                College Garden
              </span>
            </div>
            <h3 class="event-card-title">Campus Cleanliness &amp; Plantation Drive</h3>
            <p class="event-card-desc">Swachh Campus initiative and environmental awareness drive organized by ABVP karyakartas.</p>
          </article>
          <article class="event-card tilt-card" tabindex="0">
            <div class="event-card-top">
              <span class="event-card-date">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                12 Nov 2026
              </span>
              <span class="event-card-location">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                College Auditorium
              </span>
            </div>
            <h3 class="event-card-title">National Youth Day &amp; Blood Donation Camp</h3>
            <p class="event-card-desc">Annual youth empowerment seminar and voluntary blood donation drive for students and faculty.</p>
          </article>
        `;
        attachTiltToEvents(container);
        return;
      }

      const cardsHtml = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const title = data.title || 'Campus Event';
        const rawDate = data.date || '';
        const displayDate = formatEventDate(rawDate);
        const location = data.location || 'Khaira College Campus';
        const description = data.description || '';

        cardsHtml.push(`
          <article class="event-card tilt-card" tabindex="0">
            <div class="event-card-top">
              <span class="event-card-date">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${escapeHtml(displayDate)}
              </span>
              <span class="event-card-location">
                <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${escapeHtml(location)}
              </span>
            </div>
            <h3 class="event-card-title">${escapeHtml(title)}</h3>
            <p class="event-card-desc">${escapeHtml(description)}</p>
          </article>
        `);
      });

      container.innerHTML = cardsHtml.join('');
      attachTiltToEvents(container);
    }, (error) => {
      console.warn('Firestore events offline/rule notice, rendering real local data:', error);
      renderFallbackEvents(container);
    });
  } catch (err) {
    console.warn('Error setting up events snapshot listener, rendering real local data:', err);
    renderFallbackEvents(container);
  }

function renderFallbackEvents(elem) {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem('abvp_real_events'));
  } catch (e) {}

  if (Array.isArray(stored) && stored.length > 0) {
    elem.innerHTML = stored.map(ev => `
      <article class="event-card tilt-card" tabindex="0">
        <div class="event-card-top">
          <span class="event-card-date">
            <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${escapeHtml(formatEventDate(ev.date))}
          </span>
          <span class="event-card-location">
            <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            ${escapeHtml(ev.location || 'Khaira College Campus')}
          </span>
        </div>
        <h3 class="event-card-title">${escapeHtml(ev.title)}</h3>
        <p class="event-card-desc">${escapeHtml(ev.description || '')}</p>
      </article>
    `).join('');
    attachTiltToEvents(elem);
    return;
  }

  elem.innerHTML = `
    <article class="event-card tilt-card" tabindex="0">
      <div class="event-card-top">
        <span class="event-card-date">
          <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          14 Oct 2026
        </span>
        <span class="event-card-location">
          <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Khaira College Auditorium
        </span>
      </div>
      <h3 class="event-card-title">Mission Sahasi: Self-Defense Training Workshop</h3>
      <p class="event-card-desc">Professional martial arts instructors empowering female students with physical confidence, awareness, and bravery techniques.</p>
    </article>
    <article class="event-card tilt-card" tabindex="0">
      <div class="event-card-top">
        <span class="event-card-date">
          <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          15 Oct 2026
        </span>
        <span class="event-card-location">
          <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Campus Main Gate Helpdesk
        </span>
      </div>
      <h3 class="event-card-title">Student Union Voting Day &amp; Assistance Desk</h3>
      <p class="event-card-desc">Cast your vote for ABVP candidates for President and Secretary. Join the volunteer support desk to guide first-time student voters.</p>
    </article>
    <article class="event-card tilt-card" tabindex="0">
      <div class="event-card-top">
        <span class="event-card-date">
          <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          20 Oct 2026
        </span>
        <span class="event-card-location">
          <svg class="event-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          College Campus Grounds
        </span>
      </div>
      <h3 class="event-card-title">Swachh Campus &amp; Tree Plantation Drive</h3>
      <p class="event-card-desc">Annual campus beautification, tree plantation, and anti-plastic environmental campaign led by ABVP volunteers.</p>
    </article>
  `;
  attachTiltToEvents(elem);
}

  // Unsubscribe when page unloads
  window.addEventListener('beforeunload', () => {
    if (unsubscribeEvents) {
      unsubscribeEvents();
      unsubscribeEvents = null;
    }
  });

  return unsubscribeEvents;
}

/**
 * 3D Tilt handler for event cards (max 4deg, off on touch & reduced motion)
 */
function attachTiltToEvents(container) {
  if (window.matchMedia && (window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    return;
  }

  const cards = container.querySelectorAll('.event-card.tilt-card');
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
