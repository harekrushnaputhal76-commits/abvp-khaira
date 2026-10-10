// Client-side interactions and Firestore integration for ABVP Khaira College
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { initNotices } from './notices.js';
import { initEvents } from './events.js';
import { initGallery } from './gallery.js';
import { initQRCode } from './qr.js';
import { subscribeAuthState, signOut } from './auth.js';
import { initMemberSection, updateMemberUI } from './member.js';
import { initVolunteerApply, updateVolunteerAuth } from './volunteer-apply.js';

function initApp() {
  initNavbar();
  initTicker();
  initTiltCards();
  initElectionCountdown();
  initLeaderForm();
  initNotices();
  initEvents();
  initGallery();
  initQRCode();
  initMemberSection();
  initVolunteerApply();
  initAuthObserver();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/**
 * Auth State Observer for Navbar and Modules
 */
function initAuthObserver() {
  const userBar = document.getElementById('nav-user-bar');
  const userNameElem = document.getElementById('nav-user-name');
  const logoutBtn = document.getElementById('nav-logout-btn');
  const navJoinBtn = document.getElementById('nav-join-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
      } catch (e) {
        console.error('Logout error:', e);
      }
    });
  }

  subscribeAuthState((user) => {
    if (user) {
      if (userBar) userBar.style.display = 'flex';
      if (userNameElem) userNameElem.textContent = user.displayName ? user.displayName.split(' ')[0] : 'Member';
      if (navJoinBtn) navJoinBtn.style.display = 'none';
    } else {
      if (userBar) userBar.style.display = 'none';
      if (navJoinBtn) navJoinBtn.style.display = 'inline-flex';
    }

    updateMemberUI(user);
    updateVolunteerAuth(user);
  });
}

/**
 * 1. Navbar Mobile Drawer & Auto-Close
 */
function initNavbar() {
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const navLinks = document.querySelector('.nav-links');
  const navLinkItems = document.querySelectorAll('.nav-link');

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburgerBtn.classList.toggle('open', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
    });

    navLinkItems.forEach((link) => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          hamburgerBtn.classList.remove('open');
          hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!navLinks.contains(event.target) && !hamburgerBtn.contains(event.target)) {
        if (navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          hamburgerBtn.classList.remove('open');
          hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }
}

/**
 * 2. Promo Ticker Hover/Tap Pause
 */
function initTicker() {
  const ticker = document.getElementById('promo-ticker');
  if (!ticker) return;

  // Toggle paused class on touch tap
  ticker.addEventListener('click', () => {
    ticker.classList.toggle('paused');
  });

  // Touch handlers to pause on touch
  ticker.addEventListener('touchstart', () => {
    ticker.classList.add('paused');
  }, { passive: true });

  ticker.addEventListener('touchend', () => {
    setTimeout(() => {
      ticker.classList.remove('paused');
    }, 1500);
  }, { passive: true });
}

/**
 * 3. 3D Tilt Effect on Highlight Cards (Max 4deg, off on touch devices & reduced motion)
 */
