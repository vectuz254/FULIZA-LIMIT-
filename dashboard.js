'use strict';

const dashBody = document.getElementById('dashBody');
const rolePill = document.getElementById('rolePill');

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

function statusPill(status) {
  return `<span class="status-pill status-${status}">${status}</span>`;
}

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    dashBody.innerHTML = `<div class="empty-state">Could not load your profile. Please try logging in again.</div>`;
    return;
  }

  rolePill.textContent = profile.role.replace('_', ' ');

  if (profile.role === 'job_seeker') renderJobSeekerView(session.user.id, profile);
  else if (profile.role === 'employer') renderEmployerView(profile);
  else if (profile.role === 'admin') renderAdminView(profile);
}

// ===================== JOB SEEKER VIEW =====================
async function renderJobSeekerView(userId, profile) {
  const { data, error } = await supabaseClient
    .from('cv_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const rows = (!error && data && data.length)
    ? data.map(s => `
        <tr>
          <td>${new Date(s.created_at).toLocaleDateString()}</td>
          <td>${s.job_category || '—'}</td>
          <td>${s.destination || '—'}</td>
          <td>${statusPill(s.status)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" class="empty-state">No CV submissions yet. Submit one from the main site.</td></tr>`;

  dashBody.innerHTML = `
    <div class="dash-card">
      <h3>Welcome, ${profile.full_name || 'there'}</h3>
      <p style="color:var(--text-muted);margin-bottom:20px;">Track the status of your CV submissions below.</p>
      <table class="dash-table">
        <thead><tr><th>Date</th><th>Category</th><th>Destination</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <a href="index.html#cv-upload" class="btn btn-primary">Submit Another CV</a>
  `;
}

// ===================== EMPLOYER VIEW =====================
async function renderEmployerView(profile) {
  if (!profile.approved) {
    dashBody.innerHTML = `
      <div class="pending-banner"><i class="fas fa-clock"></i> Your employer account for <strong>${profile.company_name || ''}</strong> is pending admin approval. You'll be able to browse candidates once approved.</div>
    `;
    return;
  }

  const { data, error } = await supabaseClient
    .from('cv_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const rows = (!error && data && data.length)
    ? data.map(s => `
        <tr>
          <td>${s.full_name}</td>
          <td>${s.job_category || '—'}</td>
          <td>${s.destination || '—'}</td>
          <td>${s.email}<br/><small>${s.phone}</small></td>
          <td>${statusPill(s.status)}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="empty-state">No candidates in the pool yet.</td></tr>`;

  dashBody.innerHTML = `
    <div class="dash-card">
      <h3>Candidate Pool — ${profile.company_name || 'Your Company'}</h3>
      <table class="dash-table">
        <thead><tr><th>Name</th><th>Category</th><th>Destination</th><th>Contact</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ===================== ADMIN VIEW =====================
async function renderAdminView() {
  dashBody.innerHTML = `
    <div class="dash-card" id="adminCvCard"><h3>CV Submissions</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminEmployerCard"><h3>Employer Approvals</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminTestiCard"><h3>Testimonials</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
  `;
  loadAdminCvs();
  loadAdminEmployers();
  loadAdminTestimonials();
}

async function loadAdminCvs() {
  const card = document.getElementById('adminCvCard');
  const { data, error } = await supabaseClient
    .from('cv_submissions').select('*').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>CV Submissions</h3><div class="empty-state">No submissions yet.</div>`;
    return;
  }

  const statuses = ['new', 'reviewed', 'shortlisted', 'placed', 'rejected'];
  const rows = data.map(s => `
    <tr>
      <td>${new Date(s.created_at).toLocaleDateString()}</td>
      <td>${s.full_name}<br/><small>${s.email} · ${s.phone}</small></td>
      <td>${s.job_category || '—'}</td>
      <td>${s.destination || '—'}</td>
      <td>
        <select class="status-select" data-id="${s.id}" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);">
          ${statuses.map(st => `<option value="${st}" ${st === s.status ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');

  card.innerHTML = `
    <h3>CV Submissions (${data.length})</h3>
    <table class="dash-table">
      <thead><tr><th>Date</th><th>Candidate</th><th>Category</th><th>Destination</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  card.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabaseClient.from('cv_submissions').update({ status: sel.value }).eq('id', sel.dataset.id);
    });
  });
}

async function loadAdminEmployers() {
  const card = document.getElementById('adminEmployerCard');
  const { data, error } = await supabaseClient
    .from('profiles').select('*').eq('role', 'employer').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>Employer Approvals</h3><div class="empty-state">No employer accounts yet.</div>`;
    return;
  }

  const rows = data.map(p => `
    <tr>
      <td>${p.company_name || '—'}</td>
      <td>${p.full_name || '—'}</td>
      <td>${p.approved ? statusPill('placed') : statusPill('new')}</td>
      <td>
        ${p.approved
          ? `<button class="btn btn-outline small-btn revoke-btn" data-id="${p.id}">Revoke</button>`
          : `<button class="btn btn-primary small-btn approve-btn" data-id="${p.id}">Approve</button>`}
      </td>
    </tr>`).join('');

  card.innerHTML = `
    <h3>Employer Approvals</h3>
    <table class="dash-table">
      <thead><tr><th>Company</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  card.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('profiles').update({ approved: true }).eq('id', btn.dataset.id);
      loadAdminEmployers();
    });
  });
  card.querySelectorAll('.revoke-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('profiles').update({ approved: false }).eq('id', btn.dataset.id);
      loadAdminEmployers();
    });
  });
}

async function loadAdminTestimonials() {
  const card = document.getElementById('adminTestiCard');
  const { data, error } = await supabaseClient
    .from('testimonials').select('*').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>Testimonials</h3><div class="empty-state">No testimonials yet.</div>`;
    return;
  }

  const rows = data.map(t => `
    <tr>
      <td>${t.name}<br/><small>${t.role_title}</small></td>
      <td style="max-width:280px;">${t.quote.slice(0, 80)}${t.quote.length > 80 ? '…' : ''}</td>
      <td>${t.approved ? statusPill('placed') : statusPill('new')}</td>
      <td>
        ${t.approved
          ? `<button class="btn btn-outline small-btn testi-hide-btn" data-id="${t.id}">Hide</button>`
          : `<button class="btn btn-primary small-btn testi-approve-btn" data-id="${t.id}">Approve</button>`}
      </td>
    </tr>`).join('');

  card.innerHTML = `
    <h3>Testimonials (${data.length})</h3>
    <table class="dash-table">
      <thead><tr><th>Person</th><th>Quote</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  card.querySelectorAll('.testi-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('testimonials').update({ approved: true }).eq('id', btn.dataset.id);
      loadAdminTestimonials();
    });
  });
  card.querySelectorAll('.testi-hide-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('testimonials').update({ approved: false }).eq('id', btn.dataset.id);
      loadAdminTestimonials();
    });
  });
}

init();
