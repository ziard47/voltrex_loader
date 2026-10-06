/**
 * Voltrex Loader - Official Showcase Website Logic
 * Handles interactive simulation, speed benchmarks, probe modal, copy toast, FAQ toggles
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSimulator();
  initScrollTour();
  initSpeedEstimator();
  initFaqAccordion();
  initProbeModal();
  initCopyButtons();
});

/* ==========================================================================
   1. Navbar Scroll Effect & Mobile Menu
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      mobileToggle.innerHTML = isOpen 
        ? '<i class="fa-solid fa-xmark"></i>' 
        : '<i class="fa-solid fa-bars"></i>';
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile nav when clicking any nav link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when clicking outside of navbar
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) {
        if (navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          mobileToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  // Smooth scroll to top for brand logo and footer "Back to top" links
  const topLinks = document.querySelectorAll('a[href="#top"]');
  topLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      }
    });
  });
}

/* ==========================================================================
   2. Interactive Live Download Simulator
   ========================================================================== */
function initSimulator() {
  const speedDisplay = document.getElementById('simSpeedVal');
  const progressFill = document.getElementById('simProgressFill');
  const progressPercent = document.getElementById('simProgressPercent');
  const bytesDisplay = document.getElementById('simBytesDisplay');
  const etaDisplay = document.getElementById('simEtaDisplay');
  const statusBadge = document.getElementById('simStatusBadge');
  const chunkGrid = document.getElementById('simChunkGrid');
  const boostBtn = document.getElementById('btnBoostThreads');
  const pauseBtn = document.getElementById('btnPauseSim');
  const dropResumeBtn = document.getElementById('btnDropResumeSim');

  if (!chunkGrid) return;

  // Generate 32 Chunk Matrix Blocks
  const totalChunks = 32;
  chunkGrid.innerHTML = '';
  const chunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunk = document.createElement('div');
    chunk.className = 'chunk-block';
    chunkGrid.appendChild(chunk);
    chunks.push(chunk);
  }

  let isPaused = false;
  let isBoosted = false;
  let progress = 62.4; // Initial percentage
  const totalSizeGB = 5.8; // Ubuntu 24.04 ISO size
  let currentSpeedMB = 48.6;
  let activeThreads = 16;

  function updateChunkStates() {
    const completedCount = Math.floor((progress / 100) * totalChunks);
    const streamingCount = isPaused ? 0 : (isBoosted ? 12 : 6);

    chunks.forEach((chunk, idx) => {
      chunk.className = 'chunk-block';
      if (idx < completedCount) {
        chunk.classList.add('done');
      } else if (idx < completedCount + streamingCount && idx < totalChunks) {
        chunk.classList.add('streaming');
      } else {
        chunk.classList.add('queued');
      }
    });
  }

  // Simulation loop tick
  const simInterval = setInterval(() => {
    if (isPaused) {
      if (speedDisplay) speedDisplay.textContent = '0.0 MB/s';
      if (statusBadge) {
        statusBadge.textContent = 'PAUSED';
        statusBadge.style.color = '#ff9800';
        statusBadge.style.background = 'rgba(255, 152, 0, 0.15)';
      }
      return;
    }

    // Fluctuating realistic speed
    const baseSpeed = isBoosted ? 88.0 : 48.0;
    const variation = (Math.random() * 8 - 4);
    currentSpeedMB = Math.max(10, Math.min(115, baseSpeed + variation));

    // Advance progress
    const increment = (currentSpeedMB / (totalSizeGB * 1024)) * 1.5;
    progress += increment;

    if (progress >= 100) {
      progress = 100;
      isPaused = true;
      if (statusBadge) {
        statusBadge.textContent = 'COMPLETED';
        statusBadge.style.color = '#00e676';
        statusBadge.style.background = 'rgba(0, 230, 118, 0.15)';
      }
      if (etaDisplay) etaDisplay.textContent = 'Done (0s)';
    }

    const downloadedGB = ((progress / 100) * totalSizeGB).toFixed(2);
    const remainingGB = totalSizeGB - ((progress / 100) * totalSizeGB);
    const remainingSeconds = Math.max(0, Math.round((remainingGB * 1024) / currentSpeedMB));

    if (speedDisplay) speedDisplay.textContent = `${currentSpeedMB.toFixed(1)} MB/s`;
    if (progressFill) progressFill.style.width = `${progress.toFixed(1)}%`;
    if (progressPercent) progressPercent.textContent = `${progress.toFixed(1)}%`;
    if (bytesDisplay) bytesDisplay.textContent = `${downloadedGB} GB / ${totalSizeGB} GB`;
    if (etaDisplay && progress < 100) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      etaDisplay.textContent = `${mins}m ${secs}s`;
    }

    updateChunkStates();
  }, 400);

  // Boost Button
  if (boostBtn) {
    boostBtn.addEventListener('click', () => {
      isBoosted = !isBoosted;
      activeThreads = isBoosted ? 32 : 16;
      boostBtn.classList.toggle('active-red', isBoosted);
      boostBtn.innerHTML = isBoosted
        ? '<i class="fa-solid fa-bolt"></i> Boosted to 32 Streams (Active)'
        : '<i class="fa-solid fa-bolt"></i> Boost to 32 Streams';
      
      const threadPill = document.getElementById('simActiveThreadCount');
      if (threadPill) threadPill.textContent = `${activeThreads} Threads`;

      showToast(isBoosted ? 'Multi-stream boost: 32 parallel HTTP Range threads engaged.' : 'Standard mode: 16 threads.');
    });
  }

  // Pause / Resume Button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      pauseBtn.innerHTML = isPaused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
      if (!isPaused) {
        if (statusBadge) {
          statusBadge.innerHTML = '<i class="fa-solid fa-circle"></i> <span>DOWNLOADING</span>';
          statusBadge.style.color = '#10b981';
          statusBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        }
        showToast('Resuming multi-chunk streams via HTTP Range requests.');
      } else {
        if (statusBadge) {
          statusBadge.innerHTML = '<i class="fa-solid fa-circle"></i> <span>PAUSED</span>';
          statusBadge.style.color = '#f59e0b';
          statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
        }
        showToast('Transfer paused. In-place .part chunks preserved.');
      }
    });
  }

  // Simulate Connection Drop & Range Resume
  if (dropResumeBtn) {
    dropResumeBtn.addEventListener('click', () => {
      isPaused = true;
      if (statusBadge) {
        statusBadge.innerHTML = '<i class="fa-solid fa-circle"></i> <span>NETWORK DROPPED</span>';
        statusBadge.style.color = '#e53935';
        statusBadge.style.background = 'rgba(229, 57, 53, 0.15)';
      }
      if (speedDisplay) speedDisplay.textContent = '0.0 MB/s';
      showToast('Simulated connection drop. Testing range resume recovery...');

      setTimeout(() => {
        showToast('Range headers verified. Resuming without restarting.');
        isPaused = false;
        if (statusBadge) {
          statusBadge.innerHTML = '<i class="fa-solid fa-circle"></i> <span>DOWNLOADING</span>';
          statusBadge.style.color = '#10b981';
          statusBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        }
        if (pauseBtn) pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }, 1600);
    });
  }
}