function initTiltCards() {
  if (window.matchMedia && (window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    return;
  }

  const cards = document.querySelectorAll('.tilt-card');
  if (!cards.length) return;

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

/**
 * 4. Leader Form Validation & Firestore Submission
 */
function initLeaderForm() {
  const form = document.getElementById('leader-form');
  const alertBox = document.getElementById('leader-form-alert');
  const submitBtn = document.getElementById('leader-submit-btn');
  const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
  const btnSpinner = submitBtn ? submitBtn.querySelector('.btn-spinner') : null;

  const nameInput = document.getElementById('leader-name');
  const fatherInput = document.getElementById('leader-father');
  const classSelect = document.getElementById('leader-class');
  const phoneInput = document.getElementById('leader-phone');
  const emailInput = document.getElementById('leader-email');
  const positionSelect = document.getElementById('leader-position');
  const whyInput = document.getElementById('leader-why');
  const whyCounter = document.getElementById('why-counter');
  const agreeCheckbox = document.getElementById('leader-agree');

  if (!form) return;

  // Phone input: strictly digits only
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  // Live character counter for Why Join textarea
  if (whyInput && whyCounter) {
    whyInput.addEventListener('input', () => {
      const length = whyInput.value.length;
      whyCounter.textContent = `${length} / 300`;
      if (length > 300) {
        whyCounter.style.color = 'var(--error)';
      } else {
        whyCounter.style.color = 'var(--ink-soft)';
      }
    });
  }

  // Clear single error on input
  [nameInput, fatherInput, classSelect, phoneInput, emailInput, positionSelect, whyInput, agreeCheckbox].forEach((elem) => {
    if (!elem) return;
    const eventName = elem.type === 'checkbox' || elem.tagName === 'SELECT' ? 'change' : 'input';
    elem.addEventListener(eventName, () => {
      clearFieldError(elem);
      if (alertBox.style.display === 'block' && alertBox.classList.contains('error')) {
        alertBox.style.display = 'none';
      }
    });
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearAllErrors();
    showAlert('', false);

    let isValid = true;

    // 1. Full Name: required, max 60 chars
    const fullNameVal = nameInput ? nameInput.value.trim() : '';
    if (!fullNameVal) {
      setFieldError(nameInput, 'Full name is required.');
      isValid = false;
    } else if (fullNameVal.length > 60) {
      setFieldError(nameInput, 'Full name cannot exceed 60 characters.');
      isValid = false;
    }

    // 2. Father's Name: optional, max 60 chars
    const fatherNameVal = fatherInput ? fatherInput.value.trim() : '';
    if (fatherNameVal.length > 60) {
      setFieldError(fatherInput, "Father's name cannot exceed 60 characters.");
      isValid = false;
    }

    // 3. Class: required, select
    const classVal = classSelect ? classSelect.value : '';
    const allowedClasses = ['+2 1st Year', '+2 2nd Year', '+3 1st Year', '+3 2nd Year', 'Other'];
    if (!classVal || !allowedClasses.includes(classVal)) {
      setFieldError(classSelect, 'Please select your current class.');
      isValid = false;
    }

    // 4. Phone: required, exactly 10 digits
    const phoneVal = phoneInput ? phoneInput.value.trim() : '';
    const phoneRegex = /^\d{10}$/;
    if (!phoneVal) {
      setFieldError(phoneInput, 'Mobile phone number is required.');
      isValid = false;
    } else if (!phoneRegex.test(phoneVal)) {
      setFieldError(phoneInput, 'Phone number must be exactly 10 digits.');
      isValid = false;
    }

    // 5. Email: optional, valid format if provided
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailVal && !emailRegex.test(emailVal)) {
      setFieldError(emailInput, 'Please enter a valid email address.');
      isValid = false;
    }

    // 6. Position: required, select
    const positionVal = positionSelect ? positionSelect.value : '';
    const allowedPositions = ['Karyakarta', 'Team Lead', 'Event Coordinator', 'Social Media', 'Tech/Web Team'];
    if (!positionVal || !allowedPositions.includes(positionVal)) {
      setFieldError(positionSelect, 'Please select a leadership position.');
      isValid = false;
    }

    // 7. Why do you want to join?: required, max 300 chars
    const whyVal = whyInput ? whyInput.value.trim() : '';
    if (!whyVal) {
      setFieldError(whyInput, 'Please share your motivation for joining as a leader.');
      isValid = false;
    } else if (whyVal.length > 300) {
      setFieldError(whyInput, 'Motivation cannot exceed 300 characters.');
      isValid = false;
    }

    // 8. Code of Conduct Checkbox: required
    if (!agreeCheckbox || !agreeCheckbox.checked) {
      setFieldError(agreeCheckbox, "You must agree to the organisation's code of conduct.");
      isValid = false;
    }

    if (!isValid) {
      showAlert('Please correct the highlighted errors before submitting.', false);
      return;
    }

    // Prepare payload saving to collection 'leaders'
    const leaderPayload = {
      name: fullNameVal,
      fullName: fullNameVal,
      fatherName: fatherNameVal || '',
      class: classVal,
      phone: phoneVal,
      email: emailVal || '',
      position: positionVal,
      why: whyVal,
      whyJoin: whyVal,
      agreedCode: true,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'leaders'), leaderPayload);

      showAlert('Thank you! Your leadership application has been submitted successfully. Our karyakarta team will connect with you soon.', true);
      form.reset();
      if (whyCounter) whyCounter.textContent = '0 / 300';
    } catch (err) {
      console.error('Error saving leader application:', err);
      showAlert('Unable to submit your application right now. Please check your network connection and try again.', false);
    } finally {
      setSubmitting(false);
    }
  });

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    if (btnText) {
      btnText.textContent = isSubmitting ? 'Saving Application...' : 'Submit Leadership Application';
    }
    if (btnSpinner) {
      btnSpinner.style.display = isSubmitting ? 'inline-block' : 'none';
    }
  }

  function setFieldError(fieldElem, message) {
    if (!fieldElem) return;
    fieldElem.classList.add('invalid');
    const errElem = document.getElementById(`error-${fieldElem.id}`);
    if (errElem) {
      errElem.textContent = message;
    }
  }

  function clearFieldError(fieldElem) {
    if (!fieldElem) return;
    fieldElem.classList.remove('invalid');
    const errElem = document.getElementById(`error-${fieldElem.id}`);
    if (errElem) {
      errElem.textContent = '';
    }
  }

  function clearAllErrors() {
    const errorContainers = form.querySelectorAll('.field-error');
    errorContainers.forEach(el => el.textContent = '');
    const invalidInputs = form.querySelectorAll('.invalid');
    invalidInputs.forEach(el => el.classList.remove('invalid'));
  }

  function showAlert(message, isSuccess) {
    if (!alertBox) return;
    if (!message) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
      alertBox.className = 'form-alert';
      return;
    }

    alertBox.textContent = message;
    alertBox.className = `form-alert ${isSuccess ? 'success' : 'error'}`;
    alertBox.style.display = 'block';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Live Countdown to Campus Election Day (15 October 2026)
 */
