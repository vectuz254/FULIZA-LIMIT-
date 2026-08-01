/* ====================================================
   TOPJOBSEEKERS – Main JavaScript (Supabase-wired)
   ==================================================== */

'use strict';

let JOBS = []; // filled from Supabase on load

const COUNTRY_LIST = [
  { flag: '🇦🇪', name: 'UAE' }, { flag: '🇶🇦', name: 'Qatar' },
  { flag: '🇸🇦', name: 'Saudi Arabia' }, { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany' }, { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇸🇬', name: 'Singapore' }, { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇰🇼', name: 'Kuwait' }, { flag: '🇧🇭', name: 'Bahrain' },
  { flag: '🇳🇱', name: 'Netherlands' }, { flag: '🇯🇵', name: 'Japan' },
];

// ===== MARQUEE (flag glued to country name, duplicated for seamless loop) =====
function renderMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const items = COUNTRY_LIST.map(c => `<span>${c.flag} ${c.name}</span>`).join('');
  track.innerHTML = items + items; // duplicate once for the infinite scroll illusion
}

// ===== PROFESSION SHOWCASE (real, free-license photos via Pexels API) =====
// Pexels photos are free for commercial use with no attribution required —
// this pulls a real, diverse photo for each profession every time the page
// loads, so you never have to manually source or license images yourself.
const SHOWCASE_QUERIES = [
  { title: 'Registered Nurse', query: 'black nurse hospital', flag: '🇦🇪' },
  { title: 'Civil Engineer', query: 'black civil engineer construction site', flag: '🇸🇦' },
  { title: 'Executive Chef', query: 'black chef restaurant kitchen', flag: '🇶🇦' },
  { title: 'Software Developer', query: 'black software developer office laptop', flag: '🇬🇧' },
  { title: 'Teacher', query: 'black teacher classroom', flag: '🇩🇪' },
  { title: 'Logistics Coordinator', query: 'black warehouse logistics worker', flag: '🇦🇪' },
  { title: 'Hospitality Staff', query: 'black hotel receptionist smiling', flag: '🇶🇦' },
  { title: 'Financial Analyst', query: 'black business professional office meeting', flag: '🇸🇬' },
];

async function fetchPexelsPhoto(query, orientation = 'square') {
  if (!PEXELS_API_KEY || PEXELS_API_KEY.includes('YOUR-PEXELS')) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.photos && data.photos[0] ? data.photos[0] : null;
  } catch (err) {
    console.error('Pexels fetch failed:', err);
    return null;
  }
}

async function loadShowcase() {
  const track = document.getElementById('showcaseTrack');
  if (!track) return;

  track.innerHTML = `<div class="showcase-loading"><i class="fas fa-spinner fa-spin"></i> Loading photos...</div>`;

  const results = await Promise.all(
    SHOWCASE_QUERIES.map(async (item) => {
      const photo = await fetchPexelsPhoto(item.query, 'square');
      return {
        ...item,
        photo_url: photo ? photo.src.medium : null,
        credit: photo ? photo.photographer : null,
      };
    })
  );

  const valid = results.filter(r => r.photo_url);
  if (valid.length === 0) {
    track.innerHTML = `<div class="showcase-loading">Add a free Pexels API key in supabase-config.js to show live photos here.</div>`;
    return;
  }

  const cards = valid.map(p => `
    <div class="showcase-card">
      <img src="${p.photo_url}" alt="${p.title}" loading="lazy" />
      <div class="showcase-caption">
        <span>${p.title}</span>
        ${p.flag ? `<span class="showcase-flag">${p.flag}</span>` : ''}
      </div>
    </div>
  `).join('');

  track.innerHTML = cards + cards; // duplicate for seamless infinite scroll
}

// ===== BIG STATIC HERO PHOTO =====
async function loadHeroPhoto() {
  const img = document.getElementById('heroPhoto');
  if (!img) return;
  const photo = await fetchPexelsPhoto('confident black professional smiling office portrait', 'portrait');
  if (photo) {
    img.src = photo.src.large2x || photo.src.large;
    img.alt = 'Kenyan professional placed abroad';
    document.getElementById('heroPhotoWrap')?.classList.add('loaded');
  }
}

