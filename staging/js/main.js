/* ─────────────────────────────────────────
   Artios Stays — Main JS
   ───────────────────────────────────────── */

// ── Reduced motion ── respected before anything else runs: flags the
// document so CSS can neutralize scroll animations/parallax, and starts
// the hero video paused for anyone who's asked their OS to limit motion.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) document.documentElement.classList.add('reduce-motion');

// ── Scroll progress bar ──
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.prepend(progressBar);

// ── Nav scroll state ──
const navbar = document.getElementById('navbar');
const scrollThreshold = 60;

function updateNav() {
  navbar.classList.toggle('scrolled', window.scrollY > scrollThreshold);
}

// ── Parallax refs ──
const heroImg  = document.querySelector('.hero__img');
const ctaImg   = document.querySelector('.cta-banner__img');

function updateParallax() {
  if (prefersReducedMotion) return;
  const sy = window.scrollY;

  if (heroImg && sy < window.innerHeight * 1.2) {
    heroImg.style.transform = `translateY(${sy * 0.25}px)`;
  }

  if (ctaImg) {
    const rect = ctaImg.closest('.cta-banner')?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
      const offset = (window.innerHeight / 2 - rect.top) * 0.12;
      ctaImg.style.transform = `translateY(${offset}px)`;
    }
  }
}

// ── Hero video — always attempted on desktop; on mobile, only when the
// connection looks good enough not to feel like a bait-and-switch on
// someone's data plan. There's no `autoplay` attribute and the <video>
// has `preload="none"`, so visibility and the decision to actually fetch
// the file are the same gate here: nothing downloads at all unless this
// code decides to and calls .play() itself.
//
// "Good enough" is inferred from the Network Information API
// (navigator.connection), which cannot distinguish Wi-Fi from cellular
// in most browsers that support it at all — `effectiveType` is a speed
// estimate, not a network type. It also doesn't exist in Safari/iOS,
// full stop, so those visitors always get the static poster — the same
// safe fallback they'd have gotten anyway. ──
const heroVideoFwd    = document.querySelector('.hero__video--forward');
const heroVideoRev    = document.querySelector('.hero__video--reverse');
const heroVideoToggle = document.getElementById('heroVideoToggle');
const heroSection     = document.getElementById('hero');

function shouldTryHeroVideo() {
  if (prefersReducedMotion) return false;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (!isMobile) return true;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return !!(conn && !conn.saveData && conn.effectiveType === '4g');
}

if (heroVideoFwd && heroVideoRev && heroVideoToggle && heroSection) {
  // Boomerang loop: hero-pool-reverse.mp4 is a true frame-by-frame reverse
  // of hero-pool.mp4 (ffmpeg -vf reverse), so its first frame is
  // pixel-identical to the forward clip's last frame and vice versa.
  // Swapping which element is .is-active the instant one `ended`s — rather
  // than looping either one — is what turns the old hard-cut-to-start loop
  // into a smooth forward → reverse → forward cycle.
  let activeVideo = heroVideoFwd;

  const setToggleState = paused => {
    heroVideoToggle.classList.toggle('is-paused', paused);
    heroVideoToggle.setAttribute('aria-pressed', String(paused));
    heroVideoToggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
  };
  const syncKenBurns = paused => {
    const state = paused ? 'paused' : 'running';
    heroVideoFwd.style.animationPlayState = state;
    heroVideoRev.style.animationPlayState = state;
  };

  // The button's icon must reflect *actual* playback state, not just the
  // things this script itself does — a browser can silently refuse to
  // autoplay (Safari's autoplay/Low Power Mode policies, e.g.) with no
  // error to catch, which used to leave the button showing "pause" (as if
  // playing) while the video sat frozen with no visible way to start it.
  // Also keeps the CSS Ken Burns zoom (see style.css) in lockstep — no
  // point "pausing" the video while a zoom keeps silently animating.
  // Both videos get these listeners, but only react when they're the one
  // currently on screen — the inactive one is buffering silently underneath.
  [heroVideoFwd, heroVideoRev].forEach(v => {
    v.addEventListener('play',  () => { if (v === activeVideo) { setToggleState(false); syncKenBurns(false); } });
    v.addEventListener('pause', () => { if (v === activeVideo) { setToggleState(true);  syncKenBurns(true);  } });
  });

  function swapAndPlay(finished) {
    const next = finished === heroVideoFwd ? heroVideoRev : heroVideoFwd;
    finished.classList.remove('is-active');
    next.classList.add('is-active');
    activeVideo = next;
    next.currentTime = 0;
    next.play().catch(() => setToggleState(true));
  }
  heroVideoFwd.addEventListener('ended', () => swapAndPlay(heroVideoFwd));
  heroVideoRev.addEventListener('ended', () => swapAndPlay(heroVideoRev));

  if (shouldTryHeroVideo()) {
    heroSection.classList.add('video-active');
    heroVideoFwd.classList.add('is-active');
    // Calling .play() ourselves (rather than relying on an `autoplay`
    // attribute we deliberately removed) is what actually triggers the
    // fetch now, and catching the rejection is what lets us detect a
    // block instead of assuming success.
    heroVideoFwd.play().catch(() => setToggleState(true));
    // Start fetching the reverse clip in parallel with the forward one
    // playing, so it's fully buffered and ready to swap in the instant
    // the forward clip ends — not starting a fresh fetch at that point.
    heroVideoRev.preload = 'auto';
    heroVideoRev.load();
  }
  // If shouldTryHeroVideo() was false, .video-active is never added, so
  // both .hero__video elements and the toggle stay display:none (CSS
  // default) and the static poster <img> is all that renders — no
  // request for either video file is ever made.

  heroVideoToggle.addEventListener('click', () => {
    if (activeVideo.paused) activeVideo.play().catch(() => {});
    else activeVideo.pause();
  });
}

