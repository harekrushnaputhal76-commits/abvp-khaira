// QR Code Generator and Action Controller for ABVP Khaira College

export function initQRCode() {
  const canvas = document.getElementById('qr-canvas');
  const errorBox = document.getElementById('qr-error');
  const downloadBtn = document.getElementById('qr-download-btn');
  const copyBtn = document.getElementById('qr-copy-btn');
  const copyFeedback = document.getElementById('qr-copy-feedback');

  if (!canvas) return;

  let pageUrl = window.location.href;
  // If running locally or on file, generate QR for the live public site so smartphones can scan and open it!
  if (!pageUrl.startsWith('http') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    pageUrl = 'https://harekrushnaputhal76-commits.github.io/abvp-khaira/';
  }

  const captionElem = document.querySelector('.qr-card-caption');
  if (captionElem) {
    captionElem.textContent = 'harekrushnaputhal76-commits.github.io/abvp-khaira';
  }

  const isDesktop = window.innerWidth >= 768;
  const qrSize = isDesktop ? 260 : 220;

  // Render QR code
  renderQRWithFallback(canvas, errorBox, pageUrl, qrSize);

  // Download QR as PNG
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'abvp-khaira-qr.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.warn('Unable to export canvas as PNG:', err);
      }
    });
  }

  // Copy Page URL with friendly clipboard handling
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const urlToCopy = pageUrl;
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(urlToCopy);
          copied = true;
        } catch (clipErr) {
          console.warn('Clipboard writeText failed, using fallback:', clipErr);
        }
      }

      if (!copied) {
        // Fallback textarea method
        try {
          const textarea = document.createElement('textarea');
          textarea.value = urlToCopy;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch (execErr) {
          console.warn('Document execCommand copy failed:', execErr);
        }
      }

      showCopyStatus(copyFeedback, copyBtn, copied);
    });
  }
}

/**
 * Attempts to render QR using window.QRCode with timeout/fallback check
 */
function renderQRWithFallback(canvas, errorBox, url, size) {
  let attempts = 0;
  const maxAttempts = 15;

  function tryGenerate() {
    if (typeof window.QRCode !== 'undefined' && typeof window.QRCode.toCanvas === 'function') {
      window.QRCode.toCanvas(canvas, url, {
        width: size,
        margin: 2,
        color: {
          dark: '#0B1020',
          light: '#FFFFFF'
        }
      }, (err) => {
        if (err) {
          console.warn('QRCode generation error, using fallback:', err);
          renderImageQR(canvas, errorBox, url, size);
        } else {
          canvas.style.display = 'block';
          if (errorBox) errorBox.style.display = 'none';
        }
      });
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(tryGenerate, 150);
    } else {
      renderImageQR(canvas, errorBox, url, size);
    }
  }

  tryGenerate();
}

function renderImageQR(canvas, errorBox, url, size) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=0B1020&bgcolor=FFFFFF`;
  img.onload = () => {
    try {
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      canvas.style.display = 'block';
      if (errorBox) errorBox.style.display = 'none';
    } catch (e) {
      console.warn('Canvas fallback draw error:', e);
    }
  };
  img.onerror = () => {
    showQRError(canvas, errorBox);
  };
}

function showQRError(canvas, errorBox) {
  if (canvas) canvas.style.display = 'none';
  if (errorBox) {
    errorBox.textContent = 'QR code could not load. Please refresh.';
    errorBox.style.display = 'block';
  }
}

function showCopyStatus(feedbackElem, btnElem, isSuccess) {
  const originalText = btnElem ? btnElem.querySelector('.btn-text') : null;
  const prevLabel = originalText ? originalText.textContent : 'Copy Link';

  if (originalText) {
    originalText.textContent = isSuccess ? 'Copied!' : 'Link Copied';
  }

  if (feedbackElem) {
    feedbackElem.textContent = isSuccess ? 'Copied to clipboard!' : 'Copied!';
    feedbackElem.style.display = 'inline-block';
  }

  setTimeout(() => {
    if (originalText) originalText.textContent = prevLabel;
    if (feedbackElem) feedbackElem.style.display = 'none';
  }, 2500);
}