// ===== JOBS: load from Supabase =====
async function loadJobs() {
  const { data, error } = await supabaseClient
    .from('jobs')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load jobs:', error.message);
    JOBS = [];
  } else {
    JOBS = data.map(j => ({
      id: j.id, title: j.title, company: j.company, location: j.location,
      country: j.country, category: j.category, salary: j.salary,
      type: j.job_type, badge: j.badge, icon: j.icon,
      posted: timeAgo(j.created_at), slots: j.slots,
    }));
  }
  renderJobs(JOBS);
}

// ===== JOBS: live auto-refresh =====
// Any INSERT/UPDATE/DELETE on the 'jobs' table (including rows written by the
// sync-external-jobs Edge Function) pushes here instantly via Supabase Realtime,
// so the grid updates itself with no page reload. Falls back to a 5-min poll
// in case a Realtime event is ever missed.
function subscribeJobsLive() {
  supabaseClient
    .channel('jobs-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
      loadJobs();
    })
    .subscribe();

  setInterval(loadJobs, 5 * 60 * 1000);
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

function renderJobs(jobs) {
  const grid = document.getElementById('jobsGrid');
  if (!grid) return;

  if (jobs.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">
        <i class="fas fa-search" style="font-size:40px;color:var(--border);display:block;margin-bottom:16px;"></i>
        <strong style="display:block;font-size:18px;color:var(--navy);margin-bottom:8px;">No jobs found</strong>
        <p>Try a different keyword or destination.</p>
      </div>`;
    return;
  }

  grid.innerHTML = jobs.map(j => `
    <div class="job-card reveal" data-category="${j.category}" data-country="${j.country}">
      <div class="job-header">
        <div class="job-logo">${j.icon}</div>
        <span class="job-badge badge-${j.badge}">${j.badge.toUpperCase()}</span>
      </div>
      <div class="job-title">${j.title}</div>
      <div class="job-company"><i class="fas fa-building" style="color:var(--blue);margin-right:5px;"></i>${j.company}</div>
      <div class="job-meta">
        <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${j.location}</span>
        <span class="job-tag"><i class="fas fa-briefcase"></i>${j.type}</span>
        <span class="job-tag"><i class="fas fa-users"></i>${j.slots} slot${j.slots > 1 ? 's' : ''}</span>
      </div>
      <div class="job-salary">${j.salary}</div>
      <div class="job-footer">
        <span class="job-date"><i class="fas fa-clock" style="margin-right:4px;"></i>${j.posted}</span>
        <a href="#cv-upload" class="btn btn-primary btn-apply">Apply Now</a>
      </div>
    </div>
  `).join('');

  observeReveal();
}

function filterJobs() {
  const keyword = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const location = document.getElementById('locationFilter')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';

  const filtered = JOBS.filter(j => {
    const matchKw = !keyword || j.title.toLowerCase().includes(keyword) || j.company.toLowerCase().includes(keyword) || j.category.toLowerCase().includes(keyword);
    const matchLoc = !location || j.country === location || j.location.includes(location);
    const matchCat = !category || j.category === category;
    return matchKw && matchLoc && matchCat;
  });

  renderJobs(filtered);
}

document.getElementById('searchBtn')?.addEventListener('click', filterJobs);
document.getElementById('searchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') filterJobs(); });
document.getElementById('locationFilter')?.addEventListener('change', filterJobs);
document.getElementById('categoryFilter')?.addEventListener('change', filterJobs);

document.querySelectorAll('.cat-card').forEach(card => {
  card.addEventListener('click', () => {
    const cat = card.dataset.category;
    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) catFilter.value = cat;
    filterJobs();
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ===== TESTIMONIALS: load from Supabase =====
async function loadTestimonials() {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from('testimonials')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (error || !data) { grid.innerHTML = ''; return; }

  grid.innerHTML = data.map(t => `
    <div class="testi-card reveal ${t.featured ? 'featured' : ''}">
      <div class="testi-quote"><i class="fas fa-quote-left"></i></div>
      <p>"${t.quote}"</p>
      <div class="testi-author">
        <div class="testi-avatar" style="background:${t.avatar_color}">${t.avatar_initials}</div>
        <div>
          <strong>${t.name}</strong>
          <span>${t.role_title} ${t.country_flag || ''}</span>
        </div>
      </div>
    </div>
  `).join('');

  observeReveal();
}

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) navbar?.classList.add('scrolled');
  else navbar?.classList.remove('scrolled');

  const btn = document.getElementById('backTop');
  if (window.scrollY > 400) btn?.classList.add('visible');
  else btn?.classList.remove('visible');
}, { passive: true });

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ===== BACK TO TOP =====
document.getElementById('backTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== COUNTER ANIMATION =====
function animateCounters() {
  document.querySelectorAll('.trust-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

// ===== SCROLL REVEAL =====
function observeReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal:not(.in-view)').forEach(el => observer.observe(el));
}

let counterFired = false;
const heroObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !counterFired) {
      counterFired = true;
      animateCounters();
    }
  });
}, { threshold: 0.4 });
const heroSection = document.querySelector('.hero');
if (heroSection) heroObserver.observe(heroSection);

function addRevealClasses() {
  const selectors = ['.cat-card', '.step-card', '.emp-stat-card', '.contact-item'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${i * 0.07}s`;
    });
  });
}