// ── Combined scroll handler ──
window.addEventListener('scroll', () => {
  updateNav();
  updateParallax();

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = scrollable > 0
    ? (window.scrollY / scrollable * 100) + '%'
    : '0%';
}, { passive: true });

updateNav();
updateParallax();

// ── Mobile hamburger ──
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ── Scroll-in animations ──
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('visible'), delay);
      observer.unobserve(el);
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

// ── Stagger children observer ──
const staggerObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      Array.from(entry.target.children).forEach((child, i) => {
        setTimeout(() => child.classList.add('visible'), i * 120);
      });
      staggerObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('[data-stagger]').forEach(el => staggerObserver.observe(el));

// ── Hero stat counter animation ──
function animateCounter(el) {
  const raw    = el.textContent.trim();
  const suffix = raw.replace(/[\d.]/g, '');
  const target = parseFloat(raw.replace(/[^\d.]/g, ''));
  if (isNaN(target) || target === 0) return;

  const duration = 1600;
  const start    = performance.now();

  function tick(now) {
    const t      = Math.min((now - start) / duration, 1);
    const eased  = 1 - Math.pow(1 - t, 3);
    const value  = target * eased;
    el.textContent = (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// Works for the hero stats bar and any standalone .stat-band sections —
// each one animates its own numbers once, the first time it's scrolled into view.
document.querySelectorAll('.hero__stats, .stat-band').forEach(section => {
  let countersStarted = false;
  const statsObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || countersStarted) return;
      countersStarted = true;
      section.querySelectorAll('.hero__stat-num, .stat-band__num').forEach(animateCounter);
      statsObserver.disconnect();
    },
    { threshold: 0.5 }
  );
  statsObserver.observe(section);
});

// ── Button ripple ──
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const rect   = this.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'btn__ripple';
    ripple.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${e.clientX - rect.left - size / 2}px`,
      `top:${e.clientY - rect.top - size / 2}px`,
    ].join(';');
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

// ── Testimonial carousel ──
const track    = document.getElementById('testimonialTrack');
const cards    = track ? Array.from(track.children) : [];
const dotsWrap = document.getElementById('testimonialDots');
const prevBtn  = document.getElementById('prevBtn');
const nextBtn  = document.getElementById('nextBtn');

if (track && cards.length) {
  let current       = 0;
  let visibleCount  = getVisibleCount();
  let autoplayTimer = null;

  function getVisibleCount() {
    if (window.innerWidth < 700)  return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }

  const totalPages = () => Math.max(1, cards.length - visibleCount + 1);

  function buildDots() {
    dotsWrap.innerHTML = '';
    const pages = totalPages();
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('button');
      dot.className = 'testimonials__dot' + (i === current ? ' active' : '');
      dot.setAttribute('aria-label', `Go to review ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function goTo(idx) {
    const pages = totalPages();
    current = ((idx % pages) + pages) % pages;

    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap       = 24;
    track.style.transform = `translateX(-${current * (cardWidth + gap)}px)`;

    dotsWrap.querySelectorAll('.testimonials__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
    });
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn.addEventListener('click', () => { resetAutoplay(); prev(); });
  nextBtn.addEventListener('click', () => { resetAutoplay(); next(); });

  function startAutoplay()  { autoplayTimer = setInterval(next, 5000); }
  function resetAutoplay()  { clearInterval(autoplayTimer); startAutoplay(); }

  // Swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { resetAutoplay(); diff > 0 ? next() : prev(); }
  });

  // Keyboard support
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { resetAutoplay(); prev(); }
    if (e.key === 'ArrowRight') { resetAutoplay(); next(); }
  });

  function init() {
    visibleCount = getVisibleCount();
    current = Math.min(current, totalPages() - 1);
    buildDots();
    goTo(current);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  init();
  startAutoplay();
}

