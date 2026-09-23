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
function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

async function renderJobSeekerView(userId, profile) {
  const { data, error } = await supabaseClient
    .from('cv_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const submissions = (!error && data) ? data : [];
  const total = submissions.length;
  const shortlisted = submissions.filter(s => s.status === 'shortlisted').length;
  const placed = submissions.filter(s => s.status === 'placed').length;

  const rows = total
    ? submissions.map(s => `
        <tr>
          <td>${new Date(s.created_at).toLocaleDateString()}</td>
          <td>${s.job_category || '—'}</td>
          <td>${s.destination || '—'}</td>
          <td>${statusPill(s.status)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" class="empty-state">No CV submissions yet. Submit one from the main site.</td></tr>`;

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '—';
  const balance = Number(profile.wallet_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });

  dashBody.innerHTML = `
    <div class="dash-card profile-card reveal-dash">
      <div class="profile-card-top">
        <div class="profile-avatar">${initials(profile.full_name)}</div>
        <div>
          <h3 style="margin-bottom:2px;">${profile.full_name || 'Job Seeker'}</h3>
          <p style="color:var(--text-muted);font-size:13px;">Member since ${joined}</p>
        </div>
      </div>
      <div class="profile-detail-grid">
        <div class="profile-detail"><i class="fas fa-envelope"></i><span>${profile.email || '—'}</span></div>
        <div class="profile-detail"><i class="fas fa-phone"></i><span>${profile.phone || '—'}</span></div>
        <div class="profile-detail"><i class="fas fa-globe-africa"></i><span>${profile.country || '—'}</span></div>
        <div class="profile-detail"><i class="fas fa-graduation-cap"></i><span>${profile.education_level || 'Not specified'}</span></div>
      </div>
      ${profile.privacy_accepted ? `<p class="privacy-note"><i class="fas fa-shield-alt"></i> Privacy Policy accepted</p>` : ''}
    </div>

    <div class="wallet-card reveal-dash">
      <div class="wallet-label"><i class="fas fa-wallet"></i> Savings Balance</div>
      <div class="wallet-amount">KSH <span id="walletAmountNum">0</span></div>
      <p class="wallet-note">Balance held toward future service payment. Updated by TOPJOBSEEKERS admin.</p>
    </div>

    <div class="stats-row reveal-dash">
      <div class="stat-chip"><span class="stat-num">${total}</span><span class="stat-label">Applications</span></div>
      <div class="stat-chip"><span class="stat-num">${shortlisted}</span><span class="stat-label">Shortlisted</span></div>
      <div class="stat-chip"><span class="stat-num">${placed}</span><span class="stat-label">Placed</span></div>
    </div>

    <div class="dash-card reveal-dash">
      <h3>Submit a CV</h3>
      <p style="color:var(--text-muted);margin-bottom:20px;">Submit directly from here — it'll appear in your history below instantly.</p>
      <form id="dashCvForm">
        <div class="form-row">
          <div class="form-group">
            <label>Destination</label>
            <select id="dashDestination">
              <option value="">Select country</option>
              <option>UAE</option><option>Qatar</option><option>Saudi Arabia</option>
              <option>United Kingdom</option><option>Germany</option><option>Canada</option>
              <option>Singapore</option><option>Australia</option><option>Kuwait</option>
              <option>Open to Any</option>
            </select>
          </div>
          <div class="form-group">
            <label>Job Category</label>
            <select id="dashJobCat">
              <option value="">Select category</option>
              <option>Healthcare</option><option>Construction</option><option>Hospitality</option>
              <option>Information Technology</option><option>Finance</option>
              <option>Education</option><option>Domestic Staff</option><option>Logistics</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Upload CV (PDF or Word) *</label>
          <div class="file-drop" id="dashFileDrop">
            <i class="fas fa-cloud-upload-alt"></i>
            <span id="dashFileLabel">Tap to choose your CV</span>
            <input type="file" id="dashCvFile" accept=".pdf,.doc,.docx" hidden />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="dashCvSubmitBtn"><i class="fas fa-paper-plane"></i> Submit CV</button>
        <div class="field-error show" id="dashCvError" style="display:none;"></div>
      </form>
    </div>

    <div class="dash-card reveal-dash">
      <h3>Application History</h3>
      <p style="color:var(--text-muted);margin-bottom:20px;">Track the status of your CV submissions below.</p>
      <table class="dash-table">
        <thead><tr><th>Date</th><th>Category</th><th>Destination</th><th>Status</th></tr></thead>
        <tbody id="dashHistoryBody">${rows}</tbody>
      </table>
    </div>
  `;

  requestAnimationFrame(() => {
    document.querySelectorAll('.reveal-dash').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.08}s`;
      requestAnimationFrame(() => el.classList.add('in-view-dash'));
    });
    animateWalletNumber(Number(profile.wallet_balance || 0));
  });

  wireDashCvForm(userId, profile);
}

function animateWalletNumber(target) {
  const el = document.getElementById('walletAmountNum');
  if (!el) return;
  const duration = 900, start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString('en-KE');
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let dashSelectedCvFile = null;

function wireDashCvForm(userId, profile) {
  const drop = document.getElementById('dashFileDrop');
  const fileInput = document.getElementById('dashCvFile');
  const label = document.getElementById('dashFileLabel');
  drop?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => {
    if (fileInput.files[0]) {
      dashSelectedCvFile = fileInput.files[0];
      label.textContent = dashSelectedCvFile.name;
    }
  });

  document.getElementById('dashCvForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('dashCvSubmitBtn');
    const errorEl = document.getElementById('dashCvError');
    errorEl.style.display = 'none';

    if (!dashSelectedCvFile) {
      errorEl.textContent = 'Please attach your CV (PDF or Word document).';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      const safeName = dashSelectedCvFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseClient.storage.from('cvs').upload(filePath, dashSelectedCvFile);
      if (uploadError) throw uploadError;

      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      const emailToUse = profile.email || authUser?.email;

      const { error: insertError } = await supabaseClient.from('cv_submissions').insert({
        user_id: userId,
        full_name: profile.full_name, phone: profile.phone, email: emailToUse,
        destination: document.getElementById('dashDestination').value || null,
        job_category: document.getElementById('dashJobCat').value || null,
        cv_file_path: filePath,
      });
      if (insertError) throw insertError;

      btn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
      btn.style.background = '#0a7c4e';
      dashSelectedCvFile = null;
      this.reset();
      label.textContent = 'Tap to choose your CV';

      // refresh the whole view so the Applications count and history update immediately
      renderJobSeekerView(userId, profile);
    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message || 'Something went wrong. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit CV';
    }
  });
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
    <div class="dash-card" id="adminPostJobCard"></div>
    <div class="dash-card" id="adminWalletCard"><h3>Wallet Management</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminCvCard"><h3>CV Submissions</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminEmployerCard"><h3>Employer Approvals</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
    <div class="dash-card" id="adminTestiCard"><h3>Testimonials</h3><div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>
  `;
  renderPostJobForm();
  loadAdminWallet();
  loadAdminCvs();
  loadAdminEmployers();
  loadAdminTestimonials();
}

let postJobSelectedPhoto = null;

function renderPostJobForm() {
  const card = document.getElementById('adminPostJobCard');
  card.innerHTML = `
    <h3><i class="fas fa-bullhorn"></i> Post a Job</h3>
    <p style="color:var(--text-muted);margin-bottom:16px;">Post a photo + caption directly — no external job source involved. Goes live on the site instantly.</p>
    <div class="form-group">
      <label>Job Photo *</label>
      <div class="file-drop" id="postJobPhotoDrop">
        <i class="fas fa-image"></i>
        <span id="postJobPhotoLabel">Tap to choose a photo</span>
        <input type="file" id="postJobPhotoFile" accept="image/*" hidden />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Job Title *</label><input type="text" id="pjTitle" placeholder="e.g. Registered Nurse" required /></div>
      <div class="form-group"><label>Company</label><input type="text" id="pjCompany" placeholder="e.g. Al Razi Medical Center" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Country</label><input type="text" id="pjCountry" placeholder="e.g. UAE" /></div>
      <div class="form-group"><label>Location</label><input type="text" id="pjLocation" placeholder="e.g. Dubai, UAE" /></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Category</label>
        <select id="pjCategory">
          <option>Healthcare</option><option>Construction</option><option>Hospitality</option>
          <option>Information Technology</option><option>Finance</option><option>Education</option>
          <option>Domestic</option><option>Logistics</option><option>Sales</option><option>Admin</option>
        </select>
      </div>
      <div class="form-group"><label>Slots</label><input type="number" id="pjSlots" min="1" value="1" /></div>
    </div>
    <div class="form-group"><label>Salary (optional)</label><input type="text" id="pjSalary" placeholder="e.g. KSH 80,000/mo or Negotiable" /></div>
    <div class="form-group">
      <label>Caption / Description</label>
      <textarea id="pjCaption" rows="3" placeholder="Write the post caption — role details, requirements, whatever you'd normally include." style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical;"></textarea>
    </div>
    <div class="form-group">
      <label>How should candidates apply?</label>
      <div class="role-selector" style="display:flex;gap:10px;">
        <div class="role-option selected" data-method="link" id="applyMethodLink" style="flex:1;text-align:center;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;">
          <i class="fas fa-link"></i> Link (Google Form, etc.)
        </div>
        <div class="role-option" data-method="email" id="applyMethodEmail" style="flex:1;text-align:center;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;">
          <i class="fas fa-envelope"></i> Email (Gmail CV)
        </div>
      </div>
    </div>
    <div class="form-group" id="pjLinkGroup">
      <label>Application Link</label>
      <input type="url" id="pjApplyLink" placeholder="https://docs.google.com/forms/..." />
    </div>
    <div class="form-group" id="pjEmailGroup" style="display:none;">
      <label>Application Email</label>
      <input type="email" id="pjApplyEmail" placeholder="e.g. topjobsseekers@gmail.com" />
    </div>
    <button class="btn btn-primary btn-full" id="postJobBtn"><i class="fas fa-paper-plane"></i> Post Job</button>
    <div class="field-error" id="postJobMsg" style="margin-top:12px;"></div>
  `;

  const drop = document.getElementById('postJobPhotoDrop');
  const fileInput = document.getElementById('postJobPhotoFile');
  const label = document.getElementById('postJobPhotoLabel');
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
      postJobSelectedPhoto = fileInput.files[0];
      label.textContent = postJobSelectedPhoto.name;
    }
  });

  let applyMethod = 'link';
  const linkOpt = document.getElementById('applyMethodLink');
  const emailOpt = document.getElementById('applyMethodEmail');
  linkOpt.addEventListener('click', () => {
    applyMethod = 'link';
    linkOpt.classList.add('selected'); emailOpt.classList.remove('selected');
    document.getElementById('pjLinkGroup').style.display = 'block';
    document.getElementById('pjEmailGroup').style.display = 'none';
  });
  emailOpt.addEventListener('click', () => {
    applyMethod = 'email';
    emailOpt.classList.add('selected'); linkOpt.classList.remove('selected');
    document.getElementById('pjEmailGroup').style.display = 'block';
    document.getElementById('pjLinkGroup').style.display = 'none';
  });

  document.getElementById('postJobBtn').addEventListener('click', async () => {
    const msg = document.getElementById('postJobMsg');
    msg.classList.remove('show');
    const title = document.getElementById('pjTitle').value.trim();

    if (!title) { msg.textContent = 'Job title is required.'; msg.classList.add('show'); return; }
    if (!postJobSelectedPhoto) { msg.textContent = 'Please choose a photo for this post.'; msg.classList.add('show'); return; }
    if (applyMethod === 'link' && !document.getElementById('pjApplyLink').value.trim()) {
      msg.textContent = 'Please add an application link.'; msg.classList.add('show'); return;
    }
    if (applyMethod === 'email' && !document.getElementById('pjApplyEmail').value.trim()) {
      msg.textContent = 'Please add an application email.'; msg.classList.add('show'); return;
    }

    const btn = document.getElementById('postJobBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

    try {
      const safeName = postJobSelectedPhoto.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabaseClient.storage.from('job-photos').upload(filePath, postJobSelectedPhoto);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseClient.storage.from('job-photos').getPublicUrl(filePath);

      const { error: insertError } = await supabaseClient.from('jobs').insert({
        title,
        company: document.getElementById('pjCompany').value.trim() || null,
        country: document.getElementById('pjCountry').value.trim() || null,
        location: document.getElementById('pjLocation').value.trim() || null,
        category: document.getElementById('pjCategory').value,
        slots: parseInt(document.getElementById('pjSlots').value) || 1,
        salary: document.getElementById('pjSalary').value.trim() || 'Negotiable — inquire',
        description: document.getElementById('pjCaption').value.trim() || null,
        image_url: urlData.publicUrl,
        apply_method: applyMethod,
        apply_url: applyMethod === 'link' ? document.getElementById('pjApplyLink').value.trim() : null,
        apply_email: applyMethod === 'email' ? document.getElementById('pjApplyEmail').value.trim() : null,
        source: 'manual',
        active: true,
        badge: 'new',
        icon: '💼',
        job_type: 'Full-time',
      });
      if (insertError) throw insertError;

      btn.innerHTML = '<i class="fas fa-check"></i> Posted!';
      btn.style.background = '#0a7c4e';
      postJobSelectedPhoto = null;
      setTimeout(renderPostJobForm, 1200); // reset the form for the next post
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || 'Something went wrong.';
      msg.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Job';
    }
  });
}

