(() => {
  const sections = Array.from(document.querySelectorAll('main section[id^="sec-"]'));
  const totalSections = sections.length;

  const liveReadoutEl = document.getElementById('live-section-readout');
  const notesSecBadgeEl = document.getElementById('notes-sec-badge');
  const notesContentEl = document.getElementById('notes-content');
  const navDrawer = document.getElementById('nav-drawer');
  const drawerOpenBtn = document.getElementById('drawer-open');
  const drawerCloseBtn = document.getElementById('drawer-close');
  const drawerScroller = navDrawer?.querySelector('.drawer-scroller');
  const drawerSheet = navDrawer?.querySelector('.drawer-sheet');
  const overviewGrid = document.getElementById('overview-grid');
  const refsDialog = document.getElementById('refs-dialog');
  const qrDialog = document.getElementById('qr-dialog');
  const notesPanel = document.getElementById('notes-panel');
  const themeToggle = document.getElementById('theme-toggle');
  const motionToggle = document.getElementById('motion-toggle');
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const chapterLinks = Array.from(document.querySelectorAll('.chapter-nav .chapter-link'));

  function isMotionAllowed() {
    return (
      window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
      document.documentElement.dataset.motion !== 'paused'
    );
  }

  function getRenderedScheme() {
    const current = colorSchemeMeta?.content.trim();
    if (current === 'dark' || current === 'light') return current;
    return systemDarkQuery.matches ? 'dark' : 'light';
  }

  function onDrawerOpened() {
    drawerOpenBtn?.setAttribute('aria-expanded', 'true');
  }

  function onDrawerClosed() {
    if (!navDrawer?.open) return;
    navDrawer.close();
    drawerOpenBtn?.setAttribute('aria-expanded', 'false');
  }

  async function openDrawer() {
    if (!navDrawer || !drawerScroller) return;
    navDrawer.showModal();

    // Without scroll-initial-target, jump to the closed spacer before animating open across two frames.
    if (!CSS.supports('scroll-initial-target', 'nearest')) {
      drawerScroller.scrollTo({ left: 0, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    const openLeft = drawerScroller.scrollWidth - drawerScroller.clientWidth;
    drawerScroller.scrollTo({
      left: openLeft,
      behavior: isMotionAllowed() ? 'auto' : 'instant'
    });
    if (!isMotionAllowed()) onDrawerOpened();
  }

  function closeDrawer(immediate = false) {
    if (!navDrawer?.open || !drawerScroller) return;
    if (immediate || !isMotionAllowed() || drawerScroller.scrollLeft <= 1) {
      drawerScroller.scrollTo({ left: 0, behavior: 'instant' });
      onDrawerClosed();
      return;
    }
    drawerScroller.scrollTo({ left: 0, behavior: 'auto' });
  }

  if (navDrawer && drawerScroller && drawerSheet) {
    const visibleThreshold = Math.min(0.02, 1 / Math.max(window.innerWidth, 320));
    const drawerObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry || !navDrawer.open) return;
        if (entry.intersectionRatio < visibleThreshold) onDrawerClosed();
        if (entry.intersectionRatio >= 0.98) onDrawerOpened();
      },
      { root: navDrawer, threshold: [visibleThreshold, 0.98, 1] }
    );
    drawerObserver.observe(drawerSheet);

    drawerOpenBtn?.addEventListener('click', openDrawer);
    drawerCloseBtn?.addEventListener('click', () => closeDrawer(false));

    // Full-viewport dialog intercepts taps before ::backdrop; slide out when clicking outside the sheet.
    navDrawer.addEventListener('click', (e) => {
      if (!drawerSheet.contains(e.target)) closeDrawer(false);
    });

    navDrawer.addEventListener('cancel', (e) => {
      if (e.cancelable) {
        e.preventDefault();
        closeDrawer(false);
      }
    });

    if (!CSS.supports('animation-timeline: scroll()')) {
      drawerScroller.addEventListener(
        'scroll',
        () => {
          const width = drawerSheet.offsetWidth || 1;
          const ratio = Math.min(1, Math.max(0, drawerScroller.scrollLeft / width));
          navDrawer.style.setProperty('--drawer-backdrop', String(ratio));
        },
        { passive: true }
      );
    }
  }

  sections.forEach((sec, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'overview-item';
    const num = sec.dataset.index || String(idx + 1).padStart(2, '0');
    const title = sec.dataset.title || `Bagian ${num}`;
    btn.innerHTML = `<span class="meta-kicker">Bagian ${num}</span><div style="font-weight:700;margin-top:0.22rem">${title}</div>`;
    btn.addEventListener('click', () => {
      closeDrawer(true);
      sec.scrollIntoView({ behavior: isMotionAllowed() ? 'smooth' : 'auto', block: 'start' });
      sec.focus({ preventScroll: true });
      setActiveSection(sec);
    });
    overviewGrid.appendChild(btn);
  });

  const overviewItems = Array.from(overviewGrid.querySelectorAll('.overview-item'));

  function chapterHrefForIndex(numOneBased) {
    if (numOneBased >= 19) return '#sec-19';
    if (numOneBased >= 12) return '#sec-12';
    if (numOneBased >= 9) return '#sec-09';
    if (numOneBased >= 5) return '#sec-05';
    if (numOneBased >= 4) return '#sec-04';
    return '#sec-01';
  }

  function setActiveSection(sec) {
    if (!sec) return;
    const idx = sections.indexOf(sec);
    const num = sec.dataset.index || String(idx + 1).padStart(2, '0');
    const title = sec.dataset.title || '';

    if (liveReadoutEl) {
      liveReadoutEl.textContent = `${num} / ${totalSections} • ${title}`;
    }
    if (notesSecBadgeEl) {
      notesSecBadgeEl.textContent = `Bagian ${num}`;
    }
    if (notesContentEl) {
      notesContentEl.textContent = sec.dataset.notes || 'Tidak ada catatan tambahan pada bagian ini.';
    }

    overviewItems.forEach((item, i) => {
      if (i === idx) {
        item.setAttribute('aria-current', 'true');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    const targetHref = chapterHrefForIndex(idx + 1);
    chapterLinks.forEach((link) => {
      const isMatch = link.getAttribute('href') === targetHref;
      link.classList.toggle('target-current', isMatch);
      link.setAttribute('aria-current', isMatch ? 'true' : 'false');
    });
  }

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length > 0) {
        setActiveSection(visible[0].target);
      }
    },
    { rootMargin: '-22% 0px -48% 0px', threshold: [0, 0.25, 0.5] }
  );

  sections.forEach((sec) => sectionObserver.observe(sec));
  setActiveSection(sections[0]);

  if (CSS.supports('scroll-target-group: auto')) {
    document.addEventListener('scrollend', () => {
      const nativeTarget = document.querySelector('.chapter-nav a:target-current');
      if (nativeTarget) {
        chapterLinks.forEach((link) => {
          link.setAttribute('aria-current', link === nativeTarget ? 'true' : 'false');
        });
      }
    });
  }

  if (!CSS.supports('container-type', 'scroll-state')) {
    const topbar = document.querySelector('.site-topbar');
    let lastScrollY = window.scrollY;
    window.addEventListener(
      'scroll',
      () => {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const y = Math.max(0, Math.min(window.scrollY, maxScroll));
        if (y === lastScrollY) return;
        topbar?.classList.toggle('is-hidden', y > lastScrollY && y > (topbar?.offsetHeight || 56));
        lastScrollY = y;
      },
      { passive: true }
    );
  }

  const bab1Stage = document.getElementById('bab1-mg-stage');
  const bab1Svg = document.getElementById('bab1-mg-svg');
  const bab1Kicker = document.getElementById('bab1-mg-kicker');
  const bab1Badge = document.getElementById('bab1-mg-badge');
  const bab1SerifLabel = document.getElementById('bab1-serif-label');
  const bab1Caption = document.getElementById('bab1-mg-caption');
  const bab1FeedbackPath = document.getElementById('mg-feedback-path');
  const bab1FeedbackHead = document.getElementById('mg-feedback-head');
  const bab1HubKicker = document.getElementById('mg-hub-kicker');
  const bab1HubTitle = document.getElementById('mg-hub-title');
  const bab1HubSub = document.getElementById('mg-hub-sub');
  const bab1LoopNodes = Array.from(document.querySelectorAll('#bab1-mg-stage .mg-loop-node'));

  let currentBab1Scene = 0;
  let currentBab1Stage = 0;
  let currentBab1Lens = 'both';
  let bab1PixelController = null;
  let deciderPixelController = null;
  let deciderModeTarget = 0;
  let deciderModeBlend = 0;

  const progressBar = document.getElementById('scroll-progress');
  if (progressBar && !CSS.supports('animation-timeline', 'scroll()')) {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.transform = `scaleX(${ratio})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
    const parallaxStages = Array.from(document.querySelectorAll('.parallax-stage'));
    const activeStages = new Set();

    const updateFallbackParallax = () => {
      if (!isMotionAllowed()) {
        parallaxStages.forEach((stage) => {
          stage.querySelectorAll('.parallax-layer').forEach((layer) => {
            layer.style.transform = '';
          });
        });
        return;
      }
      const vh = window.innerHeight || 1;
      activeStages.forEach((stage) => {
        const rect = stage.getBoundingClientRect();
        const progress = (vh - rect.top) / (vh + rect.height);
        const clamped = Math.min(1, Math.max(0, progress));
        stage.querySelectorAll('.parallax-layer--deep').forEach((el) => {
          el.style.transform = `translateY(${(-70 + clamped * 140).toFixed(1)}px)`;
        });
        stage.querySelectorAll('.parallax-layer--mid').forEach((el) => {
          el.style.transform = `translateY(${(28 - clamped * 56).toFixed(1)}px)`;
        });
      });
    };

    const pObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeStages.add(entry.target);
        else activeStages.delete(entry.target);
      });
      updateFallbackParallax();
    });

    parallaxStages.forEach((s) => pObserver.observe(s));
    window.addEventListener('scroll', updateFallbackParallax, { passive: true });
  }

  const glyphStageControllers = [];
  function syncAllGlyphStages(redrawNow = false) {
    for (const ctrl of glyphStageControllers) {
      ctrl.sync(redrawNow);
    }
  }

  if (motionToggle) {
    motionToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const nextPaused = html.dataset.motion !== 'paused';
      if (nextPaused) {
        html.dataset.motion = 'paused';
        document.getElementById('vidgen-player')?.pause();
        document.getElementById('mcp-demo-video')?.pause();
      } else {
        delete html.dataset.motion;
      }
      motionToggle.setAttribute('aria-pressed', String(nextPaused));
      syncAllGlyphStages(true);
    });
  }

  if (themeToggle && colorSchemeMeta) {
    themeToggle.addEventListener('click', () => {
      const nextScheme = getRenderedScheme() === 'dark' ? 'light' : 'dark';
      colorSchemeMeta.content = nextScheme;
      try {
        localStorage.setItem('color-scheme', nextScheme);
      } catch (_) {}
      renderLouverSimulation();
      syncAllGlyphStages(true);
    });

    systemDarkQuery.addEventListener('change', () => {
      renderLouverSimulation();
      syncAllGlyphStages(true);
    });

    window.addEventListener('storage', (e) => {
      if (
        e.key === 'color-scheme' &&
        (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'light dark')
      ) {
        colorSchemeMeta.content = e.newValue;
        renderLouverSimulation();
        syncAllGlyphStages(true);
      }
    });
  }

  document.getElementById('open-refs')?.addEventListener('click', () => {
    closeDrawer(true);
    refsDialog?.showModal();
  });

  const openQrModal = () => {
    closeDrawer(true);
    qrDialog?.showModal();
  };
  document.getElementById('open-qr')?.addEventListener('click', openQrModal);
  document.getElementById('hero-open-qr')?.addEventListener('click', openQrModal);

  const qrTargets = {
    web: {
      size: 37,
      url: 'https://archimades27.github.io/ai-arsitektur-udayana-2026/',
      caption: 'PINDAI KAMERA • WEB + PDF',
      svgTitle: 'Kode QR menuju Presentasi Web Interaktif dan Unduhan Handbook PDF',
      desc: 'Satu tautan membuka dek web interaktif 21 bagian secara utuh di ponsel atau laptop peserta, lengkap dengan unduhan buku pegangan PDF 12 halaman serta berkas parametrik Grasshopper (.gh), Rhino (.3dm), dan gambar kerja AutoCAD MCP (.dxf).',
      path: 'M2 2.5h7m1 0h4m2 0h1m2 0h2m3 0h1m3 0h7M2 3.5h1m5 0h1m1 0h1m2 0h1m4 0h1m1 0h3m1 0h1m3 0h1m5 0h1M2 4.5h1m1 0h3m1 0h1m1 0h1m1 0h1m4 0h2m1 0h1m1 0h2m2 0h1m1 0h1m1 0h3m1 0h1M2 5.5h1m1 0h3m1 0h1m3 0h2m3 0h1m1 0h5m1 0h2m1 0h1m1 0h3m1 0h1M2 6.5h1m1 0h3m1 0h1m1 0h2m1 0h5m1 0h1m1 0h2m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1M2 7.5h1m5 0h1m5 0h3m5 0h1m2 0h2m1 0h1m5 0h1M2 8.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M13 9.5h1m1 0h1m5 0h2m1 0h3M2 10.5h1m2 0h7m1 0h1m3 0h3m1 0h1m4 0h2m2 0h1m1 0h3M2 11.5h3m1 0h2m1 0h4m1 0h1m1 0h2m2 0h3m1 0h2m4 0h3M5 12.5h2m1 0h2m2 0h1m3 0h2m5 0h6m1 0h3m1 0h1M2 13.5h2m3 0h1m1 0h5m2 0h2m1 0h1m1 0h2m2 0h2m2 0h1m2 0h2M2 14.5h2m4 0h3m1 0h2m1 0h2m1 0h1m1 0h3m5 0h1m4 0h1M3 15.5h1m1 0h2m5 0h3m3 0h2m5 0h1m1 0h1m1 0h1m1 0h1M8 16.5h1m1 0h1m3 0h2m2 0h1m1 0h2m1 0h2m3 0h1m1 0h3M2 17.5h2m1 0h1m4 0h1m1 0h2m2 0h2m3 0h1m5 0h1m3 0h2m1 0h1M4 18.5h2m2 0h1m1 0h2m1 0h1m7 0h1m2 0h8M2 19.5h4m1 0h1m1 0h3m1 0h7m1 0h1m2 0h1m3 0h1m1 0h1m1 0h1m1 0h1M2 20.5h2m1 0h6m2 0h1m2 0h3m2 0h3m1 0h1m2 0h2m1 0h2m1 0h1M2 21.5h1m1 0h4m7 0h3m4 0h1m2 0h2m1 0h1m1 0h3m1 0h1M3 22.5h1m1 0h2m1 0h1m1 0h1m1 0h3m2 0h2m1 0h2m7 0h1m1 0h1m1 0h1M2 23.5h3m1 0h1m3 0h1m1 0h2m1 0h2m1 0h1m1 0h2m2 0h2m3 0h2m1 0h1M2 24.5h1m1 0h2m1 0h2m4 0h2m1 0h2m1 0h1m3 0h4m1 0h1m1 0h1m1 0h3M2 25.5h1m2 0h3m2 0h2m3 0h2m2 0h2m3 0h2m1 0h1m2 0h1m1 0h1M2 26.5h3m2 0h3m1 0h3m3 0h2m2 0h1m3 0h6m3 0h1M10 27.5h2m1 0h1m1 0h4m1 0h1m1 0h1m3 0h1m3 0h1m1 0h2M2 28.5h7m1 0h1m1 0h1m1 0h2m1 0h1m2 0h7m1 0h1m1 0h1m1 0h1M2 29.5h1m5 0h1m1 0h1m2 0h1m1 0h2m3 0h3m2 0h2m3 0h4M2 30.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h2m1 0h1m2 0h1m1 0h7m2 0h1M2 31.5h1m1 0h3m1 0h1m1 0h3m1 0h2m1 0h1m2 0h3m2 0h1m1 0h1m1 0h1m1 0h4M2 32.5h1m1 0h3m1 0h1m2 0h3m2 0h1m1 0h4m1 0h1m1 0h2m2 0h3m1 0h2M2 33.5h1m5 0h1m2 0h2m3 0h1m1 0h1m1 0h3m1 0h2m1 0h1m1 0h6M2 34.5h7m1 0h2m2 0h1m2 0h1m1 0h1m2 0h1m2 0h2m1 0h4'
    },
    pdf: {
      size: 49,
      url: 'https://archimades27.github.io/ai-arsitektur-udayana-2026/output/Handbook-AI-in-Architecture-Udayana-2026.pdf',
      caption: 'PINDAI KAMERA • UNDUH PDF',
      svgTitle: 'Kode QR menuju Unduhan Langsung Handbook PDF 12 Halaman',
      desc: 'Mengarahkan kamera ponsel langsung ke berkas Handbook-AI-in-Architecture-Udayana-2026.pdf (12 halaman A4 berisi ringkasan materi, kajian etika & hak cipta, serta 6 template instruksi).',
      path: 'M2 2.5h7m2 0h2m1 0h1m1 0h4m1 0h1m1 0h1m3 0h1m3 0h3m1 0h1m2 0h1m1 0h7M2 3.5h1m5 0h1m4 0h1m1 0h1m1 0h7m1 0h5m3 0h2m2 0h1m2 0h1m5 0h1M2 4.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h3m2 0h5m2 0h6m1 0h3m1 0h1m2 0h1m1 0h3m1 0h1M2 5.5h1m1 0h3m1 0h1m1 0h4m1 0h3m1 0h2m1 0h1m1 0h3m1 0h1m2 0h3m1 0h1m1 0h2m1 0h1m1 0h3m1 0h1M2 6.5h1m1 0h3m1 0h1m1 0h3m3 0h1m2 0h1m1 0h8m2 0h2m1 0h1m1 0h3m1 0h1m1 0h3m1 0h1M2 7.5h1m5 0h1m1 0h1m2 0h1m1 0h2m1 0h1m1 0h1m1 0h1m3 0h1m2 0h1m1 0h1m1 0h2m5 0h1m5 0h1M2 8.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M10 9.5h2m2 0h1m1 0h5m1 0h1m3 0h2m2 0h1m4 0h1m1 0h1M2 10.5h1m1 0h5m3 0h2m1 0h1m4 0h10m1 0h3m6 0h5M2 11.5h4m1 0h1m4 0h2m1 0h1m1 0h1m1 0h4m3 0h1m2 0h2m1 0h2m3 0h2m3 0h1m1 0h3M2 12.5h3m1 0h3m4 0h1m1 0h2m1 0h1m4 0h1m1 0h1m2 0h2m6 0h1m2 0h3m1 0h3M5 13.5h2m4 0h1m2 0h1m1 0h1m2 0h4m4 0h2m3 0h1m1 0h1m3 0h1m2 0h4M2 14.5h1m2 0h2m1 0h1m1 0h1m1 0h1m2 0h6m1 0h4m2 0h2m2 0h1m7 0h1m5 0h1M2 15.5h6m1 0h3m2 0h2m2 0h1m2 0h3m1 0h1m1 0h1m3 0h2m1 0h1m2 0h3m3 0h3M2 16.5h1m1 0h2m2 0h2m1 0h1m1 0h1m3 0h1m1 0h4m2 0h2m1 0h2m5 0h2m1 0h8M2 17.5h1m2 0h2m4 0h4m2 0h5m1 0h1m1 0h2m2 0h1m2 0h1m1 0h1m1 0h3m2 0h5M4 18.5h2m2 0h3m2 0h1m1 0h2m2 0h2m7 0h1m2 0h3m2 0h1m2 0h1m3 0h1m1 0h2M2 19.5h1m3 0h2m1 0h1m1 0h1m1 0h1m1 0h5m1 0h1m1 0h3m1 0h1m3 0h3m3 0h3m1 0h1m1 0h4M2 20.5h4m1 0h3m2 0h2m2 0h2m2 0h1m1 0h2m2 0h1m1 0h1m1 0h1m3 0h4m2 0h6M2 21.5h3m6 0h2m2 0h3m3 0h1m7 0h4m1 0h2m1 0h1m4 0h3M3 22.5h2m1 0h7m1 0h1m1 0h12m3 0h2m2 0h2m1 0h5M3 23.5h4m3 0h1m1 0h3m6 0h2m3 0h1m4 0h2m1 0h2m1 0h2m3 0h3m1 0h1M6 24.5h1m1 0h1m1 0h4m2 0h4m1 0h2m1 0h1m1 0h2m1 0h2m2 0h1m2 0h1m1 0h1m1 0h1m1 0h1m1 0h2M2 25.5h1m1 0h1m1 0h1m3 0h2m2 0h5m2 0h2m3 0h3m1 0h2m3 0h1m2 0h1m3 0h5M5 26.5h7m3 0h1m1 0h1m1 0h1m2 0h5m1 0h2m1 0h3m1 0h9m1 0h2M4 27.5h4m2 0h1m1 0h1m2 0h2m3 0h2m2 0h1m1 0h2m2 0h4m4 0h2m6 0h1M2 28.5h1m1 0h1m1 0h4m3 0h5m1 0h2m2 0h1m1 0h1m2 0h2m3 0h4m1 0h2m3 0h3M2 29.5h1m1 0h2m1 0h1m1 0h2m2 0h1m1 0h1m1 0h3m1 0h1m1 0h4m2 0h1m1 0h7m2 0h2m2 0h2M4 30.5h2m1 0h2m2 0h2m1 0h2m1 0h4m1 0h2m1 0h3m2 0h1m1 0h2m2 0h1m1 0h1m1 0h1m1 0h1m2 0h2M3 31.5h1m2 0h2m1 0h2m1 0h3m2 0h1m1 0h2m3 0h1m4 0h5m6 0h1m2 0h2m1 0h1M2 32.5h1m1 0h1m3 0h2m1 0h1m4 0h1m1 0h3m1 0h1m2 0h2m1 0h1m1 0h1m2 0h1m2 0h1m4 0h1m2 0h1M3 33.5h1m1 0h2m2 0h3m3 0h3m1 0h1m6 0h1m2 0h4m1 0h1m1 0h2m2 0h2m2 0h2M3 34.5h1m1 0h1m1 0h3m3 0h6m1 0h1m1 0h1m2 0h5m2 0h2m2 0h1m5 0h1m2 0h1M5 35.5h2m5 0h1m1 0h1m1 0h1m4 0h4m1 0h2m1 0h4m5 0h3m2 0h4M6 36.5h1m1 0h1m1 0h5m2 0h4m1 0h1m1 0h1m3 0h1m1 0h1m3 0h6m4 0h2M3 37.5h4m2 0h1m2 0h2m1 0h1m1 0h2m1 0h2m1 0h6m1 0h6m1 0h2m1 0h2m1 0h2M2 38.5h1m2 0h2m1 0h1m1 0h3m1 0h1m1 0h5m1 0h5m1 0h1m3 0h1m2 0h1m2 0h5m2 0h1M10 39.5h1m3 0h1m3 0h2m2 0h1m3 0h3m2 0h2m1 0h2m1 0h2m3 0h3m1 0h1M2 40.5h7m3 0h2m6 0h3m1 0h1m1 0h1m2 0h1m6 0h3m1 0h1m1 0h1m1 0h1M2 41.5h1m5 0h1m1 0h3m2 0h1m2 0h2m2 0h1m3 0h2m2 0h1m3 0h2m1 0h2m3 0h5M2 42.5h1m1 0h3m1 0h1m1 0h2m2 0h4m2 0h1m1 0h7m2 0h2m3 0h8m1 0h2M2 43.5h1m1 0h3m1 0h1m1 0h2m1 0h2m5 0h1m1 0h1m1 0h1m1 0h2m3 0h4m4 0h3m1 0h1m2 0h1M2 44.5h1m1 0h3m1 0h1m1 0h2m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m4 0h1m5 0h5m1 0h1m2 0h3M2 45.5h1m5 0h1m2 0h1m2 0h5m1 0h1m1 0h1m2 0h1m1 0h3m1 0h4m4 0h1m2 0h3M2 46.5h7m1 0h1m4 0h4m2 0h1m4 0h2m1 0h1m3 0h1m1 0h1m1 0h1m2 0h1m1 0h1m2 0h1'
    },
    repo: {
      size: 37,
      url: 'https://github.com/archimades27/ai-arsitektur-udayana-2026',
      caption: 'PINDAI KAMERA • GITHUB REPO',
      svgTitle: 'Kode QR menuju Repositori GitHub archimades27/ai-arsitektur-udayana-2026',
      desc: 'Membuka repositori GitHub sumber terbuka berisi kode HTML/CSS/JS presentasi ini, Handbook PDF 12 halaman, kajian etika & hak cipta, serta berkas gambar kerja AutoCAD MCP (.dxf).',
      path: 'M2 2.5h7m1 0h1m1 0h3m2 0h1m2 0h1m4 0h1m2 0h7M2 3.5h1m5 0h1m4 0h2m3 0h1m1 0h4m4 0h1m5 0h1M2 4.5h1m1 0h3m1 0h1m2 0h1m1 0h3m2 0h4m1 0h4m1 0h1m1 0h3m1 0h1M2 5.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h2m6 0h3m1 0h1m1 0h3m1 0h1M2 6.5h1m1 0h3m1 0h1m1 0h2m1 0h1m1 0h2m3 0h1m4 0h1m2 0h1m1 0h3m1 0h1M2 7.5h1m5 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h6m4 0h1m5 0h1M2 8.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M10 9.5h5m2 0h10M2 10.5h1m3 0h1m1 0h3m1 0h1m3 0h1m1 0h2m3 0h1m3 0h5m2 0h1M3 11.5h4m3 0h1m3 0h2m1 0h4m2 0h1m1 0h1m1 0h1m3 0h3M4 12.5h1m3 0h1m1 0h1m1 0h1m4 0h1m1 0h2m1 0h2m1 0h1m2 0h1m2 0h1m1 0h1M4 13.5h1m1 0h2m1 0h3m2 0h1m1 0h2m1 0h2m2 0h1m1 0h1m1 0h1m5 0h1M2 14.5h1m1 0h1m2 0h2m1 0h1m1 0h1m2 0h2m3 0h6m2 0h1m1 0h2m1 0h2M4 15.5h2m3 0h1m2 0h1m2 0h1m2 0h2m3 0h3m3 0h1M3 16.5h1m3 0h2m3 0h1m5 0h2m2 0h1m2 0h1m1 0h2m4 0h1M6 17.5h1m2 0h2m3 0h3m2 0h1m3 0h9M3 18.5h1m2 0h4m1 0h1m1 0h1m3 0h1m1 0h1m1 0h4m1 0h1m1 0h1m1 0h1m2 0h1M2 19.5h1m1 0h2m1 0h1m1 0h3m2 0h2m1 0h2m1 0h1m4 0h1m1 0h1m3 0h3M3 20.5h1m1 0h2m1 0h1m1 0h1m1 0h8m2 0h2m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1M2 21.5h1m1 0h1m5 0h1m1 0h1m1 0h1m2 0h1m1 0h1m1 0h3m1 0h2m2 0h1m3 0h2M5 22.5h6m5 0h1m3 0h1m1 0h3m3 0h4M2 23.5h2m2 0h1m3 0h1m2 0h4m2 0h1m5 0h1m1 0h1m1 0h1m1 0h1m1 0h1M4 24.5h2m1 0h4m3 0h1m2 0h3m2 0h1m1 0h4m1 0h1m3 0h1M5 25.5h2m2 0h1m1 0h2m3 0h5m2 0h1m3 0h4m3 0h1M2 26.5h2m3 0h4m1 0h1m3 0h1m2 0h1m2 0h9m3 0h1M10 27.5h1m6 0h2m1 0h1m1 0h1m2 0h2m3 0h1m1 0h2M2 28.5h7m1 0h2m1 0h2m1 0h2m1 0h1m2 0h2m2 0h1m1 0h1m1 0h2M2 29.5h1m5 0h1m3 0h7m3 0h3m1 0h1m3 0h1m2 0h2M2 30.5h1m1 0h3m1 0h1m1 0h1m4 0h2m6 0h2m1 0h6m2 0h1M2 31.5h1m1 0h3m1 0h1m5 0h1m2 0h4m2 0h1m1 0h2m1 0h3m1 0h1M2 32.5h1m1 0h3m1 0h1m2 0h4m1 0h5m1 0h1m2 0h2m1 0h3M2 33.5h1m5 0h1m3 0h2m2 0h1m1 0h3m2 0h1m1 0h3M2 34.5h7m1 0h1m2 0h1m2 0h2m1 0h1m1 0h6m1 0h1m2 0h1m2 0h1'
    }
  };

  const qrModeButtons = Array.from(document.querySelectorAll('.qr-mode-btn'));
  function applyQrTarget(modeKey) {
    const t = qrTargets[modeKey] || qrTargets.web;
    const vb = `0 0 ${t.size} ${t.size}`;
    const bgD = `M0 0h${t.size}v${t.size}H0z`;
    qrModeButtons.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.qrmode === modeKey));
    });
    for (const prefix of ['closing', 'modal']) {
      document.getElementById(`${prefix}-qr-svg`)?.setAttribute('viewBox', vb);
      document.getElementById(`${prefix}-qr-bg`)?.setAttribute('d', bgD);
      document.getElementById(`${prefix}-qr-path`)?.setAttribute('d', t.path);
      const titleEl = document.getElementById(`${prefix}-qr-svg-title`);
      if (titleEl) titleEl.textContent = t.svgTitle;
      const capEl = document.getElementById(`${prefix}-qr-caption`);
      if (capEl) capEl.textContent = t.caption;
      const descEl = document.getElementById(`${prefix}-qr-desc`);
      if (descEl) descEl.textContent = t.desc;
      const urlEl = document.getElementById(`${prefix}-qr-url`);
      if (urlEl) urlEl.textContent = t.url;
    }
  }
  qrModeButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyQrTarget(btn.dataset.qrmode || 'web'));
  });

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        if (e.target !== dialog) {
          pressedOutside = false;
          return;
        }
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && e.target === dialog && outside(e, dialog)) {
          dialog.close();
        }
        pressedOutside = false;
      });
    }
  }

  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    const toggleBtn = document.getElementById('toggle-notes');
    const closeBtn = document.getElementById('close-notes');
    notesPanel.hidden = true;
    toggleBtn?.addEventListener('click', () => {
      notesPanel.hidden = !notesPanel.hidden;
    });
    closeBtn?.addEventListener('click', () => {
      notesPanel.hidden = true;
    });
  }

  function bindToggleGroup(selector, onSelect) {
    const buttons = Array.from(document.querySelectorAll(selector));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        onSelect(btn);
      });
    });
  }

  function renderPointBox(title, bullets) {
    return `<h3>${title}</h3><ul class="clean-list">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`;
  }

  const stageData = [
    {
      title: 'Fase 01 • Data Collecting - Project Brief',
      short: 'DATA & BRIEF',
      serif: '01 • Data & Brief',
      badge: 'Fase 01 / 07',
      hubSub: 'Uji Balik <- Tapak',
      caption: 'Mengumpulkan kebutuhan pengguna, anggaran, dan aturan lahan sebagai jangkar awal.',
      arcOffset: 676,
      fbFrom: 1,
      fbTo: 0,
      fbDir: -1,
      bullets: [
        '<strong>Input:</strong> Kebutuhan pengguna, visi ruang, anggaran &amp; aturan tata ruang (GSB/KDB/KLB)',
        '<strong>Data Primer:</strong> Ukur batas lahan, topografi, jaringan utilitas &amp; dokumentasi eksisting',
        '<strong>Putaran Balik:</strong> Batasan regulasi dan lahan menyempurnakan target Project Brief'
      ]
    },
    {
      title: 'Fase 02 • Site Analysis',
      short: 'SITE ANALYSIS',
      serif: '02 • Site Analysis',
      badge: 'Fase 02 / 07',
      hubSub: 'Koreksi -> 01 Brief',
      caption: 'Membaca matahari, angin, kontur, dan konteks sekitar untuk mengarahkan orientasi awal.',
      arcOffset: 600,
      fbFrom: 1,
      fbTo: 0,
      fbDir: -1,
      bullets: [
        '<strong>Analisis Iklim:</strong> Lintasan matahari pagi/barat, angin musiman &amp; potensi tampias hujan',
        '<strong>Konteks Tapak:</strong> Kebisingan jalan, privasi, arah view &amp; karakter lingkungan sekitar',
        '<strong>Putaran Balik:</strong> Temuan iklim mikro mengarahkan orientasi bukaan sejak awal'
      ]
    },
    {
      title: 'Fase 03 • Space Programming',
      short: 'PROGRAMMING',
      serif: '03 • Space Programming',
      badge: 'Fase 03 / 07',
      hubSub: 'Koreksi -> 01 Brief',
      caption: 'Menata luasan, zonasi, dan kedekatan fungsi; konflik alur menata ulang target brief.',
      arcOffset: 500,
      fbFrom: 2,
      fbTo: 0,
      fbDir: -1,
      bullets: [
        '<strong>Susunan Ruang:</strong> Tabel luasan bersih-kotor, kapasitas &amp; matriks kedekatan fungsi',
        '<strong>Sirkulasi &amp; Zonasi:</strong> Pemisahan area publik, privat, tenang, serta jalur servis',
        '<strong>Putaran Balik:</strong> Konflik aktivitas menata ulang pengelompokan zona ruang'
      ]
    },
    {
      title: 'Fase 04 • Conceptual',
      short: 'CONCEPTUAL',
      serif: '04 • Conceptual',
      badge: 'Fase 04 / 07',
      hubSub: 'Uji -> 02 Tapak',
      caption: 'Mengunci gagasan utama arsitektur yang berpijak pada iklim tropis dan karakter tapak.',
      arcOffset: 400,
      fbFrom: 3,
      fbTo: 1,
      fbDir: -1,
      bullets: [
        '<strong>Gagasan Utama:</strong> Ide dasar arsitektur yang menjawab persoalan tapak dan pengguna',
        '<strong>Eksplorasi Awal:</strong> Studi gubahan massa kasar, karakter ruang &amp; strategi iklim tropis',
        '<strong>Keputusan Decider:</strong> Mengunci jiwa perancangan sebelum masuk penyusunan skema'
      ]
    },
    {
      title: 'Fase 05 • Schematic',
      short: 'SCHEMATIC',
      serif: '05 • Schematic',
      badge: 'Fase 05 / 07',
      hubSub: 'Koreksi -> 03 Ruang',
      caption: 'Menerjemahkan konsep ke denah, potongan, dan model 3D terukur untuk dievaluasi.',
      arcOffset: 300,
      fbFrom: 4,
      fbTo: 2,
      fbDir: -1,
      bullets: [
        '<strong>Rancangan Skematik:</strong> Denah, potongan, tampak awal &amp; perbandingan alternatif terukur',
        '<strong>Pemodelan 3D:</strong> Eksplorasi geometri terukur &amp; alternatif modul via SketchUp/Rhino (MCP)',
        '<strong>Putaran Balik:</strong> Evaluasi proporsi, bayangan, dan alur ruang bersama klien/dosen'
      ]
    },
    {
      title: 'Fase 06 • Development',
      short: 'DEVELOPMENT',
      serif: '06 • Development',
      badge: 'Fase 06 / 07',
      hubSub: 'Koreksi -> 05 Skema',
      caption: 'Menyinkronkan struktur, MEP, fasad, dan anggaran; kendala teknis mengoreksi skema.',
      arcOffset: 200,
      fbFrom: 5,
      fbTo: 4,
      fbDir: -1,
      bullets: [
        '<strong>Pengembangan Desain:</strong> Penajaman sistem struktur, jalur MEP, selubung fasad &amp; material',
        '<strong>Koordinasi Teknis:</strong> Sinkronisasi dimensi antar-disiplin di model BIM agar bebas benturan',
        '<strong>Putaran Balik:</strong> Kendala struktur atau anggaran mengoreksi detail skema sebelumnya'
      ]
    },
    {
      title: 'Fase 07 • Documentation & Presentation',
      short: 'DOC & PRES',
      serif: '07 • Doc & Pres',
      badge: 'Fase 07 / 07',
      hubSub: 'Tutup Siklus -> 01',
      caption: 'Mengunci gambar kerja DED presisi serta argumen presentasi video dan web interaktif.',
      arcOffset: 100,
      fbFrom: 6,
      fbTo: 7,
      fbDir: 1,
      bullets: [
        '<strong>Documentation:</strong> Gambar kerja DED presisi, detail konstruksi &amp; jadwal volume di Revit/CAD',
        '<strong>Presentation:</strong> Penyajian argumen via multi-image video generation &amp; vibe coding web',
        '<strong>Keputusan Decider:</strong> Mempertanggungjawabkan keterbangunan setiap garis gambar'
      ]
    }
  ];

  function computeFeedbackArc(fromStep, toStep, dir) {
    const cx = 230;
    const cy = 180;
    const r = 82;
    const stepRad = (2 * Math.PI) / 7;
    const pad = 0.12;
    const aStart = dir === 1 ? fromStep * stepRad + pad : fromStep * stepRad - pad;
    const aEnd = dir === 1 ? toStep * stepRad - pad : toStep * stepRad + pad;

    const sx = cx + r * Math.sin(aStart);
    const sy = cy - r * Math.cos(aStart);
    const ex = cx + r * Math.sin(aEnd);
    const ey = cy - r * Math.cos(aEnd);
    const largeArc = Math.abs(aEnd - aStart) > Math.PI ? 1 : 0;
    const sweep = dir === 1 ? 1 : 0;

    const tx = dir === 1 ? Math.cos(aEnd) : -Math.cos(aEnd);
    const ty = dir === 1 ? Math.sin(aEnd) : -Math.sin(aEnd);
    const bx = ex - tx * 8.2;
    const by = ey - ty * 8.2;
    const nx = -ty;
    const ny = tx;

    const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 ${largeArc} ${sweep} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    const pts = `${ex.toFixed(1)},${ey.toFixed(1)} ${(bx + nx * 4.2).toFixed(1)},${(by + ny * 4.2).toFixed(1)} ${(bx - nx * 4.2).toFixed(1)},${(by - ny * 4.2).toFixed(1)}`;
    return { d, pts };
  }

  function syncBab1StageCard(animatePulse = false) {
    if (!bab1Stage) return;
    const s = stageData[currentBab1Stage] || stageData[0];
    const angleDeg = (currentBab1Stage * 360) / 7;

    bab1Stage.dataset.activeScene = '0';
    bab1Stage.dataset.activeStage = String(currentBab1Stage);
    bab1Stage.style.setProperty('--mg-stage-angle', `${angleDeg.toFixed(2)}deg`);
    bab1Stage.style.setProperty('--mg-arc-offset', String(s.arcOffset));

    bab1LoopNodes.forEach((node, idx) => {
      if (idx === currentBab1Stage) {
        node.dataset.state = 'active';
      } else if (idx < currentBab1Stage) {
        node.dataset.state = 'done';
      } else {
        node.dataset.state = 'upcoming';
      }
    });

    const fb = computeFeedbackArc(s.fbFrom, s.fbTo, s.fbDir);
    if (bab1FeedbackPath) bab1FeedbackPath.setAttribute('d', fb.d);
    if (bab1FeedbackHead) bab1FeedbackHead.setAttribute('points', fb.pts);
    if (bab1HubKicker) bab1HubKicker.textContent = s.badge.toUpperCase();
    if (bab1HubTitle) bab1HubTitle.textContent = s.short;
    if (bab1HubSub) bab1HubSub.textContent = s.hubSub;

    if (bab1Kicker) bab1Kicker.textContent = 'MOTION DIAGRAM • RANTAI ITERATIF';
    if (bab1Badge) bab1Badge.textContent = s.badge;
    if (bab1SerifLabel) bab1SerifLabel.textContent = s.serif;
    if (bab1Caption) bab1Caption.textContent = s.caption;
    if (bab1Svg) {
      bab1Svg.setAttribute(
        'aria-label',
        `Diagram gerak rantai tujuh fase arsitektur: ${s.title} sedang aktif.`
      );
    }

    if (animatePulse && isMotionAllowed()) {
      bab1FeedbackPath?.animate(
        [{ opacity: 0.2 }, { opacity: 0.92 }],
        { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      bab1HubTitle?.animate(
        [{ opacity: 0.35 }, { opacity: 1 }],
        { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    }
    if (!isMotionAllowed()) {
      bab1PixelController?.renderOnce();
    }
  }

  syncBab1StageCard(false);

  const stageReadout = document.getElementById('stage-readout');
  bindToggleGroup('.stage-node', (btn) => {
    currentBab1Stage = Number(btn.dataset.stage) || 0;
    const s = stageData[currentBab1Stage] || stageData[0];
    stageReadout.innerHTML = renderPointBox(s.title, s.bullets);
    syncBab1StageCard(true);
  });

  const aiLayersData = [
    {
      pill: 'LAPISAN 01 • LLM & ANALITIK',
      io: 'Input: Teks & Angka -> Output: Tabel & Kode',
      t: '01 • Large Language Model (LLM) & Analitik Kode',
      bullets: [
        '<strong>Cara Kerja:</strong> Memprediksi struktur teks, logika tabel, dan sintaks kode pemrograman dari konteks yang diberikan arsitek',
        '<strong>Peran di Studio/Biro:</strong> Merangkum transkrip brief klien, menyusun draf Space Programming, hingga merakit kode Python/HTML',
        '<strong>Batas Kritis:</strong> Rawan halusinasi angka dan regulasi bila tidak diikat pada dokumen SNI atau Perda asli'
      ]
    },
    {
      pill: 'LAPISAN 02 • GENERATIF MULTIMODAL',
      io: 'Input: Sketsa / Keyframes -> Output: Citra & Video',
      t: '02 • AI Generatif Multimodal (Citra, Simulasi & Video)',
      bullets: [
        '<strong>Cara Kerja:</strong> Membangkitkan piksel suasana ruang, antarmuka simulasi web, atau interpolasi gerak kamera antar-keyframe',
        '<strong>Peran di Studio/Biro:</strong> Menguji alternatif atmosfer material, merakit web Solar Study, dan video presentasi multi-image',
        '<strong>Batas Kritis:</strong> Visual memikat tidak otomatis tahan bocor, sejuk, atau layak struktur tanpa kurasi potongan arsitek'
      ]
    },
    {
      pill: 'LAPISAN 03 • AI AGENT + TOOLS / MCP',
      io: 'Input: Target Kerja -> Output: Eksekusi Berkas & API 3D',
      t: '03 • Sistem AI Agent Terhubung (Hermes Agent & MCP)',
      bullets: [
        '<strong>Cara Kerja:</strong> Model penalaran yang diberi akses peralatan kerja (baca berkas, penjadwalan Cron, hingga protokol MCP ke software 3D)',
        '<strong>Peran di Studio/Biro:</strong> Hermes Agent mengelola literasi/meeting, sedangkan jembatan MCP membangun modul terukur di SketchUp/Rhino',
        '<strong>Batas Kritis:</strong> Setiap tindakan agen wajib diaudit di viewport 3D dan disetujui oleh Arsitek sebagai Decider'
      ]
    }
  ];
  const aiParadigmStage = document.getElementById('ai-paradigm-stage');
  const aiStagePill = document.getElementById('ai-stage-pill');
  const aiStageIo = document.getElementById('ai-stage-io');
  const aiLayerReadout = document.getElementById('ai-layer-readout');

  bindToggleGroup('.ai-layer-btn', (btn) => {
    const idx = Number(btn.dataset.ailayer) || 0;
    const item = aiLayersData[idx] || aiLayersData[0];
    if (aiParadigmStage) aiParadigmStage.dataset.activeLayer = String(idx);
    if (aiStagePill) aiStagePill.textContent = item.pill;
    if (aiStageIo) aiStageIo.textContent = item.io;
    if (aiLayerReadout) aiLayerReadout.innerHTML = renderPointBox(item.t, item.bullets);
  });

  const matrixItems = Array.from(document.querySelectorAll('#capability-matrix .matrix-item'));
  bindToggleGroup('.matrix-filter', (btn) => {
    const zone = btn.dataset.zone;
    matrixItems.forEach((item) => {
      const zones = (item.dataset.zone || '').split(/\s+/);
      const match = zone === 'all' || zones.includes(zone);
      item.classList.toggle('is-dimmed', !match);
    });
  });

  const solarFocusData = [
    {
      rect: [6, 6, 172, 530],
      dot: [178, 24],
      t: '01 • Impor Data Iklim EPW Denpasar & Geometri 3D',
      bullets: [
        'Memuat file cuaca terukur <strong>Denpasar-Ngurah.Rai.Intl.AP (.epw)</strong> bersama model massa 3D proyek',
        'Menguji putaran orientasi bangunan (<em>Yaw</em>, <em>Pitch</em>, skala &amp; opasitas) secara langsung di browser',
        '<strong>Peran Decider:</strong> Menentukan orientasi massa paling sejuk sebelum masuk ke tahap Space Programming'
      ]
    },
    {
      rect: [192, 26, 634, 506],
      dot: [622, 134],
      t: '02 • Kubah Lintasan Surya 4 Musim & Scrubber Waktu Harian',
      bullets: [
        'Memetakan 4 busur kritis tahunan (<em>Summer/Winter Solstice</em> &amp; <em>Equinox</em>) di atas kompas azimut N-E-S-W',
        'Menggeser jam harian (<strong>05:50 s.d. 18:18</strong>, posisi puncak 12:00) untuk membaca jatuhnya bayangan atap dan tritisan',
        '<strong>Peran Decider:</strong> Mengoreksi panjang tritisan dan bukaan barat berdasarkan simulasi bayangan nyata'
      ]
    },
    {
      rect: [838, 10, 178, 182],
      dot: [838, 22],
      t: '03 • Telemetri Radiasi, Suhu, Angin & Ekspor Laporan Teknis',
      bullets: [
        'Membaca parameter iklim terukur: <strong>Altitude 80,8°</strong>, <strong>Azimuth 174,6°</strong>, dan <strong>Radiasi 797 W/m²</strong>',
        'Memantau <strong>Suhu 29 °C</strong>, <strong>Kelembapan 74%</strong>, serta <strong>Kecepatan Angin 3,1 m/s</strong> sekaligus mengekspor laporan teknis',
        '<strong>Peran Decider:</strong> Menjadikan angka radiasi dan angin lokal sebagai dasar dimensi peneduh fasad pada tahap berikutnya'
      ]
    }
  ];

  const solarViewportShell = document.getElementById('solar-viewport-shell');
  const solarPreviewPane = document.getElementById('solar-preview-pane');
  const solarLivePane = document.getElementById('solar-live-pane');
  const solarLiveIframe = document.getElementById('solar-live-iframe');
  const solarLiveStatus = document.getElementById('solar-live-status');
  const solarFocusRect = document.getElementById('solar-focus-rect');
  const solarFocusDot = document.getElementById('solar-focus-dot');
  const solarReadout = document.getElementById('solar-readout');
  const solarViewButtons = Array.from(document.querySelectorAll('.solar-view-btn'));

  function setSolarViewMode(mode) {
    const isLive = mode === 'live';
    if (solarViewportShell) {
      solarViewportShell.dataset.solarMode = isLive ? 'live' : 'preview';
    }
    if (solarPreviewPane) solarPreviewPane.hidden = isLive;
    if (solarLivePane) solarLivePane.hidden = !isLive;
    solarViewButtons.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.solarView === mode));
    });
    if (isLive && solarLiveIframe && !solarLiveIframe.getAttribute('src')) {
      solarLiveIframe.setAttribute('src', 'http://100.76.27.91/solar/');
    }
  }

  if (solarLiveIframe && solarLiveStatus) {
    solarLiveIframe.addEventListener('load', () => {
      if (solarLiveIframe.getAttribute('src')) {
        solarLiveStatus.innerHTML = 'Terhubung ke <code>http://100.76.27.91/solar/</code> • Gunakan klik-tarik untuk <strong>Orbit</strong>, <strong>Zoom</strong>, dan <strong>Pan</strong> model 3D.';
      }
    });
  }

  bindToggleGroup('.solar-view-btn', (btn) => {
    setSolarViewMode(btn.dataset.solarView || 'preview');
  });

  bindToggleGroup('.solar-focus-btn[data-sfocus]', (btn) => {
    const idx = Number(btn.dataset.sfocus) || 0;
    const item = solarFocusData[idx] || solarFocusData[0];
    if (solarViewportShell?.dataset.solarMode === 'live') {
      setSolarViewMode('preview');
    }
    if (solarViewportShell) {
      solarViewportShell.dataset.solarFocus = String(idx);
    }
    if (solarFocusRect) {
      solarFocusRect.setAttribute('x', String(item.rect[0]));
      solarFocusRect.setAttribute('y', String(item.rect[1]));
      solarFocusRect.setAttribute('width', String(item.rect[2]));
      solarFocusRect.setAttribute('height', String(item.rect[3]));
    }
    if (solarFocusDot) {
      solarFocusDot.setAttribute('cx', String(item.dot[0]));
      solarFocusDot.setAttribute('cy', String(item.dot[1]));
    }
    if (solarReadout) {
      solarReadout.innerHTML = renderPointBox(item.t, item.bullets);
    }
  });

  const tablist = document.querySelector('.tablist-scroller');
  if (tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((t) => document.getElementById(t.id.replace('tab-', 'panel-')));
    const hasNativeFocusGroup = Object.hasOwn(HTMLElement.prototype, 'focusGroup');

    function selectTab(selectedTab, moveFocus = false) {
      tabs.forEach((tab, i) => {
        const isSelected = tab === selectedTab;
        tab.setAttribute('aria-selected', String(isSelected));
        tab.toggleAttribute('focusgroupstart', isSelected);
        if (!hasNativeFocusGroup) {
          tab.tabIndex = isSelected ? 0 : -1;
        }
        const panel = panels[i];
        if (panel) {
          if (isSelected) {
            panel.hidden = false;
            panel.tabIndex = 0;
          } else {
            panel.setAttribute('hidden', 'until-found');
            panel.removeAttribute('tabindex');
          }
        }
      });

      if (moveFocus) selectedTab.focus();
      try {
        selectedTab.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
      } catch {
        // Browsers without the container option would scroll the root document instead.
      }
    }

    if (!hasNativeFocusGroup) {
      tabs.forEach((t, idx) => {
        t.tabIndex = idx === 0 ? 0 : -1;
      });
      tablist.addEventListener('keydown', (e) => {
        const idx = tabs.indexOf(document.activeElement);
        if (idx === -1) return;
        let nextIdx = idx;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabs.length - 1;
        else return;

        e.preventDefault();
        selectTab(tabs[nextIdx], true);
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab, false));
      tab.addEventListener('focus', () => {
        if (tab.getAttribute('aria-selected') !== 'true') {
          selectTab(tab, false);
        }
      });
    });

    panels.forEach((panel, i) => {
      if (!panel) return;
      panel.addEventListener('beforematch', () => selectTab(tabs[i], false));
    });
  }

  const conceptData = [
    {
      plateX: 8,
      svg: `
        <line x1="16" y1="104" x2="404" y2="104" stroke="currentColor" stroke-width="2" opacity="0.7" />
        <polygon points="44,44 210,18 376,44 376,50 44,50" fill="var(--surface-strong)" stroke="currentColor" stroke-width="1.8" />
        <line x1="118" y1="50" x2="118" y2="104" stroke="currentColor" stroke-width="4" />
        <line x1="302" y1="50" x2="302" y2="104" stroke="currentColor" stroke-width="4" />
        <path d="M 28 74 C 110 66, 175 82, 255 72 S 355 68, 386 74" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="8 5" />
        <polygon points="384,68 398,74 384,80" fill="var(--accent)" />
        <text x="210" y="122" text-anchor="middle" font-family="var(--font-mono)" font-size="10.5" font-weight="700" fill="var(--accent)">VERANDA: ANGIN SILANG BEBAS</text>`,
      note: '<strong>Evaluasi Opsi A:</strong> Unggul pada aliran angin silang • Wajib hitung sudut tampias hujan &amp; bising luar.'
    },
    {
      plateX: 729,
      svg: `
        <line x1="16" y1="104" x2="404" y2="104" stroke="currentColor" stroke-width="2" opacity="0.7" />
        <polygon points="42,36 164,52 164,58 42,42" fill="var(--surface-strong)" stroke="currentColor" stroke-width="1.8" />
        <polygon points="378,36 256,52 256,58 378,42" fill="var(--surface-strong)" stroke="currentColor" stroke-width="1.8" />
        <line x1="68" y1="45" x2="68" y2="104" stroke="currentColor" stroke-width="3.5" />
        <line x1="150" y1="56" x2="150" y2="104" stroke="currentColor" stroke-width="3.5" />
        <line x1="270" y1="56" x2="270" y2="104" stroke="currentColor" stroke-width="3.5" />
        <line x1="352" y1="45" x2="352" y2="104" stroke="currentColor" stroke-width="3.5" />
        <circle cx="210" cy="78" r="13" fill="var(--surface-strong)" stroke="currentColor" stroke-width="1.5" />
        <line x1="210" y1="91" x2="210" y2="104" stroke="currentColor" stroke-width="2.5" />
        <path d="M 102 82 Q 186 82 196 24" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-dasharray="6 4" />
        <polygon points="191,27 197,14 202,28" fill="var(--accent)" />
        <path d="M 318 82 Q 234 82 224 24" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-dasharray="6 4" />
        <polygon points="218,28 223,14 229,27" fill="var(--accent)" />
        <text x="210" y="122" text-anchor="middle" font-family="var(--font-mono)" font-size="10.5" font-weight="700" fill="var(--accent)">COURTYARD: EFEK CEROBONG UDARA</text>`,
      note: '<strong>Evaluasi Opsi B:</strong> Tenang &amp; terang merata dari tengah • Wajib uji rasio lebar courtyard agar panas tidak terjebak.'
    },
    {
      plateX: 1450,
      svg: `
        <line x1="16" y1="104" x2="404" y2="104" stroke="currentColor" stroke-width="2" opacity="0.7" />
        <rect x="196" y="34" width="182" height="70" fill="var(--surface)" stroke="var(--border-subtle)" stroke-width="1" />
        <polygon points="148,28 388,28 388,35 148,35" fill="var(--surface-strong)" stroke="currentColor" stroke-width="1.8" />
        <line x1="378" y1="35" x2="378" y2="104" stroke="currentColor" stroke-width="4" />
        <line x1="196" y1="35" x2="196" y2="104" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 3" opacity="0.65" />
        <rect x="160" y="38" width="5" height="63" rx="2" fill="var(--accent)" />
        <rect x="172" y="38" width="5" height="63" rx="2" fill="var(--accent)" />
        <rect x="184" y="38" width="5" height="63" rx="2" fill="var(--accent)" />
        <line x1="28" y1="26" x2="160" y2="54" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="6 4" />
        <line x1="28" y1="48" x2="160" y2="76" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="6 4" />
        <line x1="28" y1="70" x2="160" y2="96" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="6 4" />
        <text x="288" y="73" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.86">RUANG TEDUH</text>
        <text x="210" y="122" text-anchor="middle" font-family="var(--font-mono)" font-size="10.5" font-weight="700" fill="var(--accent)">SIRIP VERTIKAL: TAHAN SILAU BARAT</text>`,
      note: '<strong>Evaluasi Opsi C:</strong> Efektif menahan matahari rendah barat/timur • Wajib atur jarak sirip terhadap view &amp; perawatan.'
    }
  ];
  const conceptReadout = document.getElementById('concept-readout');
  const conceptPlateShell = document.getElementById('concept-plate-shell');
  const conceptPlateRect = document.getElementById('concept-plate-rect');
  const conceptSectionSvg = document.getElementById('concept-section-svg');
  bindToggleGroup('.concept-choice-btn', (btn) => {
    const idx = Number(btn.dataset.concept) || 0;
    const item = conceptData[idx] || conceptData[0];
    if (conceptPlateShell) conceptPlateShell.dataset.conceptMode = String(idx);
    if (conceptPlateRect) conceptPlateRect.setAttribute('x', String(item.plateX));
    if (conceptSectionSvg) conceptSectionSvg.innerHTML = item.svg;
    if (conceptReadout) conceptReadout.innerHTML = item.note;
  });

  const vidgenData = [
    {
      time: 5.0,
      t: 'Source Image 01 • Paviliun & Tepi Kolam',
      bullets: [
        'Mengunci suasana tepi air, dek kursi santai, dan bukaan kaca lebar',
        'Menetapkan karakter material kayu hangat, batu alam, dan vegetasi tropis',
        'Menjadi jangkar pencahayaan alami sebelum diinterpolasi menjadi gerak kamera'
      ]
    },
    {
      time: 7.4,
      t: 'Source Image 02 • Massa Utama & Lanskap',
      bullets: [
        'Establishing shot halaman rumput menghadap massa dua lantai berbentuk L',
        'Mengunci proporsi tritisan lebar, pohon kamboja, dan batas kolam renang',
        'Menjaga kesinambungan skala ruang luar saat kamera bergerak menjauh'
      ]
    },
    {
      time: 0.4,
      t: 'Source Image 03 • Detail Kisi Kayu Putar',
      bullets: [
        'Menampilkan deretan kisi peneduh kayu lantai atas dan kolom berlapis kayu',
        'Mencegah AI mengubah modul fasad maupun bukaan pintu geser lantai dasar',
        'Menghasilkan transisi video yang tetap patuh pada geometri model 3D arsitek'
      ]
    }
  ];
  const vidgenReadout = document.getElementById('vidgen-readout');
  const vidgenPlayer = document.getElementById('vidgen-player');
  const vidgenPlayBtn = document.getElementById('vidgen-play-btn');

  bindToggleGroup('.vidgen-src-btn', (btn) => {
    const item = vidgenData[Number(btn.dataset.vsrc)] || vidgenData[0];
    if (vidgenReadout) {
      vidgenReadout.innerHTML = renderPointBox(item.t, item.bullets);
    }
    if (vidgenPlayer && vidgenPlayer.readyState >= 1) {
      try {
        vidgenPlayer.currentTime = item.time;
      } catch (_) {}
    }
  });

  if (vidgenPlayer && vidgenPlayBtn) {
    const syncPlayLabel = () => {
      const playing = !vidgenPlayer.paused && !vidgenPlayer.ended;
      vidgenPlayBtn.setAttribute('aria-pressed', String(playing));
      vidgenPlayBtn.textContent = playing ? 'Jeda Video' : 'Putar Video';
    };
    vidgenPlayBtn.addEventListener('click', () => {
      if (vidgenPlayer.paused || vidgenPlayer.ended) {
        vidgenPlayer.play().catch(() => {});
      } else {
        vidgenPlayer.pause();
      }
    });
    vidgenPlayer.addEventListener('play', syncPlayLabel);
    vidgenPlayer.addEventListener('pause', syncPlayLabel);
    vidgenPlayer.addEventListener('ended', syncPlayLabel);
  }

  // Defer offscreen video poster/metadata in browsers without native HTMLMediaElement.prototype.loading
  const supportsLazyMedia = Object.hasOwn(HTMLMediaElement.prototype, 'loading');
  if (!supportsLazyMedia) {
    const lazyVideos = document.querySelectorAll('video[loading="lazy"]');
    const mediaObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const media = entry.target;
          if (media.dataset.poster) {
            media.poster = media.dataset.poster;
            delete media.dataset.poster;
          }
          if (media.dataset.preload) {
            media.preload = media.dataset.preload;
            delete media.dataset.preload;
          }
          media.load();
          if (media.hasAttribute('autoplay') && isMotionAllowed()) {
            media.play().catch(() => {});
          }
          observer.unobserve(media);
        }
      },
      { rootMargin: '240px 0px' }
    );
    for (const media of lazyVideos) {
      if (media.hasAttribute('poster')) {
        media.dataset.poster = media.getAttribute('poster');
        media.removeAttribute('poster');
      }
      if (media.hasAttribute('preload') && media.getAttribute('preload') !== 'none') {
        media.dataset.preload = media.getAttribute('preload');
      }
      media.preload = 'none';
      mediaObserver.observe(media);
    }
  }

  const posReadout = document.getElementById('pos-readout');
  const deciderBeam = document.getElementById('decider-beam');
  const deciderStatus = document.getElementById('decider-svg-status');
  const deciderHwSwitch = document.getElementById('decider-hw-switch');
  const deciderHwCaption = document.getElementById('decider-hw-caption');
  const posModeButtons = Array.from(document.querySelectorAll('.pos-mode-btn'));

  function applyDeciderMode(mode) {
    const isDirector = mode !== 'passive';
    deciderModeTarget = isDirector ? 0 : 1;
    posModeButtons.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.pos === (isDirector ? 'director' : 'passive')));
    });
    if (deciderHwSwitch) {
      deciderHwSwitch.setAttribute('aria-checked', String(isDirector));
    }
    if (deciderHwCaption) {
      deciderHwCaption.textContent = isDirector
        ? 'DECIDER AKTIF • KENDALI ARSITEK'
        : 'MODE PASIF • RISIKO AI MENENTUKAN';
    }
    if (!isDirector) {
      if (posReadout) {
        posReadout.innerHTML = renderPointBox('Risiko Membiarkan AI Menentukan (Wajib Dihindari)', [
          '<strong>Kehilangan arah:</strong> Menyerahkan konsep tanpa membaca tapak &amp; pengguna',
          '<strong>Tertipu visual:</strong> Memilih gambar memikat yang gagal secara struktur &amp; iklim',
          '<strong>Gagal saat diuji:</strong> Tidak mampu menjawab alasan dimensi di depan dosen/klien'
        ]);
      }
      if (deciderBeam) deciderBeam.setAttribute('transform', 'rotate(14 240 136)');
      if (deciderStatus) deciderStatus.textContent = 'TIMPANG • MESIN MENGAMBIL ALIH TANPA TANGGUNG JAWAB';
    } else {
      if (posReadout) {
        posReadout.innerHTML = renderPointBox('Prinsip Kerja Arsitek sebagai Decider', [
          '<strong>Arsitek menetapkan kriteria:</strong> Fungsi, iklim, struktur, anggaran &amp; konteks lokal',
          '<strong>AI menyodorkan opsi:</strong> Memperluas alternatif, mengolah data &amp; menguji skenario',
          '<strong>Arsitek memutuskan:</strong> Memilih, mengedit, mengunci geometri &amp; bertanggung jawab penuh'
        ]);
      }
      if (deciderBeam) deciderBeam.setAttribute('transform', 'rotate(0 240 136)');
      if (deciderStatus) deciderStatus.textContent = 'KENDALI TERUKUR • KEPUTUSAN BERPIJAK KONTEKS';
    }
    if (!isMotionAllowed()) {
      deciderModeBlend = deciderModeTarget;
      deciderPixelController?.renderOnce();
    }
  }

  posModeButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyDeciderMode(btn.dataset.pos));
  });

  deciderHwSwitch?.addEventListener('click', () => {
    const currentlyDirector = deciderHwSwitch.getAttribute('aria-checked') === 'true';
    applyDeciderMode(currentlyDirector ? 'passive' : 'director');
  });

  const ethicsLensData = [
    {
      pill: 'DIMENSI 01 • BATAS ANALOGI',
      io: 'Diskusi Akademik • Bukan Pendapat Hukum Formal',
      t: '01 • Delegasi Tim Manusia vs Bantuan AI',
      bullets: [
        '<strong>Jangan samakan staf dengan AI:</strong> Staf arsitek adalah subjek kreatif mandiri yang memiliki martabat, hak moral, dan pengakuan kredit',
        '<strong>Batas kepengarangan:</strong> Sekadar memilih satu keluaran AI tidak otomatis menjadikan seluruh ekspresi visual sebagai ciptaan manusia',
        '<strong>Tanggung jawab mutlak:</strong> AI tidak memiliki lisensi arsitek; risiko keselamatan, struktur, dan regulasi tetap dipikul manusia'
      ]
    },
    {
      pill: 'DIMENSI 02 • HAK CIPTA & KONTRAK',
      io: 'Rujukan: UU No. 28/2014 & Kontribusi Manusia',
      t: '02 • Rujukan Hak Cipta & Bukti Kontribusi Manusia',
      bullets: [
        '<strong>UU Hak Cipta No. 28/2014:</strong> Periksa Pasal 33, 34, 36 &amp; 40 untuk relasi perancang-tim &amp; perjanjian kerja (Pasal 34 tidak otomatis identik pada AI)',
        '<strong>Perbandingan global (USCO 2025):</strong> Perlindungan bertumpu pada kontribusi kreatif manusia, bukan keluaran murni komputasional',
        '<strong>Dokumentasikan proses:</strong> Simpan sketsa awal, versi model 3D, catatan revisi, serta log arahan sebagai bukti kepengarangan'
      ]
    },
    {
      pill: 'DIMENSI 03 • SKENARIO & ETIKA',
      io: 'Uji Kepatuhan Kode Etik, Privasi & Keselamatan',
      t: '03 • Tiga Skenario Studio & Kepatuhan Etika Profesi',
      bullets: [
        '<strong>Skenario A (Kuat) vs B (Lemah):</strong> AI sebagai eksplorasi atas konsep arsitek jauh lebih sahih dibanding meminta AI menggagas seluruh konsep',
        '<strong>Skenario C (Gagal Profesi):</strong> Memakai keluaran AI tanpa memvalidasi struktur, evakuasi, aksesibilitas, dan aturan setempat',
        '<strong>Etika &amp; privasi:</strong> Lindungi kerahasiaan data klien, akui kredit tim manusia secara adil, dan terbuka sesuai kaidah akademik/IAI'
      ]
    }
  ];
  const ethicsStage = document.getElementById('ethics-stage');
  const ethicsStagePill = document.getElementById('ethics-stage-pill');
  const ethicsStageIo = document.getElementById('ethics-stage-io');
  const ethicsReadout = document.getElementById('ethics-readout');

  bindToggleGroup('.ethics-lens-btn', (btn) => {
    const idx = Number(btn.dataset.elens) || 0;
    const item = ethicsLensData[idx] || ethicsLensData[0];
    if (ethicsStage) ethicsStage.dataset.activeLayer = String(idx);
    if (ethicsStagePill) ethicsStagePill.textContent = item.pill;
    if (ethicsStageIo) ethicsStageIo.textContent = item.io;
    if (ethicsReadout) ethicsReadout.innerHTML = renderPointBox(item.t, item.bullets);
  });

  const agentSteps = [
    {
      rect: [312, 198, 474, 176],
      cmd: 'channel:telegram -> /skills literasi "SNI pencahayaan alami & selubung fasad tropis"',
      tool: 'read_file • browser',
      tgTool: 'skills:literasi • read_file • browser',
      tgUser:
        'Tolong ringkaskan poin utama SNI pencahayaan alami & rasio overhang bangunan kampus tropis lembap untuk bahan evaluasi studio sore ini.',
      tgReply:
        '<p><strong>Ringkasan Studi Tropis (3 Poin Kunci):</strong></p><ul><li><strong>SNI 03-2396:</strong> Target faktor pencahayaan alami siang hari ruang studio minimal 2,5% s.d. 3,5% merata tanpa silau langsung.</li><li><strong>Rasio Tritisan Barat/Timur:</strong> Kombinasikan <em>overhang</em> horizontal 1,5 s.d. 1,8 m dengan sirip vertikal putar 30° untuk memotong radiasi sudut rendah.</li><li><strong>Sumber Primer Siap Dicek:</strong> Dokumen SNI &amp; studi <em>SDE4 NUS</em> telah ditautkan ke folder bacaan studio.</li></ul>',
      t: '01 • Menambah Literasi Teknis & Desain',
      bullets: [
        'Cukup kirim topik dari ponsel lewat <strong>Telegram Bot Gateway</strong>; modul <strong>Skills &amp; File</strong> membedah standar SNI &amp; jurnal',
        'Menyusun ringkasan bacaan harian terstruktur untuk memperkaya wawasan studio',
        'Menandai sumber primer agar bisa dipelajari lebih dalam oleh arsitek'
      ]
    },
    {
      rect: [4, 126, 128, 294],
      cmd: 'channel:telegram -> /cron add "Review Fasad Paviliun Fiktif Jumat 14:00 WITA" --kanban',
      tool: 'cronjob • kanban',
      tgTool: 'cronjob • kanban_board',
      tgUser:
        'Jadwalkan review internal 3 opsi fasad barat Proyek Kampus Fiktif (Studi Demo) besok Jumat pukul 14.00 WITA, lalu kirim pengingat H-2 jam.',
      tgReply:
        '<p><strong>Jadwal &amp; Pengingat Studio Aktif:</strong></p><ul><li><strong>Agenda:</strong> Review 3 Opsi Fasad Barat (Paviliun Kampus Fiktif) • Jumat, 14.00 WITA.</li><li><strong>Cron Pengingat:</strong> Terpasang otomatis pukul 12.00 WITA di kanal Telegram tim studio.</li><li><strong>Kanban Diperbarui:</strong> Kartu <code>#STUDIO-04 Uji Bayangan &amp; Sirip</code> dipindah ke kolom <em>Siap Review</em>.</li></ul>',
      t: '02 • Mengatur Jadwal Studio & Proyek',
      bullets: [
        'Menyusun lini masa tahapan dari survei hingga pengumpulan DED lewat <strong>Cron &amp; Kanban</strong> langsung dari chat Telegram',
        'Mengatur pengingat tenggat asistensi maupun rapat koordinasi konsultan secara otomatis',
        'Menjaga alokasi waktu eksplorasi vs produksi gambar kerja'
      ]
    },
    {
      rect: [4, 42, 128, 206],
      cmd: 'channel:telegram -> /sessions summarize demo_5a12 --output notulen-studio-fiktif.md',
      tool: 'sessions • write_file',
      tgTool: 'sessions • write_file',
      tgUser:
        'Ini catatan asistensi fiktif Paviliun Studio: (1) geser pintu ruang maket 40 cm ke utara, (2) kunci tritisan 1,8 m, (3) cek profil kolom baja ke struktur.',
      tgReply:
        '<p><strong>Notulen Revisi Terstruktur (Tersimpan di <code>notulen-studio-fiktif.md</code>):</strong></p><ul><li><strong>Keputusan Dikunci:</strong> Lebar tritisan keliling dikunci pada 1.800 mm.</li><li><strong>Tindak Lanjut Gambar:</strong> Geser bukaan pintu <code>D2</code> Ruang Maket sejauh 400 mm pada denah AutoCAD &amp; model 3D.</li><li><strong>Konfirmasi Lintas Disiplin:</strong> Kirim dimensi kolom baja <code>COL_300</code> ke konsultan struktur sebelum Senin.</li></ul>',
      t: '03 • Merangkum Meeting & Asistensi',
      bullets: [
        'Mengubah catatan singkat di <strong>Telegram Channel / Sessions</strong> menjadi daftar keputusan dan revisi terstruktur',
        'Memisahkan keputusan yang sudah dikunci, daftar revisi gambar, dan pertanyaan terbuka untuk konsultan',
        'Selalu gunakan bot privat/lokal sesuai kebijakan kerahasiaan data klien kantor'
      ]
    },
    {
      rect: [160, 184, 642, 230],
      cmd: 'channel:telegram -> /delegate preseden "SDE4 NUS tropical facade & ventilasi hibrida"',
      tool: 'browser • search_files',
      tgTool: 'browser • delegate_task',
      tgUser:
        'Carikan 3 referensi bangunan pendidikan tropis berventilasi silang di Asia Tenggara beserta tautan sumber publikasi resminya.',
      tgReply:
        '<p><strong>3 Preseden Terverifikasi untuk Kurasi Arsitek:</strong></p><ul><li><strong>SDE4, NUS Singapura</strong> (Serie + Multiply + Transsolar): Overhang lebar &amp; pendinginan hibrida net-zero (tautan resmi NUS terlampir).</li><li><strong>The Learning Hub, NTU:</strong> Atrium berpori dengan aliran udara konvektif alami.</li><li><strong>Catatan Kejujuran Data:</strong> Nilai U-value kaca spesifik tiap lantai tertulis <em>data belum tersedia di rilis publik</em> (tidak dikarang).</li></ul>',
      t: '04 • Mengumpulkan Referensi Terarah',
      bullets: [
        'Menelusuri preseden sejenis dengan tautan publikasi asli melalui <strong>Browser &amp; Delegation</strong> saat sedang di lapangan',
        'Menyusun tabel komparasi spesifikasi material &amp; sistem fasad sebagai bahan pertimbangan Decider',
        'Menandai jujur data yang belum tersedia tanpa mengarang angka'
      ]
    }
  ];
  const agentStepReadout = document.getElementById('agent-step-readout');
  const hermesFocusRect = document.getElementById('hermes-focus-rect');
  const hermesFocusCorner = document.getElementById('hermes-focus-corner');
  const hermesCliCmd = document.getElementById('hermes-cli-cmd');
  const hermesCliTool = document.getElementById('hermes-cli-tool');
  const hermesShell = document.getElementById('hermes-viewport-shell');
  const hermesTelegramPanel = document.getElementById('hermes-telegram-panel');
  const hermesModePill = document.getElementById('hermes-mode-pill');
  const tgUserMsg = document.getElementById('tg-user-msg');
  const tgBotTool = document.getElementById('tg-bot-tool');
  const tgBotReply = document.getElementById('tg-bot-reply');

  bindToggleGroup('.hermes-view-btn', (btn) => {
    const view = btn.dataset.hview || 'telegram';
    const isTg = view === 'telegram';
    if (hermesTelegramPanel) hermesTelegramPanel.hidden = !isTg;
    if (hermesShell) hermesShell.hidden = isTg;
    if (hermesModePill) {
      hermesModePill.textContent = isTg
        ? 'TELEGRAM BOT GATEWAY • SIMULASI FIKTIF'
        : 'HERMES AGENT v0.16.0 • DASHBOARD WEB';
    }
  });

  bindToggleGroup('.step-btn', (btn) => {
    const activeIdx = Number(btn.dataset.astep) || 0;
    const item = agentSteps[activeIdx] || agentSteps[0];
    agentStepReadout.innerHTML = renderPointBox(item.t, item.bullets);
    if (hermesShell) hermesShell.dataset.hermesStep = String(activeIdx);
    if (hermesFocusRect) {
      hermesFocusRect.setAttribute('x', String(item.rect[0]));
      hermesFocusRect.setAttribute('y', String(item.rect[1]));
      hermesFocusRect.setAttribute('width', String(item.rect[2]));
      hermesFocusRect.setAttribute('height', String(item.rect[3]));
    }
    if (hermesFocusCorner) {
      hermesFocusCorner.setAttribute('x', String(item.rect[0] - 6));
      hermesFocusCorner.setAttribute('y', String(item.rect[1] - 6));
    }
    if (tgUserMsg) tgUserMsg.textContent = item.tgUser;
    if (tgBotTool) tgBotTool.textContent = item.tgTool;
    if (tgBotReply) tgBotReply.innerHTML = item.tgReply;
    if (hermesCliCmd) hermesCliCmd.textContent = item.cmd;
    if (hermesCliTool) hermesCliTool.textContent = item.tool;
  });

  const mcpCatalog = {
    sketchup: {
      stagePill: 'SKETCHUP 2027.0 • LIVE MCP CAPTURE (:8080)',
      subTag: '',
      steps: [
        {
          btnTitle: '01. Jembatan Protokol MCP (01.2s)',
          btnSub: 'Plinth tapak & konstruksi 8 kolom grid 6,0 m',
          seekSec: 1.2,
          rpcServer: 'JSON-RPC • sketchup_mcp :8080',
          rpcCall: 'mcp_sketchup.create_box({ layer: "S-GRID-COL", cols: 8, grid_mm: 6000 })',
          t: '01 • Jembatan Protokol MCP ke SketchUp 2027',
          bullets: [
            'Agen terhubung langsung ke server TCP lokal SketchUp (<code>127.0.0.1:8080</code>)',
            'Membangun pelat lantai, garis as konstruksi &amp; 8 kolom baja grid 6,0 m secara presisi',
            'Satuan milimeter dan penamaan layer terkunci sejak perintah pertama'
          ]
        },
        {
          btnTitle: '02. Modul & Kisi Parametrik (03.6s)',
          btnSub: '11 sirip West_Fin_Module @ 600 mm diputar 30°',
          seekSec: 3.6,
          rpcServer: 'JSON-RPC • sketchup_mcp :8080',
          rpcCall: 'mcp_sketchup.place_component({ def: "West_Fin_Module", count: 11, spacing_mm: 600, rot_deg: 30 })',
          t: '02 • Otomasi Modul & Kisi Parametrik di SketchUp',
          bullets: [
            'Membangkitkan 11 sirip <code>West_Fin_Module</code> berjarak 600 mm di fasad barat',
            'Memutar seluruh instansi komponen dari 0° ke 30° secara serempak dan terukur',
            'Bebas klik manual berulang tanpa mengorbankan ketepatan milimeter'
          ]
        },
        {
          btnTitle: '03. Integrasi Rangka & Atap ke BIM (05.6s)',
          btnSub: '7 rafter & kanopi tritisan 1,8 m siap sinkronisasi Revit',
          seekSec: 5.6,
          rpcServer: 'JSON-RPC • sketchup -> revit_bim',
          rpcCall: 'mcp_sketchup.push_pull({ layer: "A-ROOF-TROPICAL", rafters: 7, overhang_mm: 1800 })',
          t: '03 • Integrasi Rangka & Atap Tropis ke BIM',
          bullets: [
            '<strong>Gunakan SketchUp MCP:</strong> Eksplorasi cepat rangka 7 rafter, kanopi tritisan 1,8 m &amp; modul massa',
            '<strong>Gunakan Rhino/AutoCAD MCP:</strong> Rantai aturan parametrik Grasshopper &amp; denah terukur <code>.dxf</code>',
            '<strong>Gunakan Revit BIM:</strong> Penguncian akhir struktur, MEP, volume &amp; paket DED'
          ]
        },
        {
          btnTitle: '04. Audit Viewport & Bayangan (07.1s)',
          btnSub: 'Uji bayangan Denpasar 13:45 s.d. 16:45 WITA',
          seekSec: 7.1,
          rpcServer: 'JSON-RPC • viewport_shadow_audit',
          rpcCall: 'mcp_sketchup.get_model_info({ lat: -8.65, lon: 115.22, shadow_wita: "13:45..16:45" })',
          t: '04 • Audit Viewport & Simulasi Bayangan Denpasar',
          bullets: [
            'Menguji jatuhnya bayangan sore Denpasar (<code>-8.65°, 115.22°</code>) pukul 13:45 s.d. 16:45 WITA',
            'Memastikan satuan milimeter, titik origin, dan struktur grup/layer bersih',
            'Memvalidasi sambungan sirip, kolom, dan tritisan sebelum masuk tahap pengembangan'
          ]
        }
      ]
    },
    rhino: {
      stagePill: 'RHINO 8 & GRASSHOPPER • LIVE RHINOMCP (:1999)',
      subTag: 'Paviliun-Studio-Tropis-MCP.gh • .3dm',
      views: {
        split: {
          src: 'assets/rhino-gh-split.png',
          w: 1600,
          h: 760,
          alt: 'Tangkapan layar asli kanvas Grasshopper dan viewport Perspective Rhino 8 hasil eksekusi rhinomcp di MacBook ini: empat grup komponen Number Slider, Series Y, Profil 320x60mm, Rotate 30 deg, Extrude 3,20 m, dan Solid 11 Brep menampilkan pratinjau langsung 11 sirip merah transparan pada fasad barat Paviliun Studio Tropis.',
          rects: [
            [[23, 190, 458, 164], null],
            [[23, 382, 280, 182], null],
            [[558, 184, 372, 160], null],
            [[448, 382, 468, 158], [954, 180, 446, 480]]
          ]
        },
        canvas: {
          src: 'assets/rhino-gh-canvas.png',
          w: 1800,
          h: 771,
          alt: 'Ekspor resolusi tinggi asli kanvas Grasshopper (Paviliun-Studio-Tropis-MCP.gh) dari Rhino 8: Grup 01 Parameter Slider dan Series Y (0,60 m x 11), Grup 02 Profil Penampang Sirip (320 x 60 mm), Grup 03 Rantai Transformasi Rotate 30 deg, dan Grup 04 Extrude 3,2 m serta Cap Solid (11 Brep).',
          rects: [
            [[26, 20, 892, 312], null],
            [[26, 392, 542, 352], null],
            [[1076, 12, 720, 304], null],
            [[862, 392, 910, 306], null]
          ]
        },
        viewport: {
          src: 'assets/rhino-gh-viewport.png',
          w: 1400,
          h: 875,
          alt: 'Tangkapan asli viewport Perspective Rhino 8 (Paviliun-Studio-Tropis-MCP.3dm): pelat lantai, 8 kolom baja grid 6 meter, kaca fasad barat biru muda, atap lengkung NURBS Loft tritisan 1,80 m, serta pratinjau merah transparan 11 Brep sirip vertikal Grasshopper yang diputar 30 derajat.',
          rects: [
            [[110, 560, 540, 265], null],
            [[128, 295, 505, 480], null],
            [[128, 295, 505, 480], null],
            [[48, 200, 1300, 650], null]
          ]
        }
      },
      steps: [
        {
          btnTitle: '01. Parameter Slider & Series Y',
          btnSub: 'X = -0,70 m • Modul 0,60 m • Jumlah 11 -> Bidang Dasar',
          ghGroup: 0,
          rpcServer: 'JSON-RPC • rhinomcp :1999',
          rpcCall: 'mcp_rhino.gh_build_graph({ sliders: { x_fasad_m: -0.70, modul_m: 0.60, jumlah: 11 }, nodes: ["Series Y", "Titik Fasad", "Bidang Dasar"] })',
          t: '01 • Merakit Parameter Awal Asli di Kanvas Grasshopper',
          bullets: [
            'Tangkapan di samping adalah kanvas <strong>Grasshopper asli</strong> di Rhino 8 MacBook ini (berkas <code>Paviliun-Studio-Tropis-MCP.gh</code>) hasil panggilan <code>gh_build_graph</code>',
            'Tiga <strong>Number Slider</strong> (<code>X Fasad Barat = -0.70</code>, <code>Modul Sirip = 0.60</code>, <code>Jumlah Sirip = 11</code>) mengalir ke <code>Series Y</code>, <code>Titik Fasad</code>, dan <code>Bidang Dasar</code>',
            'Seluruh relasi dataflow tetap hidup sehingga arsitek dapat menggeser slider kapan saja'
          ]
        },
        {
          btnTitle: '02. Profil Penampang 320 x 60 mm',
          btnSub: 'Lebar 0,32 m • Tebal 0,06 m • Radius 0,00 -> Rectangle',
          ghGroup: 1,
          rpcServer: 'JSON-RPC • rhinomcp :1999',
          rpcCall: 'mcp_rhino.gh_build_graph({ component: "Rectangle", nickname: "Profil 320x60mm", x_m: 0.32, y_m: 0.06, radius_m: 0.00 })',
          t: '02 • Membentuk Kurva Penampang Sirip pada 11 Bidang Kerja',
          bullets: [
            'Keluaran 11 bidang kerja dari <code>Bidang Dasar</code> langsung diumpankan ke komponen <strong>Rectangle</strong> (<code>Profil 320x60mm</code>)',
            'Dimensi penampang dikendalikan slider <code>Lebar Sirip = 0.32 m</code>, <code>Tebal Sirip = 0.06 m</code>, dan <code>Radius Sudut = 0.00 m</code>',
            'Jika material sirip diganti dari kayu komposit ke aluminium berongga, ukuran penampang cukup digeser dari satu grup ini'
          ]
        },
        {
          btnTitle: '03. Rantai Transformasi Rotate 30°',
          btnSub: 'Sudut Putar 30,0° -> Radians -> Rotate 30 deg',
          ghGroup: 2,
          rpcServer: 'JSON-RPC • rhinomcp :1999',
          rpcCall: 'mcp_rhino.gh_mutate_graph({ slider: "Sudut Putar (deg)", value: 30.0, chain: ["Radians", "Rotate 30 deg"] })',
          t: '03 • Memutar 11 Penampang Sirip Sebesar 30,0° Secara Presisi',
          bullets: [
            'Slider <code>Sudut Putar (deg) = 30.0</code> dikonversi melalui node <strong>Radians</strong> sebelum masuk ke input sudut (<code>A</code>) pada <strong>Rotate 30 deg</strong>',
            'Poros putar setiap sirip dikunci pada masing-masing <code>Bidang Dasar</code> agar tidak meleset dari garis fasad barat',
            'Arsitek bebas menguji respons bayangan dari <code>0°</code> hingga <code>60°</code> secara seketika di viewport Rhino 8'
          ]
        },
        {
          btnTitle: '04. Extrude 3,20 m & Pratinjau Rhino 8',
          btnSub: 'Tinggi 3,20 m -> Extrude Sirip -> Solid 11 Brep + Loft Atap',
          ghGroup: 3,
          rpcServer: 'JSON-RPC • rhinomcp :1999',
          rpcCall: 'mcp_rhino.gh_run_solution() -> Extrude(3.20) -> CapHoles("Solid 11 Brep") + ViewCapture("Paviliun-Studio-Tropis-MCP.3dm")',
          t: '04 • Ekstrusi Solid 11 Brep & Pratinjau Langsung di Viewport Rhino 8',
          bullets: [
            'Slider <code>Tinggi Sirip = 3.20 m</code> mendorong vektor <code>Tinggi Z</code> ke <strong>Extrude Sirip</strong> lalu ditutup rapat oleh <strong>Solid 11 Brep</strong> (<em>Cap Holes</em>)',
            'Perhatikan warna merah transparan khas pratinjau <strong>Grasshopper</strong> pada viewport <em>Perspective</em> Rhino 8 di sisi kanan bersama atap lengkung NURBS <em>Loft</em>',
            'Setelah disetujui arsitek (<em>Decider</em>), 11 Brep siap di-<em>Bake</em> ke berkas <code>Paviliun-Studio-Tropis-MCP.3dm</code> untuk lanjut ke Revit BIM'
          ]
        }
      ]
    },
    autocad: {
      stagePill: 'AUTOCAD 2026 MCP • OUTPUT DENAH NYATA (.DXF)',
      subTag: 'Paviliun-Studio-Tropis-MCP.dxf • 103,55 m²',
      steps: [
        {
          btnTitle: '01. Grid As & 8 Kolom Baja',
          btnSub: 'arch_grid 1-4 / A-B @ 6000 mm & blok COL_300',
          cadRect: [64, 18, 1084, 506],
          rpcServer: 'JSON-RPC • autocad-mcp-pro',
          rpcCall: 'mcp_autocad.arch_grid({ x_axes: [0, 6000, 12000, 18000], y_axes: [0, 6000], scale: 65 })',
          t: '01 • Otomasi Grid As Konstruksi & Kolom di AutoCAD',
          bullets: [
            'Gambar di samping adalah keluaran nyata server <code>autocad-mcp-pro</code> di MacBook ini (berkas <code>Paviliun-Studio-Tropis-MCP.dxf</code>)',
            '<code>arch_grid</code> menggambar garis as sumbu <code>1-2-3-4</code> dan <code>A-B</code> berjarak <code>6.000 mm</code> lengkap dengan balon notasi kedua ujung',
            'Delapan blok kolom baja <code>COL_300</code> ditempatkan tepat di titik potong grid pada layer <code>S-COL-BAJA</code>'
          ]
        },
        {
          btnTitle: '02. Dinding Bata & Bukaan Pintu/Jendela',
          btnSub: 'arch_wall berarsir otomatis + pintu D1-D2 & jendela W1-W4',
          cadRect: [138, 92, 954, 342],
          rpcServer: 'JSON-RPC • autocad-mcp-pro',
          rpcCall: 'mcp_autocad.arch_wall({ material: "brick", thickness: 150, poche: true }) + arch_opening({ tag: "W1", width: 4200 })',
          t: '02 • Sambungan Dinding & Pemotongan Kusen Otomatis',
          bullets: [
            '<code>arch_wall</code> membentuk dinding bata tebal <code>150 mm</code> lengkap dengan arsir material (<em>poche</em>) dan sambungan sudut L/T yang rapi',
            '<code>arch_opening</code> memotong dinding secara otomatis untuk pintu ayun <code>D1-D2</code> serta jendela ventilasi silang <code>W1-W4</code>',
            'Garis proyeksi atap tritisan keliling <code>1.800 mm</code> digambar putus-putus pada layer <code>A-ROOF-OVERHANG</code>'
          ]
        },
        {
          btnTitle: '03. 11 Blok Sirip Barat Putar 30°',
          btnSub: 'block_define & block_insert WEST_FIN_MODULE @ 600 mm',
          cadRect: [86, 86, 118, 356],
          rpcServer: 'JSON-RPC • autocad-mcp-pro',
          rpcCall: 'mcp_autocad.block_insert({ name: "WEST_FIN_MODULE", x: -700, y: "0..6000 step 600", rotation: 30, layer: "ARS-FASAD-SIRIP" })',
          t: '03 • Konsistensi Parameter dari 3D ke Gambar Kerja 2D',
          bullets: [
            'Parameter yang sama dengan SketchUp dan Grasshopper diteruskan ke AutoCAD melalui <code>block_define</code> dan 11 panggilan <code>block_insert</code>',
            'Kesebelas sirip ditempatkan pada <code>x = -700 mm</code> dengan jarak modul <code>600 mm</code> dan sudut putar <code>30°</code> di depan jendela barat <code>W1</code>',
            'Jika profil sirip direvisi, cukup perbarui definisi blok <code>WEST_FIN_MODULE</code> satu kali'
          ]
        },
        {
          btnTitle: '04. Hitung Luas & Tabel Schedule',
          btnSub: 'arch_room & arch_schedule: 103,55 m² + jadwal jendela',
          cadRect: [1246, 108, 304, 316],
          rpcServer: 'JSON-RPC • autocad-mcp-pro',
          rpcCall: 'mcp_autocad.arch_room({ name: "STUDIO DESAIN TROPIS" }) -> arch_schedule({ kind: "rooms" | "windows" })',
          t: '04 • Perhitungan Luas Bersih & Tabel Jadwal Otomatis',
          bullets: [
            '<code>arch_room</code> membaca poligon tertutup dinding secara geometris (bukan diketik manual): Studio <code>69,32 m²</code> + Diskusi &amp; Maket <code>34,22 m²</code>',
            '<code>arch_schedule</code> menyusun tabel <strong>ROOM SCHEDULE</strong> (total bersih <code>103,55 m²</code>) dan <strong>WINDOW SCHEDULE</strong> langsung di samping denah',
            'Rangkaian <code>dimension_linear</code> mengunci ukuran per modul <code>6.000 mm</code> dan bentang total <code>18.000 mm</code>'
          ]
        }
      ]
    }
  };

  let currentMcpPlat = 'sketchup';
  let currentMcpStep = 0;
  let currentRhinoView = 'split';

  const mcpReadout = document.getElementById('mcp-readout');
  const mcpRpcServer = document.getElementById('mcp-rpc-server');
  const mcpRpcCall = document.getElementById('mcp-rpc-call');
  const mcpLiveStage = document.getElementById('mcp-live-stage');
  const mcpStagePill = document.getElementById('mcp-stage-pill');
  const mcpStageSubtag = document.getElementById('mcp-stage-subtag');
  const mcpPanelSketchup = document.getElementById('mcp-panel-sketchup');
  const mcpPanelRhino = document.getElementById('mcp-panel-rhino');
  const mcpRhinoViewBar = document.getElementById('mcp-rhino-view-bar');
  const mcpRhinoImg = document.getElementById('mcp-rhino-img');
  const mcpGhSvg = document.getElementById('mcp-gh-svg');
  const mcpGhFocusRect = document.getElementById('mcp-gh-focus-rect');
  const mcpGhFocusRectB = document.getElementById('mcp-gh-focus-rect-b');
  const mcpPanelAutocad = document.getElementById('mcp-panel-autocad');
  const mcpCadFocusRect = document.getElementById('mcp-cad-focus-rect');
  const mcpDemoVideo = document.getElementById('mcp-demo-video');
  const mcpVidPlayBtn = document.getElementById('mcp-vid-play-btn');
  const mcpStepBtns = Array.from(document.querySelectorAll('.mcp-node-btn[data-mcp]'));

  function setSvgFocusRect(el, rect) {
    if (!el) return;
    if (!rect) {
      el.setAttribute('hidden', '');
      el.style.display = 'none';
      return;
    }
    el.removeAttribute('hidden');
    el.style.display = '';
    el.setAttribute('x', String(rect[0]));
    el.setAttribute('y', String(rect[1]));
    el.setAttribute('width', String(rect[2]));
    el.setAttribute('height', String(rect[3]));
  }

  function renderMcpStage(seekVideo) {
    const platData = mcpCatalog[currentMcpPlat] || mcpCatalog.sketchup;
    const item = platData.steps[currentMcpStep] || platData.steps[0];

    if (mcpLiveStage) {
      mcpLiveStage.dataset.mcpPlat = currentMcpPlat;
      mcpLiveStage.dataset.mcpActive = String(currentMcpStep);
    }
    if (mcpStagePill) mcpStagePill.textContent = platData.stagePill;
    const isSketchup = currentMcpPlat === 'sketchup';
    const isRhino = currentMcpPlat === 'rhino';
    if (mcpVidPlayBtn) mcpVidPlayBtn.hidden = !isSketchup;
    if (mcpRhinoViewBar) mcpRhinoViewBar.hidden = !isRhino;
    if (mcpStageSubtag) {
      mcpStageSubtag.hidden = isSketchup;
      mcpStageSubtag.textContent = platData.subTag;
    }

    if (mcpPanelSketchup) mcpPanelSketchup.hidden = !isSketchup;
    if (mcpPanelRhino) {
      mcpPanelRhino.hidden = !isRhino;
      mcpPanelRhino.dataset.ghActive = String(item.ghGroup ?? currentMcpStep);
      mcpPanelRhino.dataset.rhinoView = currentRhinoView;
      if (isRhino && mcpCatalog.rhino.views) {
        const vInfo = mcpCatalog.rhino.views[currentRhinoView] || mcpCatalog.rhino.views.split;
        if (mcpRhinoImg) {
          if (mcpRhinoImg.getAttribute('src') !== vInfo.src) {
            mcpRhinoImg.setAttribute('src', vInfo.src);
          }
          mcpRhinoImg.setAttribute('width', String(vInfo.w));
          mcpRhinoImg.setAttribute('height', String(vInfo.h));
          mcpRhinoImg.setAttribute('alt', vInfo.alt);
        }
        if (mcpGhSvg) {
          mcpGhSvg.setAttribute('viewBox', `0 0 ${vInfo.w} ${vInfo.h}`);
        }
        const pair = vInfo.rects[currentMcpStep] || vInfo.rects[0] || [null, null];
        setSvgFocusRect(mcpGhFocusRect, pair[0]);
        setSvgFocusRect(mcpGhFocusRectB, pair[1]);
      }
    }
    if (mcpPanelAutocad) {
      mcpPanelAutocad.hidden = currentMcpPlat !== 'autocad';
      if (mcpCadFocusRect && item.cadRect) {
        mcpCadFocusRect.setAttribute('x', String(item.cadRect[0]));
        mcpCadFocusRect.setAttribute('y', String(item.cadRect[1]));
        mcpCadFocusRect.setAttribute('width', String(item.cadRect[2]));
        mcpCadFocusRect.setAttribute('height', String(item.cadRect[3]));
      }
    }

    platData.steps.forEach((st, idx) => {
      const tEl = document.getElementById(`mcp-btn-title-${idx}`);
      const sEl = document.getElementById(`mcp-btn-sub-${idx}`);
      if (tEl) tEl.textContent = st.btnTitle;
      if (sEl) sEl.textContent = st.btnSub;
    });
    mcpStepBtns.forEach((b, idx) => {
      b.setAttribute('aria-pressed', String(idx === currentMcpStep));
    });

    if (mcpReadout) mcpReadout.innerHTML = renderPointBox(item.t, item.bullets);
    if (mcpRpcServer) mcpRpcServer.textContent = item.rpcServer;
    if (mcpRpcCall) mcpRpcCall.textContent = item.rpcCall;

    if (!isSketchup && mcpDemoVideo && !mcpDemoVideo.paused) {
      mcpDemoVideo.pause();
    } else if (isSketchup && seekVideo && mcpDemoVideo && typeof item.seekSec === 'number') {
      if (mcpDemoVideo.readyState >= 1) {
        try {
          mcpDemoVideo.currentTime = item.seekSec;
        } catch (_) {}
      } else {
        mcpDemoVideo.addEventListener(
          'loadedmetadata',
          () => {
            try {
              mcpDemoVideo.currentTime = item.seekSec;
            } catch (_) {}
          },
          { once: true }
        );
        if (mcpDemoVideo.preload === 'none') {
          mcpDemoVideo.preload = 'metadata';
          mcpDemoVideo.load();
        }
      }
    }
  }

  bindToggleGroup('.mcp-platform-btn', (btn) => {
    currentMcpPlat = btn.dataset.mcpPlat || 'sketchup';
    currentMcpStep = 0;
    renderMcpStage(false);
  });

  bindToggleGroup('.mcp-rhino-view-btn', (btn) => {
    currentRhinoView = btn.dataset.rhinoView || 'split';
    renderMcpStage(false);
  });

  bindToggleGroup('.mcp-node-btn[data-mcp]', (btn) => {
    currentMcpStep = Number(btn.dataset.mcp) || 0;
    renderMcpStage(true);
  });

  if (mcpDemoVideo && mcpVidPlayBtn) {
    const syncMcpPlayLabel = () => {
      const playing = !mcpDemoVideo.paused && !mcpDemoVideo.ended;
      mcpVidPlayBtn.setAttribute('aria-pressed', String(playing));
      mcpVidPlayBtn.textContent = playing ? 'Jeda Video' : 'Putar Video';
    };
    mcpVidPlayBtn.addEventListener('click', () => {
      if (mcpDemoVideo.paused || mcpDemoVideo.ended) {
        mcpDemoVideo.play().catch(() => {});
      } else {
        mcpDemoVideo.pause();
      }
    });
    mcpDemoVideo.addEventListener('play', syncMcpPlayLabel);
    mcpDemoVideo.addEventListener('pause', syncMcpPlayLabel);
    mcpDemoVideo.addEventListener('ended', syncMcpPlayLabel);
    syncMcpPlayLabel();
  }

  const reaViewMeta = {
    ingetrazo: {
      pill: 'INGETRAZO v0.6.1 • POINT CLOUD & 3DGS v1.0.2',
      subtag: 'Clone SketchUp + LayOut • GPL-3.0 • MCP Aktif'
    },
    cadcraft: {
      pill: 'CADCRAFT v0.20.1 (RUST) • RENDER .DXF LIVE',
      subtag: 'Clone AutoCAD Ringan • 198 Entitas Paviliun-Studio-Tropis-MCP.dxf'
    },
    pipeline: {
      pill: 'MATRIKS REA (170 TOOLS) & EKOSISTEM OPENAEC',
      subtag: 'Alur Spesifikasi Clean-Room • Bukan Pembajakan Kode'
    }
  };

  const reaStepsData = [
    {
      defaultView: 'ingetrazo',
      ingetrazoRect: [6, 26, 1286, 876],
      cadcraftRect: [24, 60, 1220, 602],
      pipelineTier: 0,
      rpcServer: 'MCP • rea (170 tools) + ingetrazo',
      rpcCall: 'rea.trace_application_feature({ target: "push_pull_skp_ifc4" }) -> ingetrazo.query_model()',
      t: '01 • Apa Itu REA (Reverse Engineer Anything) & Rekonstruksi Clean-Room',
      bullets: [
        '<strong>Jembatan analisis ke agen koding:</strong> Server MCP <code>morluto/rea</code> menyediakan 170 <em>tools</em> (terhubung ke Ghidra, Hopper, JADX &amp; pengurai biner) untuk memetakan struktur berkas serta perilaku fitur aplikasi secara terukur',
        '<strong>Prinsip Clean-Room (bukan pembajakan):</strong> Temuan analisis ditulis menjadi dokumen spesifikasi perilaku &amp; <em>obligation ledger</em>, lalu agen merakit implementasi baru yang bersih di atas pustaka terbuka (Rust/C++/Python)',
        '<strong>Dampak di dunia arsitektur:</strong> Mempercepat lahirnya alternatif <em>open-source</em> untuk pemodelan 3D, CAD 2D, BIM <code>IFC4</code>, dan <em>markup</em> PDF yang langsung memiliki dukungan MCP sejak hari pertama'
      ]
    },
    {
      defaultView: 'ingetrazo',
      ingetrazoRect: [1298, 66, 296, 854],
      cadcraftRect: [24, 60, 1220, 602],
      pipelineTier: 1,
      rpcServer: 'MCP • ingetrazo + Point Cloud 3DGS v1.0.2',
      rpcCall: 'ingetrazo.run_python({ plugin: "archimades27/pointcloud-splat", points: 369541, mode: "scan_to_bim" })',
      t: '02 • IngeTrazo v0.6.1 & Ekstensi Point Cloud 3DGS (@archi.mades)',
      bullets: [
        '<strong>Alternatif terbuka SketchUp + LayOut:</strong> Berlisensi <code>GPL-3.0</code>, membuka berkas <code>.skp</code> (2013 s.d. 2026), memiliki <em>Sheet Composer</em> berskala ke PDF, klasifikasi <code>IFC4</code>, serta server MCP bawaan (<code>run_python</code>, <code>query_model</code>)',
        '<strong>Kontribusi langsung narasumber:</strong> Ekstensi resmi <strong>Point Cloud &amp; 3D Gaussian Splatting v1.0.2</strong> (<code>archimades27/ingetrazo-pointcloud-splat</code>) merender <strong>369.541 titik pindaian</strong> pada 60+ FPS (C/SIMD) untuk <em>Section Box</em> &amp; <em>Scan-to-BIM</em>',
        '<strong>Manfaat studio &amp; kampus:</strong> Mahasiswa dan biro dapat memodelkan eksisting tapak dari hasil pindaian LiDAR/fotogrametri ke 3D tanpa terikat biaya langganan tahunan yang mahal'
      ]
    },
    {
      defaultView: 'cadcraft',
      ingetrazoRect: [6, 26, 1286, 876],
      cadcraftRect: [24, 60, 1220, 602],
      pipelineTier: 2,
      rpcServer: 'MCP • cadcraft (Rust v0.20.1) + bimcraft',
      rpcCall: 'cadcraft.open("Paviliun-Studio-Tropis-MCP.dxf") -> cadcraft.render({ entities: 198, width: 1600 })',
      t: '03 • Gelombang Clone CAD & BIM Berbasis Rust (CADCraft, OpenCAD & BIMCraft)',
      bullets: [
        '<strong>CADCraft v0.20.1 &amp; OpenCADStudio:</strong> Alternatif 2D/3D AutoCAD ringan berbasis Rust dengan baris perintah familier (<code>LINE</code>, <code>OFFSET</code>, <code>TRIM</code>), dukungan <code>.dxf</code>/<code>.dwg</code>, kompilasi WebAssembly, dan server MCP terintegrasi',
        '<strong>Render langsung di MacBook ini:</strong> Tangkapan di samping adalah keluaran nyata <code>cadcraft.render</code> saat membuka berkas <strong>198 entitas</strong> <code>Paviliun-Studio-Tropis-MCP.dxf</code> lengkap dengan jadwal ruang dan kusen',
        '<strong>BIMCraft v0.9.0 (Alternatif Revit):</strong> Pemodel BIM parametrik berbasis Rust (pintasan <code>WA</code> dinding, <code>DR</code> pintu, <em>Ribbon UI</em>, jadwal kuantitas otomatis, dan pertukaran terbuka <code>IFC2x3</code>/<code>IFC4</code>)'
      ]
    },
    {
      defaultView: 'pipeline',
      ingetrazoRect: [1298, 66, 296, 854],
      cadcraftRect: [1272, 162, 300, 322],
      pipelineTier: 3,
      rpcServer: 'GOVERNANCE • OpenAEC (IFC4 / .DXF) & Decider',
      rpcCall: 'rea.verify_reconstruction({ clean_room: true, export_standard: ["IFC4", "DXF", "PDF/A"] })',
      t: '04 • Ekosistem OpenAEC, Instrumen Kustom & Sikap Kritis Decider',
      bullets: [
        '<strong>Melengkapi rantai kerja:</strong> Hadir pula <strong>Open PDF Studio</strong> (alternatif Bluebeam Revu untuk <em>markup</em> gambar kerja) berdampingan dengan instrumen spesifik biro hasil <em>vibe coding</em> seperti <strong>Helios Solar Engine v2.0</strong> &amp; <strong>Site Inspector 360°</strong>',
        '<strong>Batas legal &amp; etika profesi:</strong> Gunakan <em>software clone</em> yang dibangun lewat <strong>spesifikasi clean-room</strong> berlisensi terbuka yang sah; hindari pembajakan lisensi maupun penyalinan kode sumber tertutup',
        '<strong>Keputusan Decider di proyek nyata:</strong> Manfaatkan <em>clone</em> ringan &amp; ber-MCP untuk eksplorasi cepat, studi kampus, dan otomasi skrip, sembari mengunci format terbuka (<code>IFC4</code> / <code>.dxf</code>) saat berkoordinasi DED lintas disiplin di Revit/CAD industri'
      ]
    }
  ];

  let currentReaView = 'ingetrazo';
  let currentReaStep = 0;

  const reaViewportShell = document.getElementById('rea-viewport-shell');
  const reaStagePill = document.getElementById('rea-stage-pill');
  const reaStageSubtag = document.getElementById('rea-stage-subtag');
  const reaPanelIngetrazo = document.getElementById('rea-panel-ingetrazo');
  const reaPanelCadcraft = document.getElementById('rea-panel-cadcraft');
  const reaPanelPipeline = document.getElementById('rea-panel-pipeline');
  const reaIngetrazoRect = document.getElementById('rea-ingetrazo-rect');
  const reaCadcraftRect = document.getElementById('rea-cadcraft-rect');
  const reaRpcServer = document.getElementById('rea-rpc-server');
  const reaRpcCall = document.getElementById('rea-rpc-call');
  const reaReadout = document.getElementById('rea-readout');
  const reaViewBtns = Array.from(document.querySelectorAll('.rea-view-btn[data-rea-view]'));
  const reaStepBtns = Array.from(document.querySelectorAll('.rea-step-btn[data-rea]'));

  function renderReaStage() {
    const stepItem = reaStepsData[currentReaStep] || reaStepsData[0];
    const viewMeta = reaViewMeta[currentReaView] || reaViewMeta.ingetrazo;

    if (reaViewportShell) {
      reaViewportShell.dataset.reaView = currentReaView;
      reaViewportShell.dataset.reaStep = String(currentReaStep);
    }
    if (reaStagePill) reaStagePill.textContent = viewMeta.pill;
    if (reaStageSubtag) reaStageSubtag.textContent = viewMeta.subtag;

    if (reaPanelIngetrazo) reaPanelIngetrazo.hidden = currentReaView !== 'ingetrazo';
    if (reaPanelCadcraft) reaPanelCadcraft.hidden = currentReaView !== 'cadcraft';
    if (reaPanelPipeline) {
      reaPanelPipeline.hidden = currentReaView !== 'pipeline';
      reaPanelPipeline.dataset.activeLayer = String(stepItem.pipelineTier ?? currentReaStep);
    }

    setSvgFocusRect(reaIngetrazoRect, stepItem.ingetrazoRect);
    setSvgFocusRect(reaCadcraftRect, stepItem.cadcraftRect);

    reaViewBtns.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.reaView === currentReaView));
    });
    reaStepBtns.forEach((b, idx) => {
      b.setAttribute('aria-pressed', String(idx === currentReaStep));
    });

    if (reaRpcServer) reaRpcServer.textContent = stepItem.rpcServer;
    if (reaRpcCall) reaRpcCall.textContent = stepItem.rpcCall;
    if (reaReadout) reaReadout.innerHTML = renderPointBox(stepItem.t, stepItem.bullets);
  }

  bindToggleGroup('.rea-view-btn[data-rea-view]', (btn) => {
    currentReaView = btn.dataset.reaView || 'ingetrazo';
    renderReaStage();
  });

  bindToggleGroup('.rea-step-btn[data-rea]', (btn) => {
    currentReaStep = Number(btn.dataset.rea) || 0;
    const stepItem = reaStepsData[currentReaStep] || reaStepsData[0];
    currentReaView = stepItem.defaultView || 'ingetrazo';
    renderReaStage();
  });

  // Respect prefers-reduced-motion on autoplaying media (`lazy-load-video-and-audio`)
  const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncReducedMotionMedia(prefersReduce) {
    for (const video of document.querySelectorAll('video[autoplay]')) {
      if (prefersReduce || !isMotionAllowed()) {
        video.removeAttribute('autoplay');
        video.pause();
      }
    }
  }
  syncReducedMotionMedia(reducedMotionMediaQuery.matches);
  reducedMotionMediaQuery.addEventListener('change', (e) => syncReducedMotionMedia(e.matches));

  const angleInput = document.getElementById('fin-angle');
  const spacingInput = document.getElementById('fin-spacing');
  const angleValEl = document.getElementById('fin-angle-val');
  const spacingValEl = document.getElementById('fin-spacing-val');
  const pythonCodeEl = document.getElementById('live-python-code');
  const metricCountEl = document.getElementById('metric-count');
  const metricNoteEl = document.getElementById('metric-note');
  const louverBladesGroup = document.getElementById('louver-blades');
  const solarRaysGroup = document.getElementById('solar-rays');
  const louverDimEl = document.getElementById('louver-svg-dim');

  function renderLouverSimulation() {
    if (!angleInput || !spacingInput) return;
    const angleDeg = Number(angleInput.value);
    const spacingM = Number(spacingInput.value);
    const facadeWidthM = 6.0;
    const count = Math.floor(facadeWidthM / spacingM) + 1;

    if (angleValEl) angleValEl.textContent = `${angleDeg}°`;
    if (spacingValEl) spacingValEl.textContent = `${spacingM.toFixed(2)} m`;
    if (louverDimEl) louverDimEl.textContent = `MODUL ${spacingM.toFixed(2)} M • SUDUT ${angleDeg}°`;
    if (metricCountEl) metricCountEl.textContent = `${count} sirip (bentang 6,0 m)`;

    if (metricNoteEl) {
      if (angleDeg <= 10 && spacingM >= 0.8) {
        metricNoteEl.textContent = 'View luas • Sinar sore masih tembus';
      } else if (angleDeg >= 45 && spacingM <= 0.5) {
        metricNoteEl.textContent = 'Tahan silau kuat • Cek potensi ruang redup';
      } else {
        metricNoteEl.textContent = 'Seimbang menahan silau & menjaga view';
      }
    }

    if (pythonCodeEl) {
      pythonCodeEl.innerHTML = `<code># Parameter fasad barat (meter)
lebar_fasad = 6.0
jarak_modul = ${spacingM.toFixed(2)}
sudut_sirip = ${angleDeg}

jumlah_sirip = int(lebar_fasad / jarak_modul) + 1  # ${count} sirip
posisi_x = [
    round(i * jarak_modul, 2)
    for i in range(jumlah_sirip)
]  # diteruskan ke Rhino / SketchUp via MCP</code>`;
    }

    // Crisp Vector CAD Plan-Section & True 2D Solar Ray-Segment Intersection
    const startX = 48;
    const usableW = 424;
    const finStep = count > 1 ? usableW / (count - 1) : usableW;
    const centerY = 104;
    const halfLen = 20;
    const rad = (angleDeg * Math.PI) / 180;
    const dxFin = halfLen * Math.sin(rad);
    const dyFin = halfLen * Math.cos(rad);

    const segments = [];
    const bladesMarkup = [];
    for (let k = 0; k < count; k++) {
      const fx = startX + k * finStep;
      const x1 = fx + dxFin;
      const y1 = centerY - dyFin;
      const x2 = fx - dxFin;
      const y2 = centerY + dyFin;
      segments.push({ x1, y1, x2, y2 });
      bladesMarkup.push(
        `<line x1="${fx.toFixed(1)}" y1="${centerY}" x2="${fx.toFixed(1)}" y2="146" stroke="currentColor" stroke-width="0.9" stroke-dasharray="2 3" opacity="0.26" />`,
        `<line class="louver-fin-line" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" />`,
        `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />`,
        `<circle cx="${fx.toFixed(1)}" cy="${centerY}" r="2.6" fill="var(--bg)" stroke="currentColor" stroke-width="1.3" />`
      );
    }
    if (louverBladesGroup) {
      louverBladesGroup.innerHTML = bladesMarkup.join('');
    }

    if (solarRaysGroup) {
      const raysMarkup = [];
      const rayCount = 18;
      const rayY0 = 36;
      const rayYMax = 176;
      const raySlope = 0.52;
      const rVecX = (rayYMax - rayY0) * raySlope;
      const rVecY = rayYMax - rayY0;

      for (let i = 0; i < rayCount; i++) {
        const rx0 = 18 + i * 25.5;
        let bestT = 1.0;
        let blocked = false;

        for (let s = 0; s < segments.length; s++) {
          const seg = segments[s];
          const sVecX = seg.x2 - seg.x1;
          const sVecY = seg.y2 - seg.y1;
          const denom = rVecX * sVecY - rVecY * sVecX;
          if (Math.abs(denom) < 1e-5) continue;
          const qpx = seg.x1 - rx0;
          const qpy = seg.y1 - rayY0;
          const tRay = (qpx * sVecY - qpy * sVecX) / denom;
          const uSeg = (qpx * rVecY - qpy * rVecX) / denom;
          if (tRay > 0 && tRay < bestT && uSeg >= -0.05 && uSeg <= 1.05) {
            bestT = tRay;
            blocked = true;
          }
        }

        if (blocked) {
          const hitX = rx0 + rVecX * bestT;
          const hitY = rayY0 + rVecY * bestT;
          if (hitX >= 28 && hitX <= 492) {
            raysMarkup.push(
              `<line x1="${rx0.toFixed(1)}" y1="${rayY0}" x2="${hitX.toFixed(1)}" y2="${hitY.toFixed(1)}" stroke="var(--accent)" stroke-width="1.7" stroke-dasharray="5 4" opacity="0.88" />`,
              `<circle cx="${hitX.toFixed(1)}" cy="${hitY.toFixed(1)}" r="2.3" fill="var(--accent)" />`
            );
          }
        } else {
          const tGlass = (146 - rayY0) / rVecY;
          const glassX = rx0 + rVecX * tGlass;
          const endX = rx0 + rVecX;
          if (glassX >= 34 && glassX <= 486 && endX <= 490) {
            raysMarkup.push(
              `<line x1="${rx0.toFixed(1)}" y1="${rayY0}" x2="${glassX.toFixed(1)}" y2="146" stroke="var(--accent)" stroke-width="1.7" stroke-dasharray="5 4" opacity="0.88" />`,
              `<line x1="${glassX.toFixed(1)}" y1="150" x2="${endX.toFixed(1)}" y2="${rayYMax}" stroke="var(--accent)" stroke-width="1.5" opacity="0.44" />`
            );
          }
        }
      }
      solarRaysGroup.innerHTML = raysMarkup.join('');
    }
  }

  if (angleInput && spacingInput) {
    angleInput.addEventListener('input', renderLouverSimulation);
    spacingInput.addEventListener('input', renderLouverSimulation);
    renderLouverSimulation();
  }

  const prepData = [
    {
      t: '01 • Posisikan Diri sebagai Decider',
      bullets: [
        'Jangan serahkan keputusan desain kepada mesin',
        'Gunakan AI untuk memperkaya perbandingan opsi',
        'Pegang penuh kendali alasan di setiap garis gambar'
      ]
    },
    {
      t: '02 • Tambah Literasi Lintas Ilmu',
      bullets: [
        'Perluas bacaan arsitektur, struktur, iklim &amp; sosial budaya',
        'Manfaatkan Hermes Agent untuk merangkum jurnal &amp; referensi',
        'Literasi tinggi = tahu cepat mana alternatif yang lebih baik'
      ]
    },
    {
      t: '03 • Perkuat Fundamental Tektonika & Iklim',
      bullets: [
        'Kuasai penyaluran beban, detail sambungan &amp; fisika tropis',
        'Fundamental kuat mencegah kita tertipu render halusinatif',
        'Uji setiap ide pada potongan dan keterbangunan nyata'
      ]
    },
    {
      t: '04 • Rangkai Alur Alat secara Luwes',
      bullets: [
        'Padukan Digital Twin, BIM Revit, SketchUp &amp; Rhino',
        'Percepat otomasi geometri 3D via MCP di SketchUp, Rhino &amp; CAD',
        'Sajikan narasi interaktif dengan video AI &amp; vibe coding berbasis web'
      ]
    },
    {
      t: '05 • Rawat Kepekaan Ruang Nyata',
      bullets: [
        'Alami langsung skala, bayangan tritisan, angin &amp; tekstur material',
        'Dengarkan empati penghuni yang tidak terekam di data mesin',
        'Latih kejujuran proses dan ketajaman bertutur desain'
      ]
    }
  ];
  const prepReadout = document.getElementById('prep-readout');
  bindToggleGroup('.kinetic-row-btn', (btn) => {
    const item = prepData[Number(btn.dataset.prep)] || prepData[0];
    prepReadout.innerHTML = renderPointBox(item.t, item.bullets);
  });

  // Generative Cross-Glyph (+ / ·) Volumetric Motion Engine (Colab Reference Adaptation)
  function cellHash(gx, gy) {
    const n = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function createGlyphStage(shellId, canvasId, drawFrameFn) {
    const shell = document.getElementById(shellId);
    const canvas = document.getElementById(canvasId);
    if (!shell || !canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const baseW = Number(canvas.getAttribute('width')) || 680;
    const baseH = Number(canvas.getAttribute('height')) || 330;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let skippedByBrowser = false;
    let rafId = 0;
    let timeSec = 0.8;
    let lastTs = 0;
    let pointerX = -999;
    let pointerY = -999;

    function syncBackingStore() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(baseW * dpr);
      const targetH = Math.round(baseH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    }

    function renderOnce() {
      syncBackingStore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, baseW, baseH);
      drawFrameFn(ctx, baseW, baseH, timeSec, pointerX, pointerY, getRenderedScheme() === 'dark');
    }

    function tick(ts) {
      rafId = 0;
      if (skippedByBrowser || !isMotionAllowed() || document.hidden) return;
      if (lastTs) {
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        timeSec += dt;
      }
      lastTs = ts;
      renderOnce();
      rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      lastTs = 0;
    }

    function startLoop(redrawStatic = false) {
      if (redrawStatic && !skippedByBrowser) {
        renderOnce();
      }
      if (!skippedByBrowser && isMotionAllowed() && !document.hidden && !rafId) {
        rafId = requestAnimationFrame(tick);
      }
    }

    // Pause offscreen canvas work via contentvisibilityautostatechange (`efficient-background-processing`)
    shell.addEventListener('contentvisibilityautostatechange', (event) => {
      skippedByBrowser = Boolean(event.skipped);
      if (skippedByBrowser) {
        stopLoop();
      } else {
        startLoop(true);
      }
    });

    if (!('contentVisibility' in document.documentElement.style)) {
      const fallbackObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            skippedByBrowser = !entry.isIntersecting;
            if (skippedByBrowser) {
              stopLoop();
            } else {
              startLoop(true);
            }
          }
        },
        { rootMargin: '220px' }
      );
      fallbackObserver.observe(shell);
    }

    shell.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = ((e.clientX - rect.left) / rect.width) * baseW;
      pointerY = ((e.clientY - rect.top) / rect.height) * baseH;
      if (!isMotionAllowed()) renderOnce();
    });

    shell.addEventListener('pointerleave', () => {
      pointerX = -999;
      pointerY = -999;
      if (!isMotionAllowed()) renderOnce();
    });

    const controller = {
      sync(redrawNow = false) {
        if (!isMotionAllowed()) {
          stopLoop();
          if (redrawNow && !skippedByBrowser) renderOnce();
        } else {
          startLoop(redrawNow);
        }
      },
      renderOnce
    };

    renderOnce();
    startLoop(false);
    glyphStageControllers.push(controller);
    return controller;
  }

  // Integer-snapped pixel-art glyph primitives (`+` cross-stitch, hollow pixel block, crisp pixel dot)
  function drawPixelCross(ctx, x, y, arm, bar) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const halfBar = Math.floor(bar * 0.5);
    ctx.fillRect(cx - arm, cy - halfBar, arm * 2 + (bar % 2), bar);
    ctx.fillRect(cx - halfBar, cy - arm, bar, arm * 2 + (bar % 2));
  }

  function drawPixelHollow(ctx, x, y, half) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const s = half * 2;
    ctx.fillRect(cx - half, cy - half, s, 1);
    ctx.fillRect(cx - half, cy + half - 1, s, 1);
    ctx.fillRect(cx - half, cy - half + 1, 1, s - 2);
    ctx.fillRect(cx + half - 1, cy - half + 1, 1, s - 2);
  }

  // Unified Colab Volumetric Dithered Cross-Glyph (`+` / `▫` / `·`) Shader Cell
  // Palette: Mineral Cyan-Sage outer canopy + Roasted Terracotta fold + Molten Amber-Ivory core
  function paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rimHighlight, hVal, isDark, isSpore) {
    if (density < 0.15 && !isSpore) return;
    const cw = Math.max(0, Math.min(1, coreWarmth));
    const uf = Math.max(0, Math.min(1, umbraFold));
    const sparkle = (hVal > 0.84 && density > 0.30 ? 0.24 : 0) + rimHighlight;
    const lum = Math.min(1, density + sparkle);

    let rCol, gCol, bCol, alpha;
    if (isDark) {
      const mineralR = 132 + 44 * lum;
      const mineralG = 178 + 46 * lum;
      const mineralB = 188 + 44 * lum;

      const foldR = 188;
      const foldG = 94;
      const foldB = 52;

      const amberR = 250;
      const amberG = 184;
      const amberB = 92;

      let mixR = mineralR * (1 - uf * 0.72) + foldR * (uf * 0.72);
      let mixG = mineralG * (1 - uf * 0.72) + foldG * (uf * 0.72);
      let mixB = mineralB * (1 - uf * 0.72) + foldB * (uf * 0.72);

      mixR = mixR * (1 - cw) + amberR * cw;
      mixG = mixG * (1 - cw) + amberG * cw;
      mixB = mixB * (1 - cw) + amberB * cw;

      const hiMix = Math.pow(lum, 2.02) * 0.64;
      rCol = Math.round(mixR * (1 - hiMix) + 255 * hiMix);
      gCol = Math.round(mixG * (1 - hiMix) + 247 * hiMix);
      bCol = Math.round(mixB * (1 - hiMix) + 228 * hiMix);
      alpha = isSpore && density < 0.15 ? 0.56 : Math.min(0.99, 0.26 + lum * 0.78);
    } else {
      const mineralR = 38;
      const mineralG = 74;
      const mineralB = 86;
      const copperR = 176;
      const copperG = 66;
      const copperB = 12;
      const warmMix = Math.min(1, cw + uf * 0.45);
      rCol = Math.round(mineralR * (1 - warmMix) + copperR * warmMix);
      gCol = Math.round(mineralG * (1 - warmMix) + copperG * warmMix);
      bCol = Math.round(mineralB * (1 - warmMix) + copperB * warmMix);
      alpha = isSpore && density < 0.15 ? 0.48 : Math.min(0.96, 0.28 + lum * 0.74);
    }

    ctx.fillStyle = `rgba(${rCol},${gCol},${bCol},${alpha.toFixed(2)})`;

    const bigArm = step >= 9 ? 4 : 3;
    const medArm = step >= 8 ? 3 : 2;
    const medBar = step >= 8 ? 2 : 1;

    if (isSpore && density < 0.15) {
      if (hVal > 0.962) {
        drawPixelCross(ctx, x, y, medArm, 1);
      } else {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    } else if (lum > 0.75) {
      drawPixelCross(ctx, x, y, bigArm, 2);
    } else if (lum > 0.50) {
      drawPixelCross(ctx, x, y, medArm, medBar);
    } else if (lum > 0.30) {
      if ((gx + gy) % 2 === 0) {
        drawPixelCross(ctx, x, y, medArm, 1);
      } else {
        drawPixelHollow(ctx, x, y, 2);
      }
    } else if (hVal > 0.44) {
      drawPixelCross(ctx, x, y, 2, 1);
    } else {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  let heroPresetTarget = 3;
  let heroPresetBlend = 3;
  const heroShellEl = document.getElementById('hero-glyph-shell');

  // Sec 01 (#sec-01): Monumental 5-Lobe Volumetric Cross-Glyph Canopy
  const heroController = createGlyphStage(
    'hero-glyph-shell',
    'hero-glyph-canvas',
    (ctx, w, h, t, px, py, isDark) => {
      ctx.imageSmoothingEnabled = false;
      heroPresetBlend += (heroPresetTarget - heroPresetBlend) * (isMotionAllowed() ? 0.12 : 1);
      const step = 10;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const originX = w * 0.49;
      const originY = h * 0.81;

      const petalConfigs = [
        { ang: -1.66, len: 224, wid: 0.24, bract: true },
        { ang: -1.16, len: 356, wid: 0.30, bract: false },
        { ang: -0.58, len: 404, wid: 0.33, bract: false },
        { ang: -0.02, len: 416, wid: 0.35, bract: false },
        { ang: 0.54, len: 448, wid: 0.32, bract: false },
        { ang: 1.04, len: 374, wid: 0.26, bract: false },
        { ang: 1.56, len: 196, wid: 0.22, bract: true }
      ];

      for (let gy = 1; gy < rows - 1; gy++) {
        const y = gy * step + 5;
        for (let gx = 1; gx < cols - 1; gx++) {
          const x = gx * step + 5;
          const dx = x - originX;
          const dy = y - originY;
          const r = Math.hypot(dx, dy);
          const theta = Math.atan2(dx, -dy);
          const hVal = cellHash(gx, gy);

          let density = 0;
          let rimHighlight = 0;

          for (let p = 0; p < petalConfigs.length; p++) {
            const pc = petalConfigs[p];
            const sway = Math.sin(t * 0.82 + p * 1.08) * 0.032;
            const presetShift = (heroPresetBlend - 3) * 0.055 * (p - 3);
            const dAng = theta - (pc.ang + sway + presetShift);
            const angNorm = Math.abs(dAng) / pc.wid;
            if (angNorm > 1.38) continue;

            const angFactor = Math.pow(Math.max(0, 1 - Math.pow(angNorm / 1.32, 2.3)), 0.78);
            const notch = 1 + 0.065 * Math.sin(theta * (8 + Math.round(heroPresetBlend)) + t * 1.05);
            const reach = pc.len * notch;
            if (r > reach) continue;

            const u = r / reach;
            const radialProfile = u < 0.88
              ? 0.36 + 0.64 * Math.sin(u * Math.PI * 0.78)
              : Math.max(0, (1 - u) / 0.12) * 0.88;
            const weave = 0.82 + 0.18 * Math.cos(dAng * 16 - r * 0.048 + t * 1.35);
            const contrib = angFactor * radialProfile * (pc.bract ? weave * 0.82 : weave);
            if (contrib > density) density = contrib;

            if (u > 0.80 && u < 0.97 && angFactor > 0.42 && hVal > 0.66) {
              rimHighlight = Math.max(rimHighlight, 0.32);
            }
          }

          const coreDist = Math.hypot((dx - 16) * 0.78, dy + 96);
          const coreGlow = Math.max(0, 1 - coreDist / 188);
          density = Math.max(density, coreGlow * 0.92);

          const coreWarmth = Math.pow(Math.max(0, 1 - Math.hypot((dx - 12) * 0.72, dy + 92) / 228), 1.25);
          const umbraFold = Math.pow(Math.max(0, 1 - Math.hypot((dx + 96) * 0.85, dy + 64) / 154), 1.35);

          if (px > 0) {
            const pDist = Math.hypot(x - px, y - py);
            if (pDist < 118) {
              const boost = (1 - pDist / 118) * 0.32;
              density = Math.min(1, density + boost);
              rimHighlight = Math.max(rimHighlight, boost * 0.7);
            }
          }

          const sporeFlank =
            Math.abs(dx) > 125 &&
            Math.abs(dx) < 445 &&
            dy > -120 &&
            dy < 78 &&
            hVal > 0.905 - 0.055 * Math.sin(t * 0.9 + gx * 0.25 + gy * 0.17);

          if (Math.abs(dx) < 150 && dy > 52 && density < 0.35) continue;
          paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rimHighlight, hVal, isDark, sporeFlank);
        }
      }
    }
  );

  bindToggleGroup('.hero-pillar-btn', (btn) => {
    heroPresetTarget = Number(btn.dataset.glyphPreset) ?? 3;
    if (heroShellEl) heroShellEl.dataset.glyphMode = String(heroPresetTarget);
    if (!isMotionAllowed()) {
      heroPresetBlend = heroPresetTarget;
      heroController?.renderOnce();
    }
  });

  // Sec 02 (#sec-02): Bilateral Architectural Horizon Wing Canopy behind Manifesto
  createGlyphStage(
    'mosaic-glyph-shell',
    'mosaic-glyph-canvas',
    (ctx, w, h, t, px, py, isDark) => {
      ctx.imageSmoothingEnabled = false;
      const step = 8;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const cx = w * 0.5;
      const cy = h * 0.88;

      const wingLobes = [
        { ang: -1.36, len: 410, wid: 0.24 },
        { ang: -0.94, len: 365, wid: 0.28 },
        { ang: -0.46, len: 265, wid: 0.30 },
        { ang: 0.0, len: 232, wid: 0.34 },
        { ang: 0.46, len: 265, wid: 0.30 },
        { ang: 0.94, len: 365, wid: 0.28 },
        { ang: 1.36, len: 410, wid: 0.24 }
      ];

      for (let gy = 1; gy < rows - 1; gy++) {
        const y = gy * step + 4;
        for (let gx = 1; gx < cols - 1; gx++) {
          const x = gx * step + 4;
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.hypot(dx * 0.88, dy * 1.18);
          const theta = Math.atan2(dx, -dy);
          const hVal = cellHash(gx + 11, gy + 29);

          let density = 0;
          let rim = 0;
          for (let i = 0; i < wingLobes.length; i++) {
            const wl = wingLobes[i];
            const dAng = theta - (wl.ang + Math.sin(t * 0.7 + i) * 0.025);
            const angNorm = Math.abs(dAng) / wl.wid;
            if (angNorm > 1.35) continue;
            const reach = wl.len * (1 + 0.05 * Math.cos(theta * 9 + t * 0.9));
            if (r > reach) continue;
            const u = r / reach;
            const angFactor = Math.pow(Math.max(0, 1 - Math.pow(angNorm / 1.3, 2.2)), 0.8);
            const radProfile = u < 0.86 ? 0.34 + 0.66 * Math.sin(u * Math.PI * 0.8) : Math.max(0, (1 - u) / 0.14) * 0.85;
            const contrib = angFactor * radProfile * (0.84 + 0.16 * Math.cos(dAng * 14 - r * 0.05 + t * 1.1));
            if (contrib > density) density = contrib;
            if (u > 0.80 && u < 0.96 && hVal > 0.68) rim = 0.28;
          }

          const coreWarmth = Math.pow(Math.max(0, 1 - Math.hypot(dx * 0.52, dy + 68) / 185), 1.25);
          const umbraFold = Math.pow(Math.max(0, 1 - Math.hypot((Math.abs(dx) - 165) * 0.7, dy + 54) / 115), 1.3);
          const isSpore = Math.abs(dx) > 180 && hVal > 0.925 - 0.04 * Math.sin(t + gx * 0.2);

          if (px > 0 && Math.hypot(x - px, y - py) < 92) {
            density = Math.min(1, density + 0.34);
            rim = 0.35;
          }
          paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rim, hVal, isDark, isSpore);
        }
      }
    }
  );

  // Sec 02 (#sec-02): Volumetric Cross-Glyph Career Trajectory Wave (clean middle band between top & bottom solid capsules)
  createGlyphStage(
    'career-glyph-shell',
    'career-glyph-canvas',
    (ctx, w, h, t, px, py, isDark) => {
      ctx.imageSmoothingEnabled = false;
      const step = 6;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const milestones = [96, 332, 604, 848];

      for (let gy = 1; gy < rows - 1; gy++) {
        const y = gy * step + 3;
        if (y < 36 || y > 92) continue;
        for (let gx = 2; gx < cols - 2; gx++) {
          const x = gx * step + 3;
          const hVal = cellHash(gx + 43, gy + 17);
          const waveY = h * 0.5 + Math.sin(x * 0.014 - t * 1.2) * 5;
          const bandDist = Math.abs(y - waveY);
          let density = Math.max(0, 1 - bandDist / 14) * 0.62;
          let rim = 0;

          for (let m = 0; m < milestones.length; m++) {
            const mx = milestones[m];
            const rad = m === 3 ? 30 : 25;
            const dNode = Math.hypot((x - mx) * 0.76, y - h * 0.5);
            if (dNode < rad) {
              const lobe = Math.pow(1 - dNode / rad, 0.85) * (m === 3 ? 0.98 : 0.86);
              if (lobe > density) density = lobe;
              if (dNode > rad * 0.68 && hVal > 0.66) rim = 0.26;
            }
          }

          const progX = Math.max(0, Math.min(1, (x - 80) / 800));
          const coreWarmth = Math.pow(progX, 1.55) * 0.92 + (Math.abs(x - 848) < 56 ? 0.25 : 0);
          const umbraFold = Math.max(0, 1 - Math.abs(progX - 0.56) / 0.28) * 0.65;
          const isSpore = bandDist < 24 && hVal > 0.94;

          if (px > 0 && Math.hypot(x - px, y - py) < 56) {
            density = Math.min(1, density + 0.34);
          }
          paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rim, hVal, isDark, isSpore);
        }
      }
    }
  );

  // Bab 01 (#sec-04): 7-Lobe Volumetric Cross-Glyph Orbital Ring (clear central aperture beneath solid hub & node pills)
  bab1PixelController = createGlyphStage(
    'bab1-pixel-shell',
    'bab1-pixel-canvas',
    (ctx, w, h, t, px, py, isDark) => {
      ctx.imageSmoothingEnabled = false;
      const step = 7;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const cx = 230;
      const cy = 180;
      const outerR = 118;
      const innerR = 82;
      const stepRad = (Math.PI * 2) / 7;
      const s = stageData[currentBab1Stage] || stageData[0];

      const fbStart = s.fbFrom * stepRad;
      const fbEnd = s.fbTo * stepRad;
      const fbMin = Math.min(fbStart, fbEnd);
      const fbMax = Math.max(fbStart, fbEnd);

      for (let gy = 1; gy < rows - 1; gy++) {
        const y = gy * step + 3;
        for (let gx = 1; gx < cols - 1; gx++) {
          const x = gx * step + 3;
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.hypot(dx, dy);
          if (r < 54) continue;

          let ang = Math.atan2(dx, -dy);
          if (ang < 0) ang += Math.PI * 2;
          const hVal = cellHash(gx + 5, gy + 13);

          let density = 0;
          let coreWarmth = 0.08;
          let umbraFold = 0.12;
          let rim = 0;

          // Soft rim glow right outside central hub disc (r = 54..66)
          if (r < 66) {
            const uRim = (r - 54) / 12;
            density = Math.max(density, (1 - uRim) * 0.56);
            coreWarmth = Math.max(coreWarmth, (1 - uRim) * 0.72);
          }

          // Continuous volumetric torus ring at r = 118
          const ringDist = Math.abs(r - outerR);
          if (ringDist < 20) {
            const ringWave = 1 + 0.15 * Math.sin(ang * 14 - t * 1.6);
            const ringDen = Math.max(0, 1 - ringDist / (15 * ringWave)) * 0.54;
            if (ringDen > density) density = ringDen;
            const activeSpan = ((currentBab1Stage + 0.25) / 7) * Math.PI * 2;
            if (ang <= activeSpan) {
              coreWarmth = Math.max(coreWarmth, 0.68);
              umbraFold = Math.max(umbraFold, 0.35);
            }
          }

          // 7 Volumetric Phase Canopy Coronas around Solid Node Discs
          for (let k = 0; k < 7; k++) {
            const kAng = k * stepRad;
            const nx = cx + Math.sin(kAng) * outerR;
            const ny = cy - Math.cos(kAng) * outerR;
            const isActive = k === currentBab1Stage;
            const isDone = k < currentBab1Stage;
            const lobeR = isActive ? 36 : isDone ? 25 : 21;
            const dLobe = Math.hypot(x - nx, y - ny);
            if (dLobe < lobeR) {
              const uL = dLobe / lobeR;
              const flutter = 0.88 + 0.12 * Math.cos(Math.atan2(y - ny, x - nx) * 6 + t * 1.4);
              const lDen = Math.pow(1 - uL, 0.78) * flutter * (isActive ? 0.98 : isDone ? 0.8 : 0.62);
              if (lDen > density) density = lDen;
              if (isActive) {
                coreWarmth = Math.max(coreWarmth, 0.58 + (1 - uL) * 0.42);
                umbraFold = Math.max(umbraFold, uL * 0.52);
                if (uL > 0.72 && hVal > 0.62) rim = 0.32;
              } else if (isDone) {
                coreWarmth = Math.max(coreWarmth, 0.48 + (1 - uL) * 0.28);
                umbraFold = Math.max(umbraFold, 0.48);
              }
            }
          }

          // Inner feedback volumetric stream at r = 82
          const fbDist = Math.abs(r - innerR);
          if (fbDist < 11 && ang >= fbMin && ang <= fbMax) {
            const pulse = 0.74 + 0.26 * Math.sin(ang * 18 + t * 4.2 * (s.fbDir || -1));
            const fbDen = (1 - fbDist / 11) * 0.78 * pulse;
            if (fbDen > density) density = fbDen;
            coreWarmth = Math.max(coreWarmth, 0.88);
          }

          const isSpore = r > 58 && r < 152 && hVal > 0.94 - 0.025 * Math.sin(t + gx * 0.22);
          if (px > 0 && Math.hypot(x - px, y - py) < 64) {
            density = Math.min(1, density + 0.32);
            coreWarmth = Math.max(coreWarmth, 0.75);
          }

          paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rim, hVal, isDark, isSpore);
        }
      }
    }
  );

  // Bab 03 (#sec-10): Volumetric Cross-Glyph Fulcrum & Twin-Canopy Decision Balance (clear behind solid SVG capsules)
  deciderPixelController = createGlyphStage(
    'decider-pixel-shell',
    'decider-pixel-canvas',
    (ctx, w, h, t, px, py, isDark) => {
      ctx.imageSmoothingEnabled = false;
      deciderModeBlend += (deciderModeTarget - deciderModeBlend) * (isMotionAllowed() ? 0.14 : 1);
      const tiltRad = deciderModeBlend * ((14 * Math.PI) / 180);
      const cosA = Math.cos(tiltRad);
      const sinA = Math.sin(tiltRad);
      const pivotX = 240;
      const pivotY = 138;
      const step = 6;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);

      for (let gy = 5; gy < rows - 1; gy++) {
        const y = gy * step + 3;
        if (y < 38) continue;
        for (let gx = 2; gx < cols - 2; gx++) {
          const x = gx * step + 3;
          const hVal = cellHash(gx + 61, gy + 23);
          let density = 0;
          let coreWarmth = 0.08;
          let umbraFold = 0.16;
          let rim = 0;

          // Central Volumetric Fulcrum Peak (y = 138 .. 214)
          if (y >= pivotY - 2 && y <= 214) {
            const vFul = Math.max(0, (y - (pivotY - 2)) / (214 - (pivotY - 2)));
            const halfW = 10 + vFul * 44;
            const dFulX = Math.abs(x - pivotX);
            if (dFulX < halfW) {
              density = Math.max(density, Math.pow(1 - dFulX / halfW, 0.72) * 0.95);
              coreWarmth = Math.max(coreWarmth, (1 - dFulX / halfW) * 0.96);
              umbraFold = Math.max(umbraFold, (dFulX / halfW) * 0.68);
            }
          }

          // Transform into rotated beam coordinates around (pivotX, pivotY)
          const dx = x - pivotX;
          const dy = y - pivotY;
          const u = dx * cosA + dy * sinA;
          const v = -dx * sinA + dy * cosA;

          // Volumetric Balance Horizon Ribbon
          if (Math.abs(u) < 194 && Math.abs(v) < 9) {
            const bDen = (1 - Math.abs(v) / 9) * (1 - Math.abs(u) / 220) * 0.78;
            if (bDen > density) density = bDen;
            if (u <= 0) coreWarmth = Math.max(coreWarmth, 0.78);
          }

          // Left Canopy: Architect Decider (incandescent Amber-Ivory dome crowning the solid Decider capsule)
          const archScale = 1.04 - deciderModeBlend * 0.26;
          const dLeft = Math.hypot((u + 124) / (66 * archScale), (v + 44) / (36 * archScale));
          if (dLeft < 1.05 && v < 2) {
            const lDen = Math.pow(Math.max(0, 1 - dLeft), 0.76) * (0.94 - deciderModeBlend * 0.24);
            if (lDen > density) density = lDen;
            coreWarmth = Math.max(coreWarmth, (1 - dLeft * 0.75) * (0.95 - deciderModeBlend * 0.3));
            umbraFold = Math.max(umbraFold, dLeft * 0.48);
            if (dLeft > 0.76 && hVal > 0.65) rim = 0.28;
          }

          // Right Nebula: AI Proposer Opsi (Mineral Cyan-Sage when curated -> heavy Terracotta cloud when passive)
          const aiScale = 0.86 + deciderModeBlend * 0.34;
          const dRight = Math.hypot((u - 126) / (66 * aiScale), (v + 44) / (36 * aiScale));
          if (dRight < 1.08 && v < 4) {
            const wave = 0.82 + 0.18 * Math.sin(u * 0.09 + t * 1.9);
            const rDen = Math.pow(Math.max(0, 1 - dRight), 0.82) * wave * (0.76 + deciderModeBlend * 0.2);
            if (rDen > density) density = rDen;
            umbraFold = Math.max(umbraFold, deciderModeBlend * 0.85);
            coreWarmth = Math.max(coreWarmth, deciderModeBlend * 0.42);
          }

          const isSpore = y > 42 && y < 214 && (dLeft < 1.28 || dRight < 1.28) && hVal > 0.93;
          if (px > 0 && Math.hypot(x - px, y - py) < 62) {
            density = Math.min(1, density + 0.34);
          }

          paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rim, hVal, isDark, isSpore);
        }
      }
    }
  );

  // Sec 18 (#sec-18): Closing Horizon Volumetric Cross-Glyph Crown
  createGlyphStage(
    'closing-glyph-shell',
    'closing-glyph-canvas',
    (ctx, w, h, t, px, py, isDark) => {
      ctx.imageSmoothingEnabled = false;
      const step = 8;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const cx = w * 0.5;
      const cy = h * 0.92;

      for (let gy = 1; gy < rows - 1; gy++) {
        const y = gy * step + 4;
        for (let gx = 1; gx < cols - 1; gx++) {
          const x = gx * step + 4;
          const dx = (x - cx) / 1.48;
          const dy = y - cy;
          const r = Math.hypot(dx, dy);
          const theta = Math.atan2(dx, -dy);
          const hVal = cellHash(gx + 19, gy + 7);

          const archWave = 192 + 34 * Math.cos(theta * 5 + t * 0.8);
          const isSpore = r < archWave * 1.18 && hVal > 0.935;
          if (r > archWave && !isSpore) continue;

          let density = Math.max(0, 1 - r / archWave) * (0.86 + 0.14 * Math.cos(theta * 12 - r * 0.05 + t));
          const coreWarmth = Math.pow(Math.max(0, 1 - r / 148), 1.25);
          const umbraFold = Math.max(0, 1 - Math.abs(r - 118) / 56) * 0.55;
          const rim = r > archWave * 0.8 && hVal > 0.68 ? 0.26 : 0;

          if (px > 0 && Math.hypot(x - px, y - py) < 84) {
            density = Math.min(1, density + 0.34);
          }

          paintColabGlyphCell(ctx, x, y, gx, gy, step, density, coreWarmth, umbraFold, rim, hVal, isDark, isSpore);
        }
      }
    }
  );

  document.addEventListener('visibilitychange', () => syncAllGlyphStages(false));
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => syncAllGlyphStages(true));
})();