// ── Owner lead form → WhatsApp (static site, no backend: we build the
//    message client-side and hand off to WhatsApp instead of "submitting" it) ──
const leadForm = document.getElementById('leadForm');
if (leadForm) {
  leadForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(leadForm).entries());
    const lines = [
      `Hi, I'd like to partner my property with Artios Stays.`,
      data.name && `Name: ${data.name}`,
      data.phone && `WhatsApp: ${data.phone}`,
      data.email && `Email: ${data.email}`,
      data.location && `Property location: ${data.location}`,
      data.type && `Property type: ${data.type}`,
      data.rooms && `Rooms: ${data.rooms}`,
      data.status && `Current listing status: ${data.status}`,
      data.message && `Message: ${data.message}`,
    ].filter(Boolean);
    const url = `https://wa.me/917709589459?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
}

// ── General contact form → email (contact.html). Unlike the partner lead
//    form, this one hands off to the visitor's own email client via a
//    mailto: link — matches the page's own copy, which leads with "Email
//    Us" as the primary channel. Still no backend involved. ──
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(contactForm).entries());
    const subject = data.subject ? data.subject : `Message from ${data.name || 'the website'}`;
    const body = [
      data.message,
      '',
      `— ${data.name || ''}`,
      data.email || '',
    ].join('\n');
    const url = `mailto:stayartios@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  });
}

// ── Smooth anchor offset (accounts for fixed nav) ──
// Also what powers the Goa/Sri Lanka filter-tab links on villas.html —
// they're plain #id anchors, not a JS filter, so no dedicated handler is
// needed for them beyond this generic one.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = navbar.getBoundingClientRect().height;
    const top  = target.getBoundingClientRect().top + window.scrollY - navH - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Villa detail page — photo gallery carousel ──
// Plain translateX strip, no library. Runs on any .villa-gallery on the
// page (villas/<slug>.html); does nothing elsewhere.
document.querySelectorAll('.villa-gallery').forEach(gallery => {
  const track  = gallery.querySelector('.villa-gallery__track');
  const slides = Array.from(track.children);
  const prevBtn = gallery.querySelector('.villa-gallery__btn--prev');
  const nextBtn = gallery.querySelector('.villa-gallery__btn--next');
  const dotsWrap = gallery.querySelector('.villa-gallery__dots');
  const counter = gallery.querySelector('.villa-gallery__counter');
  if (slides.length < 2) { if (prevBtn) prevBtn.hidden = true; if (nextBtn) nextBtn.hidden = true; return; }

  let index = 0;
  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'villa-gallery__dot';
    dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle('active', di === index));
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  }
  prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn.addEventListener('click', () => goTo(index + 1));

  // Swipe support, via Pointer Events + setPointerCapture rather than raw
  // touch events. Two earlier touch-event attempts (touchend-only, then a
  // touchmove-driven version with conditional preventDefault) both worked
  // in every synthetic test here but still broke after the first swipe on
  // a real phone — consistent with a well-known class of touch-event bug
  // where the browser's own early scroll-vs-gesture decision for a touch
  // can't be overridden by a *later* preventDefault() in the same
  // gesture, so timing that isn't visible to synthetic dispatch decides
  // whether it works. Pointer Events sidestep that: setPointerCapture()
  // makes the browser route every move/up for *this specific interaction*
  // to this element no matter what, which is the guarantee raw touch
  // events don't give.
  let dragId = null, startX = 0, dragging = false, dx = 0;

  track.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return; // don't hijack desktop click/hover
    if (dragId !== null) return;
    // Drag tracking itself must not depend on this succeeding — some
    // browsers' pointer-capture support is patchy enough to throw here,
    // and an uncaught throw before `dragging = true` below would silently
    // kill the whole gesture with nothing visibly wrong. Capture is a
    // nice-to-have (keeps the drag tracking even if the finger leaves the
    // element); plain bubbled events still work without it.
    try { track.setPointerCapture(e.pointerId); } catch (err) {}
    dragId = e.pointerId;
    startX = e.clientX;
    dragging = true;
    dx = 0;
    track.style.transition = 'none';
  });

  track.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== dragId) return;
    dx = e.clientX - startX;
    track.style.transform = `translateX(calc(-${index * 100}% + ${dx}px))`;
  });

  function endDrag(e) {
    if (!dragging || (e.pointerId !== undefined && e.pointerId !== dragId)) return;
    dragging = false;
    try { if (dragId !== null && track.hasPointerCapture(dragId)) track.releasePointerCapture(dragId); } catch (err) {}
    dragId = null;
    track.style.transition = '';
    if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
    else goTo(index); // snap back to the current slide
    dx = 0;
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  goTo(0);
});