async function loadAdminWallet() {
  const card = document.getElementById('adminWalletCard');
  const { data, error } = await supabaseClient
    .from('profiles').select('id, full_name, email, wallet_balance').eq('role', 'job_seeker').order('full_name');

  if (error || !data || data.length === 0) {
    card.innerHTML = `<h3>Wallet Management</h3><div class="empty-state">No job seeker accounts yet.</div>`;
    return;
  }

  const options = data.map(p =>
    `<option value="${p.id}">${p.full_name || 'Unnamed'} — ${p.email || ''} (KSH ${Number(p.wallet_balance || 0).toLocaleString('en-KE')})</option>`
  ).join('');

  card.innerHTML = `
    <h3>Wallet Management</h3>
    <p style="color:var(--text-muted);margin-bottom:16px;">Add or subtract from a job seeker's savings balance. Every change is logged.</p>
    <div class="form-group">
      <label>Job Seeker</label>
      <select id="walletUserSelect">${options}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Amount (KSH)</label>
        <input type="number" id="walletAmountInput" min="0" step="1" placeholder="e.g. 5000" />
      </div>
      <div class="form-group">
        <label>Reason (optional)</label>
        <input type="text" id="walletReasonInput" placeholder="e.g. Placement fee deposit" />
      </div>
    </div>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-primary" id="walletAddBtn" style="flex:1;"><i class="fas fa-plus"></i> Add Funds</button>
      <button class="btn btn-outline" id="walletSubtractBtn" style="flex:1;"><i class="fas fa-minus"></i> Deduct Funds</button>
    </div>
    <div class="field-error" id="walletMsg" style="margin-top:12px;"></div>
  `;

  async function applyWalletChange(sign) {
    const userSelect = document.getElementById('walletUserSelect');
    const amountInput = document.getElementById('walletAmountInput');
    const reasonInput = document.getElementById('walletReasonInput');
    const msg = document.getElementById('walletMsg');
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
      msg.textContent = 'Enter a valid amount greater than 0.';
      msg.classList.add('show');
      return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient.from('wallet_transactions').insert({
      user_id: userSelect.value,
      amount: amount * sign,
      reason: reasonInput.value.trim() || null,
      created_by: user.id,
    });

    if (error) {
      msg.textContent = error.message;
      msg.classList.add('show');
      return;
    }

    msg.classList.remove('show');
    amountInput.value = '';
    reasonInput.value = '';
    loadAdminWallet(); // refresh so the dropdown shows the new balance
  }

  document.getElementById('walletAddBtn').addEventListener('click', () => applyWalletChange(1));
  document.getElementById('walletSubtractBtn').addEventListener('click', () => applyWalletChange(-1));
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
