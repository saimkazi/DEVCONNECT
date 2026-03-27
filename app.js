// app.js — shared across every page

const API = ''; // same server as the frontend

// ── Fetch helpers ─────────────────────────────────────────

async function post(url, body) {
  const r = await fetch(API + url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Guard: if server returned HTML instead of JSON, give a clear error
  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server returned unexpected response (status ' + r.status + '). Check the backend is running.');
  }

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function get(url) {
  const r = await fetch(API + url, { credentials: 'include' });

  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server returned unexpected response (status ' + r.status + '). Check the backend is running.');
  }

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function put(url, body) {
  const r = await fetch(API + url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server returned unexpected response (status ' + r.status + ').');
  }

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function del(url) {
  const r = await fetch(API + url, {
    method: 'DELETE',
    credentials: 'include',
  });

  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server returned unexpected response (status ' + r.status + ').');
  }

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ── Auth ──────────────────────────────────────────────────
let currentUser = null;

async function loadAuth() {
  try {
    const data = await get('/api/me');
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
  renderNav();
  return currentUser;
}

function renderNav() {
  const loginBtn  = document.getElementById('nav-login');
  const signupBtn = document.getElementById('nav-signup');
  const userArea  = document.getElementById('nav-user');

  if (currentUser) {
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (userArea) {
      userArea.style.display = 'flex';
      const nameEl = document.getElementById('nav-username');
      if (nameEl) nameEl.textContent = currentUser.username;
    }
  } else {
    if (loginBtn)  loginBtn.style.display  = '';
    if (signupBtn) signupBtn.style.display = '';
    if (userArea)  userArea.style.display  = 'none';
  }
}

async function logout() {
  await post('/api/logout', {});
  window.location.href = '/index.html';
}

async function requireAuth() {
  const user = await loadAuth();
  if (!user) {
    window.location.href = 'login.html?next=' + encodeURIComponent(location.pathname);
    return null;
  }
  return user;
}

// ── CV Card builder ───────────────────────────────────────
function makeCard(cv) {
  const name   = cv.full_name || '';
  const initial = name[0]?.toUpperCase() || '?';
  const skills  = cv.skills || [];
  const desc    = (cv.description || '').slice(0, 100) + ((cv.description || '').length > 100 ? '...' : '');

  const card = document.createElement('article');
  card.className = 'cv-card';
  card.tabIndex  = 0;
  card.innerHTML = `
    <div class="card-top">
      <div class="avatar">${initial}</div>
      <div>
        <div class="card-name">${esc(name)}</div>
        <div class="card-edu">${esc(cv.education || '')}</div>
      </div>
    </div>
    ${desc ? `<p class="card-desc">${esc(desc)}</p>` : ''}
    <div class="tags">
      ${skills.slice(0, 5).map((s, i) => `<span class="tag${i === 0 ? ' hi' : ''}">${esc(s)}</span>`).join('')}
      ${skills.length > 5 ? `<span class="tag">+${skills.length - 5}</span>` : ''}
    </div>
    <div class="card-footer">
      <div class="card-links">
        ${cv.github    ? `<a href="${esc(cv.github)}"    class="icon-link" target="_blank" onclick="event.stopPropagation()" title="GitHub">${svgGithub()}</a>` : ''}
        ${cv.portfolio ? `<a href="${esc(cv.portfolio)}" class="icon-link" target="_blank" onclick="event.stopPropagation()" title="Portfolio">${svgGlobe()}</a>` : ''}
      </div>
      <a href="cv.html?id=${cv.id}" class="btn btn-primary btn-sm" onclick="event.stopPropagation()">View CV</a>
    </div>`;

  card.addEventListener('click',   () => window.location.href = `cv.html?id=${cv.id}`);
  card.addEventListener('keydown', e => { if (e.key === 'Enter') window.location.href = `cv.html?id=${cv.id}`; });
  return card;
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type) {
  type = type || 'ok';
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className   = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Escape HTML ───────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── SVG icons ─────────────────────────────────────────────
function svgGithub() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10.01 10.01 0 0022 12c0-5.52-4.48-10-10-10z"/></svg>';
}
function svgGlobe() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
}
function svgLinkedin() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>';
}

// ── Nav dropdown (runs on every page) ────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const trigger  = document.getElementById('nav-user-trigger');
  const dropdown = document.getElementById('nav-user-dropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function() {
      dropdown.classList.remove('open');
    });
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});