/* ==========================================================================
   3. Speed Comparison Estimator
   ========================================================================== */
function initSpeedEstimator() {
  const slider = document.getElementById('fileSizeSlider');
  const sizeDisplay = document.getElementById('sliderSizeDisplay');
  const voltrexTime = document.getElementById('timeVoltrex');
  const browserTime = document.getElementById('timeBrowser');
  const barVoltrex = document.getElementById('barVoltrex');
  const barBrowser = document.getElementById('barBrowser');

  if (!slider) return;

  function updateEstimates(gb) {
    sizeDisplay.textContent = `${gb} GB`;

    // Speeds: Voltrex ~ 60 MB/s (multi-stream), Browser ~ 7 MB/s (single-stream throttling)
    const voltrexSeconds = Math.round((gb * 1024) / 60);
    const browserSeconds = Math.round((gb * 1024) / 7.2);

    function formatDuration(sec) {
      if (sec < 60) return `${sec}s`;
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      if (mins < 60) return `${mins}m ${remSec}s`;
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }

    if (voltrexTime) voltrexTime.textContent = formatDuration(voltrexSeconds);
    if (browserTime) browserTime.textContent = formatDuration(browserSeconds);

    // Visual bar proportion (relative to browser time)
    if (barVoltrex) barVoltrex.style.width = '100%';
    if (barBrowser) {
      // browser takes ~8.5x longer
      barBrowser.style.width = '100%';
    }
  }

  slider.addEventListener('input', (e) => {
    updateEstimates(Number(e.target.value));
  });

  updateEstimates(Number(slider.value));
}

/* ==========================================================================
   4. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close others
        faqItems.forEach((other) => other.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

/* ==========================================================================
   5. Simulated URL Probe Modal
   ========================================================================== */
