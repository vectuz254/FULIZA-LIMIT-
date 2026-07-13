'use strict';

// ---- tab switching ----
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMsg = document.getElementById('authMsg');

function showMsg(text, type) {
  authMsg.textContent = text;
  authMsg.className = `auth-msg ${type}`;
}
function clearMsg() {
  authMsg.className = 'auth-msg';
  authMsg.textContent = '';
}

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active'); tabSignup.classList.remove('active');
  loginForm.classList.add('active'); signupForm.classList.remove('active');
  clearMsg();
});
tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active'); tabLogin.classList.remove('active');
  signupForm.classList.add('active'); loginForm.classList.remove('active');
  clearMsg();
});

// ---- role selector on signup ----
let selectedRole = 'job_seeker';
document.querySelectorAll('.role-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedRole = opt.dataset.role;
    document.getElementById('companyGroup').style.display = selectedRole === 'employer' ? 'block' : 'none';
  });
});

// ---- redirect if already logged in ----
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = 'dashboard.html';
})();

// ---- login ----
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Logging in...';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showMsg(error.message, 'error');
    btn.disabled = false; btn.textContent = 'Log In';
    return;
  }
  window.location.href = 'dashboard.html';
});

// ---- signup ----
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('signupBtn');
  btn.disabled = true; btn.textContent = 'Creating account...';

  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const full_name = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const company_name = document.getElementById('signupCompany').value.trim();

  const { error } = await supabaseClient.auth.signUp({
    email, password,
    options: {
      data: { role: selectedRole, full_name, phone, company_name },
    },
  });

  if (error) {
    showMsg(error.message, 'error');
    btn.disabled = false; btn.textContent = 'Create Account';
    return;
  }

  if (selectedRole === 'employer') {
    showMsg('Account created! An admin needs to approve employer access before you can view candidates — you can still log in and check status.', 'success');
  } else {
    showMsg('Account created! Check your email to confirm, then log in.', 'success');
  }
  btn.disabled = false; btn.textContent = 'Create Account';
});
