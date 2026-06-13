
/* ====================================================
   GlobalWork Kenya – Main JavaScript
   ==================================================== */
 
'use strict';
 
// ===== JOB DATA =====
const JOBS = [
  {
    id: 1, title: 'Registered Nurse (ICU)', company: 'Al Razi Medical Center',
    location: 'Dubai, UAE', country: 'UAE', category: 'Healthcare',
    salary: 'KES 280,000 – 350,000/mo', type: 'Full-time', badge: 'hot',
    icon: '🏥', posted: '2 days ago', slots: 12,
  },
  {
    id: 2, title: 'Civil Engineer – Infrastructure', company: 'Saudi Binladin Group',
    location: 'Riyadh, Saudi Arabia', country: 'Saudi Arabia', category: 'Construction',
    salary: 'KES 320,000 – 420,000/mo', type: 'Contract', badge: 'featured',
    icon: '🏗️', posted: '1 day ago', slots: 5,
  },
  {
    id: 3, title: 'Executive Chef', company: 'Marriott Doha',
    location: 'Doha, Qatar', country: 'Qatar', category: 'Hospitality',
    salary: 'KES 260,000 – 310,000/mo', type: 'Full-time', badge: 'new',
    icon: '🍽️', posted: '3 days ago', slots: 2,
  },
  {
    id: 4, title: 'Software Engineer (React / Node)', company: 'TechHub London',
    location: 'London, United Kingdom', country: 'United Kingdom', category: 'IT',
    salary: 'KES 550,000 – 700,000/mo', type: 'Full-time', badge: 'hot',
    icon: '💻', posted: 'Today', slots: 3,
  },
  {
    id: 5, title: 'House Manager / Nanny', company: 'Private Household',
    location: 'Kuwait City, Kuwait', country: 'Kuwait', category: 'Domestic',
    salary: 'KES 95,000 – 130,000/mo', type: 'Live-in', badge: 'new',
    icon: '🏡', posted: '5 days ago', slots: 8,
  },
  {
    id: 6, title: 'Secondary School Teacher (Science)', company: 'British School Berlin',
    location: 'Berlin, Germany', country: 'Germany', category: 'Education',
    salary: 'KES 380,000 – 450,000/mo', type: 'Full-time', badge: 'featured',
    icon: '📚', posted: '4 days ago', slots: 4,
  },
  {
    id: 7, title: 'Logistics Coordinator', company: 'DP World',
    location: 'Dubai, UAE', country: 'UAE', category: 'Logistics',
    salary: 'KES 200,000 – 260,000/mo', type: 'Full-time', badge: 'new',
    icon: '🚢', posted: '6 days ago', slots: 7,
  },
  {
    id: 8, title: 'Financial Analyst', company: 'Standard Chartered Bank',
    location: 'Singapore', country: 'Singapore', category: 'Finance',
    salary: 'KES 490,000 – 600,000/mo', type: 'Full-time', badge: 'featured',
    icon: '📊', posted: '1 week ago', slots: 2,
  },
  {
    id: 9, title: 'Welding Supervisor', company: 'Qatar Petroleum Projects',
    location: 'Ras Laffan, Qatar', country: 'Qatar', category: 'Construction',
    salary: 'KES 230,000 – 290,000/mo', type: 'Contract', badge: 'hot',
    icon: '🔧', posted: '2 days ago', slots: 15,
  },
];
 
// ===== RENDER JOBS =====
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
 
  // Re-observe new cards
  observeReveal();
}
 
// ===== JOB SEARCH & FILTER =====
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
 
// Category cards filter
document.querySelectorAll('.cat-card').forEach(card => {
  card.addEventListener('click', () => {
    const cat = card.dataset.category;
    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) catFilter.value = cat;
    filterJobs();
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
 
// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) navbar?.classList.add('scrolled');
  else navbar?.classList.remove('scrolled');
 
  // Back to top
  const btn = document.getElementById('backTop');
  if (window.scrollY > 400) btn?.classList.add('visible');
  else btn?.classList.remove('visible');
}, { passive: true });
 
// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});
// Close on link click
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
 
// ===== BACK TO TOP =====
document.getElementById('backTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
 
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
 
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
 
// Observe hero counter
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
 
// Add reveal class to sections
function addRevealClasses() {
  const selectors = ['.cat-card', '.step-card', '.testi-card', '.emp-stat-card', '.contact-item'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${i * 0.07}s`;
    });
  });
}
 
// ===== FILE DROP ZONE =====
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
    label.innerHTML = `<i class="fas fa-file-check" style="color:var(--blue)"></i> <strong style="color:var(--navy)">${file.name}</strong> selected ✓`;
    drop.style.borderColor = 'var(--blue)';
  }
}
 
// ===== CV FORM SUBMIT =====
document.getElementById('cvForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const btn = document.getElementById('submitCvBtn');
  const success = document.getElementById('cvSuccess');
 
  // Basic validation
  const fname = document.getElementById('fname')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
 
  if (!fname || !phone || !email) {
    alert('Please fill in all required fields.');
    return;
  }
 
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
 
  // Simulate async submit
  setTimeout(() => {
    btn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
    btn.style.background = '#0a7c4e';
    success?.classList.remove('hidden');
    this.reset();
    document.getElementById('fileLabel').innerHTML = 'Drag & drop your CV or <strong>click to browse</strong>';
  }, 1800);
});
 
// ===== CONTACT FORM SUBMIT =====
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
  renderJobs(JOBS);
  addRevealClasses();
  observeReveal();
  initFileDrop();
});