function initElectionCountdown() {
  const heroDays = document.getElementById('hero-cd-days');
  const heroHours = document.getElementById('hero-cd-hours');
  const heroMins = document.getElementById('hero-cd-mins');
  const heroSecs = document.getElementById('hero-cd-secs');

  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMins = document.getElementById('cd-mins');
  const cdSecs = document.getElementById('cd-secs');

  // Campus Election Voting: 15 October 2026, 08:00 AM IST
  const targetTime = new Date('2026-10-15T08:00:00+05:30').getTime();

  function updateTimer() {
    const now = Date.now();
    const diff = targetTime - now;

    let days = 0, hours = 0, mins = 0, secs = 0;
    if (diff > 0) {
      days = Math.floor(diff / (1000 * 60 * 60 * 24));
      hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      secs = Math.floor((diff % (1000 * 60)) / 1000);
    }

    const dStr = String(days).padStart(2, '0');
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(mins).padStart(2, '0');
    const sStr = String(secs).padStart(2, '0');

    // Update Hero Countdown
    if (heroDays) heroDays.textContent = dStr;
    if (heroHours) heroHours.textContent = hStr;
    if (heroMins) heroMins.textContent = mStr;
    if (heroSecs) heroSecs.textContent = sStr;

    // Update Election Section Countdown
    if (cdDays) cdDays.textContent = dStr;
    if (cdHours) cdHours.textContent = hStr;
    if (cdMins) cdMins.textContent = mStr;
    if (cdSecs) cdSecs.textContent = sStr;
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}
