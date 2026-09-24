(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.querySelector('.scroll-progress span');
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobileMenu');
  const allNavLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-menu a')];
  const desktopLinks = [...document.querySelectorAll('.desktop-nav a')];
  const sections = [...document.querySelectorAll('main section[id]')];
  const revealEls = [...document.querySelectorAll('.reveal')];
  const rail = document.querySelector('[data-rail]');
  const railFooter = document.querySelector('[data-rail-footer]');
  const railHint = document.querySelector('[data-rail-hint]');
  const railControls = document.querySelector('[data-rail-controls]');
  const prev = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');
  const bookingForm = document.querySelector('#bookingForm');
  const feedback = document.querySelector('#formFeedback');
  const copyBooking = document.querySelector('#copyBooking');
  const dateInput = document.querySelector('input[name="date"]');
  const timeInput = document.querySelector('input[name="time"]');
  const durationInput = document.querySelector('select[name="duration"]');
  const serviceInput = document.querySelector('select[name="service"]');
  const year = document.querySelector('#year');

  const SADEL_CONFIG = {
    // Isi dengan nomor bisnis SADEL tanpa +, spasi, atau tanda baca.
    // Contoh format: 628xxxxxxxxxx
    whatsappNumber: ''
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function updateProgress() {
    if (!progress) return;
    const max = root.scrollHeight - window.innerHeight;
    const pct = max > 0 ? clamp((window.scrollY / max) * 100, 0, 100) : 0;
    progress.style.width = `${pct}%`;
  }

  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateProgress();
      header?.classList.toggle('scrolled', window.scrollY > 8);
      scrollTicking = false;
    });
  }, { passive: true });
  updateProgress();

  function closeMobileMenu() {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Buka menu');
    mobileMenu.hidden = true;
  }

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.classList.toggle('open', !open);
    menuToggle.setAttribute('aria-expanded', String(!open));
    menuToggle.setAttribute('aria-label', open ? 'Buka menu' : 'Tutup menu');
    mobileMenu.hidden = open;
  });

  allNavLinks.forEach(link => link.addEventListener('click', closeMobileMenu));

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));

    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        desktopLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      });
    }, { rootMargin: '-42% 0px -48% 0px', threshold: 0 });
    sections.forEach(section => navObserver.observe(section));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  if (dateInput) {
    const now = new Date();
    const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    dateInput.min = iso;
  }

  function updateRailControls() {
    if (!rail || !railFooter) return;
    const overflow = rail.scrollWidth > rail.clientWidth + 4;
    railFooter.hidden = !overflow;
    if (!overflow) return;
    const max = rail.scrollWidth - rail.clientWidth;
    if (prev) prev.disabled = rail.scrollLeft <= 4;
    if (next) next.disabled = rail.scrollLeft >= max - 4;
    if (railHint) railHint.textContent = 'Geser untuk melihat pilihan lainnya';
  }

  if (rail) {
    const moveRail = direction => {
      const distance = Math.max(rail.clientWidth * 0.86, 300);
      rail.scrollBy({ left: direction * distance, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    prev?.addEventListener('click', () => moveRail(-1));
    next?.addEventListener('click', () => moveRail(1));
    rail.addEventListener('scroll', updateRailControls, { passive: true });
    window.addEventListener('resize', updateRailControls);
    updateRailControls();
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  function buildMessage() {
    const data = new FormData(bookingForm);
    const name = String(data.get('name') || '').trim();
    const date = String(data.get('date') || '');
    const time = String(data.get('time') || '');
    const service = String(data.get('service') || '');
    const duration = Number(data.get('duration') || 0);
    const players = String(data.get('players') || '');
    const contact = String(data.get('contact') || '').trim();
    const notes = String(data.get('notes') || '').trim();

    return {
      name,
      date,
      time,
      service,
      duration,
      players,
      contact,
      notes,
      message: [
        'Halo SADEL, saya ingin booking sesi padel.',
        `Nama: ${name}`,
        `Tanggal: ${formatDate(date)}`,
        `Waktu mulai: ${time || '-'}`,
        `Sesi: ${service || '-'}`,
        `Durasi: ${duration ? `${duration} menit` : '-'}`,
        `Pemain: ${players || '-'}`,
        `Kontak: ${contact || '-'}`,
        `Catatan: ${notes || '-'}`
      ].join('\n')
    };
  }

  function validateBooking(payload) {
    if (!bookingForm || !bookingForm.checkValidity()) {
      bookingForm?.reportValidity();
      return 'Lengkapi semua field yang wajib diisi terlebih dahulu.';
    }

    if (!payload.time || !payload.duration) return 'Pilih waktu dan durasi sesi.';
    const [hours, minutes] = payload.time.split(':').map(Number);
    const start = hours * 60 + minutes;
    const close = 23 * 60;
    if (start + payload.duration > close) {
      return 'Durasi melewati jam tutup 23.00. Pilih waktu mulai yang lebih awal.';
    }
    return '';
  }

  function openWhatsApp(message) {
    const number = SADEL_CONFIG.whatsappNumber.replace(/\D/g, '');
    const url = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  bookingForm?.addEventListener('submit', event => {
    event.preventDefault();
    const payload = buildMessage();
    const error = validateBooking(payload);
    if (error) {
      feedback.textContent = error;
      return;
    }

    openWhatsApp(payload.message);
    feedback.textContent = SADEL_CONFIG.whatsappNumber
      ? 'WhatsApp SADEL dibuka dengan detail booking Anda.'
      : 'WhatsApp dibuka dengan detail booking Anda. Masukkan nomor SADEL di konfigurasi untuk membuat link langsung ke bisnis.';
  });

  copyBooking?.addEventListener('click', async () => {
    const payload = buildMessage();
    const error = validateBooking(payload);
    if (error) {
      feedback.textContent = error;
      return;
    }
    try {
      await navigator.clipboard.writeText(payload.message);
      feedback.textContent = 'Detail booking sudah disalin.';
    } catch {
      feedback.textContent = 'Detail siap dikirim. Clipboard browser tidak tersedia.';
    }
  });

  document.querySelectorAll('[data-booking-service]').forEach(link => {
    link.addEventListener('click', () => {
      const service = link.getAttribute('data-booking-service');
      if (serviceInput && service) serviceInput.value = service;
    });
  });

  [dateInput, timeInput, durationInput, serviceInput].forEach(control => {
    control?.addEventListener('change', () => {
      if (feedback) feedback.textContent = '';
    });
  });

  if (year) year.textContent = String(new Date().getFullYear());
})();