// ===== FILE DROP ZONE =====
let selectedCvFile = null;

function initFileDrop() {
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('cvFile');
  const label = document.getElementById('fileLabel');
  if (!drop || !input) return;

  drop.addEventListener('click', () => input.click());

  drop.addEventListener('dragover', e => {
    e.preventDefault();
    drop.style.borderColor = 'var(--blue)';
    drop.style.background = 'var(--blue-light)';
  });

  drop.addEventListener('dragleave', () => {
    drop.style.borderColor = '';
    drop.style.background = '';
  });

  drop.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
    drop.style.borderColor = '';
    drop.style.background = '';
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  function handleFile(file) {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('File is too large. Please upload a CV under 8MB.');
      return;
    }
    selectedCvFile = file;
    label.innerHTML = `<i class="fas fa-file-check" style="color:var(--blue)"></i> <strong style="color:var(--navy)">${file.name}</strong> selected ✓`;
    drop.style.borderColor = 'var(--blue)';
  }
}

// ===== CV FORM SUBMIT → Supabase Storage + Table =====
document.getElementById('cvForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('submitCvBtn');
  const success = document.getElementById('cvSuccess');
  const errorBox = document.getElementById('cvError');
  const errorText = document.getElementById('cvErrorText');
  errorBox?.classList.add('hidden');

  const fname = document.getElementById('fname')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const destination = document.getElementById('destination')?.value || null;
  const jobCat = document.getElementById('jobCat')?.value || null;
  const intro = document.getElementById('intro')?.value.trim() || null;

  if (!fname || !phone || !email) {
    alert('Please fill in all required fields.');
    return;
  }
  if (!selectedCvFile) {
    alert('Please attach your CV (PDF or Word document).');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // 1. get logged-in user, if any (so job seekers can track status later)
    const { data: { user } } = await supabaseClient.auth.getUser();
    const folder = user ? user.id : 'anon';
    const safeName = selectedCvFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${folder}/${Date.now()}-${safeName}`;

    // 2. upload the file to the 'cvs' storage bucket
    const { error: uploadError } = await supabaseClient
      .storage.from('cvs')
      .upload(filePath, selectedCvFile);

    if (uploadError) throw uploadError;

    // 3. insert the submission row (this triggers the email notification webhook)
    const { error: insertError } = await supabaseClient
      .from('cv_submissions')
      .insert({
        user_id: user ? user.id : null,
        full_name: fname, phone, email,
        destination, job_category: jobCat, intro,
        cv_file_path: filePath,
      });

    if (insertError) throw insertError;

    btn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
    btn.style.background = '#0a7c4e';
    success?.classList.remove('hidden');
    this.reset();
    selectedCvFile = null;
    document.getElementById('fileLabel').innerHTML = 'Drag & drop your CV or <strong>click to browse</strong>';
  } catch (err) {
    console.error(err);
    errorText.textContent = err.message || 'Something went wrong. Please try again.';
    errorBox?.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit My CV';
  }
});

// ===== CONTACT FORM SUBMIT (kept simulated — hook up to a 'contact_messages' table the same way if needed) =====
document.getElementById('contactForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const btn = document.getElementById('contactSubmitBtn');
  const success = document.getElementById('contactSuccess');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  setTimeout(() => {
    btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
    btn.style.background = '#0a7c4e';
    success?.classList.remove('hidden');
    this.reset();
  }, 1600);
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderMarquee();
  loadHeroPhoto();
  loadShowcase();
  loadJobs();
  subscribeJobsLive();
  loadTestimonials();
  addRevealClasses();
  observeReveal();
  initFileDrop();
});