function initProbeModal() {
  const openBtn = document.getElementById('btnOpenProbeModal');
  const modal = document.getElementById('probeModal');
  const closeBtn = document.getElementById('btnCloseProbeModal');
  const probeSubmitBtn = document.getElementById('btnExecuteProbe');
  const probeInput = document.getElementById('probeInputUrl');

  const probeStatus = document.getElementById('probeResStatus');
  const probeRanges = document.getElementById('probeResRanges');
  const probeSize = document.getElementById('probeResSize');
  const probeType = document.getElementById('probeResType');
  const probeFilename = document.getElementById('probeResFilename');

  if (!modal) return;

  function openModal() {
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (probeSubmitBtn && probeInput) {
    probeSubmitBtn.addEventListener('click', () => {
      const url = probeInput.value.trim();
      probeSubmitBtn.innerHTML = 'Probing...';

      setTimeout(() => {
        probeSubmitBtn.innerHTML = 'Probe Link';
        let fname = 'archive_bundle.zip';
        let fsize = '4,718,592,000 bytes (4.39 GB)';
        let ftype = 'application/zip';

        if (url.includes('.iso')) {
          fname = 'linux-os-desktop-x86_64.iso';
          fsize = '5,842,918,400 bytes (5.44 GB)';
          ftype = 'application/x-iso9660-image';
        } else if (url.includes('.mp4') || url.includes('.mkv')) {
          fname = 'cinematic_trailer_4k.mp4';
          fsize = '1,887,436,800 bytes (1.75 GB)';
          ftype = 'video/mp4';
        }

        if (probeStatus) probeStatus.textContent = '200 OK (Probe Verified)';
        if (probeRanges) probeRanges.textContent = 'bytes (Segmented Stream Supported ✅)';
        if (probeSize) probeSize.textContent = fsize;
        if (probeType) probeType.textContent = ftype;
        if (probeFilename) probeFilename.textContent = fname;

        showToast('✅ Host probed successfully! Server supports Range byte streaming.');
      }, 500);
    });
  }
}

/* ==========================================================================
   6. Copy to Clipboard with Toast Notification
   ========================================================================== */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('[data-copy]');
  copyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Copied to clipboard: "${textToCopy}"`, 'fa-regular fa-clipboard');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      });
    });
  });
}

function showToast(message, iconClass = 'fa-solid fa-circle-info') {
  let toast = document.querySelector('.toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="${iconClass}" style="color: var(--accent-primary);"></i> <span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* ==========================================================================
   7. Apple-Style Sticky Scroll Showcase
   ========================================================================== */
function initScrollTour() {
  const track = document.getElementById('scrollTourTrack');
  if (!track) return;

  const stepItems = document.querySelectorAll('.scroll-step-item');
  const slides = document.querySelectorAll('.tour-screen-slide');
  const windowTitle = document.getElementById('tourWindowTitle');
  const windowBadge = document.getElementById('tourWindowBadge');
  const progressText = document.getElementById('tourProgressText');
  const progressFill = document.getElementById('tourProgressFill');

  const titles = [
    'Dashboard & Telemetry',
    '32-Stream Chunk Matrix',
    'URL Probing & Setup',
    'Batch Queue & Sniffer',
    'Settings & Windows 10 Theme',
    'Universal Media Downloader'
  ];

  const totalSteps = stepItems.length;
  let activeIndex = -1;

  function updateActiveStep(newIndex) {
    if (newIndex === activeIndex || newIndex < 0 || newIndex >= totalSteps) return;
    activeIndex = newIndex;

    // Update Step items in left list
    stepItems.forEach((item, idx) => {
      item.classList.toggle('active', idx === activeIndex);
    });

    // Update stacked screenshot slides on right
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === activeIndex);
    });

    // Update header and progress indicators
    if (windowTitle) {
      windowTitle.innerHTML = `<i class="fa-solid fa-desktop" style="font-size: 0.72rem; color: var(--text-muted);"></i> <span>Voltrex Loader — ${titles[activeIndex]}</span>`;
    }
    if (windowBadge) {
      windowBadge.textContent = `0${activeIndex + 1} / 0${totalSteps}`;
    }
    if (progressText) {
      progressText.textContent = `Step ${activeIndex + 1} of ${totalSteps}`;
    }
    if (progressFill) {
      progressFill.style.width = `${((activeIndex + 1) / totalSteps) * 100}%`;
    }
  }

  // Smooth scroll listener
  let isTicking = false;
  function onScroll() {
    if (isTicking) return;
    isTicking = true;

    requestAnimationFrame(() => {
      const rect = track.getBoundingClientRect();
      const trackTop = rect.top;
      const trackHeight = rect.height;
      const windowHeight = window.innerHeight;

      if (window.innerWidth <= 900) {
        isTicking = false;
        return;
      }

      const scrollableDistance = trackHeight - windowHeight;
      if (scrollableDistance <= 0) {
        isTicking = false;
        return;
      }

      const scrolled = -trackTop;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      const stepIndex = Math.min(totalSteps - 1, Math.floor(progress * totalSteps));

      updateActiveStep(stepIndex);
      isTicking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Click on step item to smoothly navigate
  stepItems.forEach((item) => {
    item.addEventListener('click', () => {
      const stepIdx = parseInt(item.getAttribute('data-step'), 10);
      if (isNaN(stepIdx)) return;

      if (window.innerWidth > 900) {
        const rect = track.getBoundingClientRect();
        const currentScrollY = window.scrollY;
        const trackAbsoluteTop = currentScrollY + rect.top;
        const scrollableDistance = rect.height - window.innerHeight;
        const targetScroll = trackAbsoluteTop + (stepIdx / (totalSteps - 0.5)) * scrollableDistance;

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      } else {
        updateActiveStep(stepIdx);
      }
    });
  });

  // Initial trigger
  updateActiveStep(0);
  onScroll();
}
