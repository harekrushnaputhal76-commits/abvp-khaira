// Lightbox and Gallery Interactions for ABVP Khaira College

export function initGallery() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  const modal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.querySelector('.lightbox-close');
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');

  if (!galleryItems.length || !modal || !lightboxImg) return;

  const imagesData = Array.from(galleryItems).map((item) => {
    const img = item.querySelector('.gallery-img');
    return {
      src: img ? img.getAttribute('src') : '',
      alt: img ? img.getAttribute('alt') || 'Gallery Image' : 'Gallery Image',
      caption: item.dataset.caption || (img ? img.getAttribute('alt') : '')
    };
  });

  let currentIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  function openLightbox(index) {
    currentIndex = index;
    updateLightboxContent();
    modal.style.display = 'flex';
    // Force reflow for CSS transition
    void modal.offsetWidth;
    modal.classList.add('is-active');
    document.body.classList.add('lightbox-locked');
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    modal.classList.remove('is-active');
    document.body.classList.remove('lightbox-locked');
    setTimeout(() => {
      if (!modal.classList.contains('is-active')) {
        modal.style.display = 'none';
        lightboxImg.src = '';
      }
    }, 280);
  }

  function updateLightboxContent() {
    const current = imagesData[currentIndex];
    if (!current) return;
    lightboxImg.src = current.src;
    lightboxImg.alt = current.alt;
    if (lightboxCaption) {
      lightboxCaption.textContent = current.caption;
    }
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % imagesData.length;
    updateLightboxContent();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + imagesData.length) % imagesData.length;
    updateLightboxContent();
  }

  // Open on thumbnail tap/click
  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(index);
      }
    });
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });
  }

  // Next / Prev buttons
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showNext();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPrev();
    });
  }

  // Close on backdrop click (outside image and nav buttons)
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('lightbox-backdrop') || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  // Keyboard navigation (Escape, Left, Right)
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-active')) return;
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      showNext();
    } else if (e.key === 'ArrowLeft') {
      showPrev();
    }
  });

  // Touch Swipe for mobile (left & right swipe)
  modal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].screenX;
      touchStartY = e.touches[0].screenY;
    }
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;

      // Check if horizontal swipe is dominant and exceeds minimum threshold of 40px
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          // Swiped left -> next
          showNext();
        } else {
          // Swiped right -> prev
          showPrev();
        }
      }
    }
  }, { passive: true });
}

