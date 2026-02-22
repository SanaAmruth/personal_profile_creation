import express from 'express';
import session from 'express-session';
import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { createClient } from '@libsql/client';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const {
  SESSION_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  APP_BASE_URL,
  TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN
} = process.env;

if (!SESSION_SECRET || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !APP_BASE_URL) {
  console.warn('Missing env vars. Create .env with SESSION_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, APP_BASE_URL');
}

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use(
  session({
    secret: SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

// Database setup
let db;
let isTurso = false;

if (typeof TURSO_DATABASE_URL === 'string' && TURSO_DATABASE_URL.trim() !== '' &&
  typeof TURSO_AUTH_TOKEN === 'string' && TURSO_AUTH_TOKEN.trim() !== '') {
  console.log('Using Turso Cloud Database');
  db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN
  });
  isTurso = true;
} else {
  console.log('Using local SQLite database');
  const dbPath = path.join(__dirname, 'data.db');
  const sqliteDb = new sqlite3.Database(dbPath);

  db = {
    execute: (sql, params = []) => new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastInsertRowid: this.lastID, rowsAffected: this.changes });
      });
    }),
    executeAll: (sql, params = []) => new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    }),
    executeGet: (sql, params = []) => new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    })
  };
}

async function initDb() {
  try {
    const usersTable = `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      profile_json TEXT,
      favorites_json TEXT,
      deployed_url TEXT,
      created_at TEXT NOT NULL
    )`;
    const githubTable = `CREATE TABLE IF NOT EXISTS github_tokens (
      user_id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      login TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`;

    await performQuery(usersTable);
    await performQuery(githubTable);
    console.log('Database tables initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

initDb();

// Helper for unified DB access
async function performQuery(sql, params = []) {
  if (isTurso) {
    const result = await db.execute({ sql, args: params });
    return result;
  } else {
    // Handled by the wrapper above
    return db.execute(sql, params);
  }
}

async function getQuery(sql, params = []) {
  if (isTurso) {
    const result = await db.execute({ sql, args: params });
    return result.rows[0];
  } else {
    return db.executeGet(sql, params);
  }
}

async function getAllQuery(sql, params = []) {
  if (isTurso) {
    const result = await db.execute({ sql, args: params });
    return result.rows;
  } else {
    const result = await db.executeAll(sql, params);
    return result.rows;
  }
}

function requireLogin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Email + password auth
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await getQuery('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    await performQuery(
      'INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)',
      [normalizedEmail, hash, now]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await getQuery('SELECT id, password_hash FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return req.session.destroy(() =>
        res.status(401).json({ error: 'Account not found. Please sign up.' })
      );
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return req.session.destroy(() => res.status(401).json({ error: 'Invalid credentials' }));
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.userId = user.id;
      res.json({ ok: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session?.userId) return res.json({ user: null });
  getQuery('SELECT id, email, deployed_url FROM users WHERE id = ?', [req.session.userId])
    .then((user) => res.json({ user: user || null }))
    .catch(() => res.json({ user: null }));
});

app.get('/api/github/status', requireLogin, (req, res) => {
  getQuery('SELECT login FROM github_tokens WHERE user_id = ?', [req.session.userId])
    .then((row) => {
      res.json({ connected: Boolean(row), login: row?.login || null });
    })
    .catch(() => res.json({ connected: false, login: null }));
});

app.post('/api/github/disconnect', requireLogin, (req, res) => {
  performQuery('DELETE FROM github_tokens WHERE user_id = ?', [req.session.userId])
    .then(() => res.json({ ok: true }))
    .catch(() => res.status(500).json({ error: 'Failed to disconnect' }));
});

// Save draft profile data in session
app.post('/api/profile', requireLogin, (req, res) => {
  const {
    basics = {},
    education = [],
    experience = [],
    projects = [],
    skills = [],
    achievements = [],
    links = []
  } = req.body || {};
  if (!basics?.name) return res.status(400).json({ error: 'Name is required' });
  const profileJson = JSON.stringify({
    basics,
    education,
    experience,
    projects,
    skills,
    achievements,
    links
  });
  performQuery('UPDATE users SET profile_json = ? WHERE id = ?', [profileJson, req.session.userId])
    .then(() => res.json({ ok: true }))
    .catch(() => res.status(500).json({ error: 'Failed to save profile' }));
});

app.get('/api/profile', requireLogin, (req, res) => {
  getQuery('SELECT profile_json FROM users WHERE id = ?', [req.session.userId])
    .then((row) => {
      const profile = row?.profile_json ? JSON.parse(row.profile_json) : null;
      res.json({ profile });
    })
    .catch(() => res.json({ profile: null }));
});

app.post('/api/favorites', requireLogin, (req, res) => {
  const { templateId, action } = req.body;
  if (!templateId || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ error: 'templateId and valid action required' });
  }
  getQuery('SELECT favorites_json FROM users WHERE id = ?', [req.session.userId])
    .then((row) => {
      const current = row?.favorites_json ? JSON.parse(row.favorites_json) : [];
      const favs = new Set(current);
      if (action === 'add') favs.add(templateId);
      if (action === 'remove') favs.delete(templateId);
      const favorites = Array.from(favs);
      return performQuery('UPDATE users SET favorites_json = ? WHERE id = ?', [
        JSON.stringify(favorites),
        req.session.userId
      ]).then(() => res.json({ ok: true, favorites }));
    })
    .catch(() => res.status(500).json({ error: 'Failed to save favorites' }));
});

app.get('/api/favorites', requireLogin, (req, res) => {
  getQuery('SELECT favorites_json FROM users WHERE id = ?', [req.session.userId])
    .then((row) => {
      const favorites = row?.favorites_json ? JSON.parse(row.favorites_json) : [];
      res.json({ favorites });
    })
    .catch(() => res.json({ favorites: [] }));
});

// GitHub OAuth begin
app.get('/auth/github', requireLogin, (req, res) => {
  const state = uuidv4();
  req.session.ghState = state;
  const redirect = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    GITHUB_CLIENT_ID || ''
  )}&redirect_uri=${encodeURIComponent(`${APP_BASE_URL}/auth/github/callback`)}&scope=repo%20pages&state=${state}&prompt=select_account`;
  res.redirect(redirect);
});

app.get('/auth/github/callback', requireLogin, async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || state !== req.session.ghState) {
    return res.status(400).send('Invalid OAuth state');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${APP_BASE_URL}/auth/github/callback`,
        state
      })
    });

    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      return res.status(400).send('GitHub OAuth failed');
    }

    let ghLogin = null;
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'User-Agent': 'portfolio-builder' }
      });
      const userJson = await userRes.json();
      ghLogin = userJson?.login || null;
    } catch { }

    const now = new Date().toISOString();
    let sql = 'INSERT INTO github_tokens (user_id, access_token, login, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET access_token=excluded.access_token, login=excluded.login, created_at=excluded.created_at';
    if (isTurso) {
      // Turso syntax for UPSERT if different, but standard SQLite works
    }
    await performQuery(sql, [req.session.userId, tokenJson.access_token, ghLogin, now]);
    res.redirect('/#host-ready');
  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth error');
  }
});

// Host: create repo, push files, enable pages
app.post('/api/host', requireLogin, async (req, res) => {
  const { templateId } = req.body;
  if (!templateId) {
    return res.status(400).json({ error: 'Template and profile required' });
  }

  try {
    const tokenRow = await getQuery('SELECT access_token FROM github_tokens WHERE user_id = ?', [
      req.session.userId
    ]);
    if (!tokenRow?.access_token) {
      return res.status(401).json({ error: 'GitHub not connected' });
    }
    const profileRow = await getQuery('SELECT profile_json FROM users WHERE id = ?', [req.session.userId]);
    const profile = profileRow?.profile_json ? JSON.parse(profileRow.profile_json) : null;
    if (!profile) {
      return res.status(400).json({ error: 'Template and profile required' });
    }

    const octokit = new Octokit({ auth: tokenRow.access_token });
    const { data: me } = await octokit.users.getAuthenticated();
    const repoName = `portfolio-${Date.now()}`;

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: false
    });
    const targetBranch = repo.default_branch || 'main';

    const { html, css } = renderTemplate(templateId, profile);

    const files = [
      { path: 'index.html', content: html },
      { path: 'styles.css', content: css }
    ];

    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: me.login,
        repo: repoName,
        path: file.path,
        message: `Add ${file.path}`,
        content: Buffer.from(file.content).toString('base64'),
        branch: targetBranch
      });
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: me.login,
      repo: repoName,
      path: '.nojekyll',
      message: 'Add .nojekyll',
      content: Buffer.from('').toString('base64'),
      branch: targetBranch
    });

    // Enable GitHub Pages on the repo's default branch.
    try {
      await octokit.request('POST /repos/{owner}/{repo}/pages', {
        owner: me.login,
        repo: repoName,
        source: { branch: targetBranch, path: '/' }
      });
    } catch (err) {
      // If Pages is already enabled or the endpoint rejects, try updating it.
      const status = err?.status || err?.response?.status;
      if (status === 409 || status === 422) {
        await octokit.request('PUT /repos/{owner}/{repo}/pages', {
          owner: me.login,
          repo: repoName,
          source: { branch: targetBranch, path: '/' }
        });
      } else {
        throw err;
      }
    }

    const pagesUrl = `https://${me.login}.github.io/${repoName}/`;
    await performQuery('UPDATE users SET deployed_url = ? WHERE id = ?', [pagesUrl, req.session.userId]);
    res.json({
      ok: true,
      repoUrl: repo.html_url,
      pagesUrl,
      note: 'GitHub Pages can take a minute to become available.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to host site' });
  }
});


function renderTemplate(templateId, profile) {
  const normalized = normalizeProfile(profile);
  const basics = normalized.basics || {};
  const name = basics.name || 'Your Name';
  const headline = basics.headline || basics.bio || '';
  const links = normalizeLinks(basics, normalized.links);
  const skills = Array.isArray(normalized.skills) ? normalized.skills : [];
  const education = Array.isArray(normalized.education) ? normalized.education : [];
  const experience = Array.isArray(normalized.experience) ? normalized.experience : [];
  const projects = Array.isArray(normalized.projects) ? normalized.projects : [];
  const achievements = Array.isArray(normalized.achievements) ? normalized.achievements : [];
  const hasBasics = Boolean(
    (basics.name && basics.name.trim()) ||
    (basics.headline && basics.headline.trim()) ||
    (basics.email && basics.email.trim()) ||
    (basics.phone && basics.phone.trim()) ||
    (basics.location && basics.location.trim()) ||
    (basics.website && basics.website.trim()) ||
    (basics.bio && basics.bio.trim()) ||
    basics.photo ||
    basics.resume ||
    (basics.linkedin && basics.linkedin.trim()) ||
    (basics.github && basics.github.trim())
  );
  const hasAbout = Boolean((basics.bio && basics.bio.trim()) || skills.length || basics.resume);
  const hasEducation = education.length > 0;
  const hasProjects = projects.length > 0;
  const hasExperience = experience.length > 0;
  const hasAchievements = achievements.length > 0;
  const hasContact = Boolean(basics.email || basics.phone || basics.location);
  const isEmptyProfile = !hasBasics && !hasEducation && !hasProjects && !hasExperience && !hasAchievements && !hasContact && skills.length === 0;
  const navItems = [
    hasAbout ? `<li><a href="#about" class="nav__link">About</a></li>` : '',
    hasEducation ? `<li><a href="#education" class="nav__link">Education</a></li>` : '',
    hasProjects ? `<li><a href="#work" class="nav__link">Projects</a></li>` : '',
    hasExperience ? `<li><a href="#experi" class="nav__link">Experience</a></li>` : '',
    hasAchievements ? `<li><a href="#achievements" class="nav__link">Achievements</a></li>` : '',
    hasContact ? `<li><a href="#contact" class="nav__link">Contact</a></li>` : ''
  ].filter(Boolean).join('');

  return {
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(name)} | Portfolio</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  ${isEmptyProfile ? `
  <header class="header" id="top"></header>
  <footer class="footer">
    <div class="row">
      <p>© ${new Date().getFullYear()}</p>
    </div>
  </footer>
  ` : `
  <header class="header" id="top">
    <div class="row header__top">
      ${basics.photo ? `<div class="header__avatar"><img src="${escapeAttr(basics.photo)}" alt="Profile photo" /></div>` : ''}
      <nav class="nav">
        <ul class="nav__items">
          ${navItems}
        </ul>
      </nav>
    </div>
    <div class="row">
      <div class="header__text fade-up">
        <h1 class="heading-primary"><span>${escapeHtml(name)}</span></h1>
        <p>${escapeHtml(headline)}</p>
      </div>
    </div>
  </header>

  <main>
    ${hasAbout ? `<section class="section about" id="about">
      <div class="row">
        <h2>About Me</h2>
        <div class="about__content">
          <div class="card fade-up delay-1">
            <p>${sanitizeHtml(basics.bio || 'Add a short bio about your work and values.')}</p>
            <div class="work__list">
              ${skills.map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
            </div>
            ${basics.resume ? `<a class="nav__link resume-link" href="${escapeAttr(basics.resume)}" download="resume.pdf">Download Resume</a>` : ''}
          </div>
        </div>
      </div>
    </section>` : ''}

    ${hasEducation ? `<section class="section contact" id="education">
      <div class="row">
        <h2>Education</h2>
        ${education.map((e) => `
          <div class="card fade-up delay-2">
            <h3>${escapeHtml([e.degree, e.school].filter(Boolean).join(' · ') || 'Education')}</h3>
            <p>${escapeHtml([e.location, dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · '))}</p>
            ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </section>` : ''}

    ${hasProjects ? `<section class="section work" id="work">
      <div class="row">
        <h2>My Projects</h2>
        <div class="work__boxes">
          ${projects.map((proj) => `
            <div class="work__box fade-up delay-1">
              <h3>${escapeHtml(proj.name || 'Project')}</h3>
              <p>${sanitizeHtml(proj.description || '')}</p>
              ${Array.isArray(proj.skills) && proj.skills.length ? `
                <ul class="work__list">
                  ${proj.skills.map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
                </ul>
              ` : ''}
              ${proj.link ? `<a class="nav__link" href="${escapeAttr(proj.link)}">Visit</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>` : ''}

    ${hasExperience ? `<section class="section contact" id="experi">
      <div class="row">
        <h2>Experience</h2>
        ${experience.map((e) => `
          <div class="card fade-up delay-2">
            <h3>${escapeHtml([e.title, e.company].filter(Boolean).join(' · ') || 'Role')}</h3>
            <p>${escapeHtml([e.location, dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · '))}</p>
            <p>${sanitizeHtml(e.description || '')}</p>
            ${Array.isArray(e.skills) && e.skills.length ? `
              <ul class="work__list">
                ${e.skills.map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>` : ''}

    ${hasAchievements ? `<section class="section contact" id="achievements">
      <div class="row">
        <h2>Achievements</h2>
        ${achievements.map((a) => `
          <div class="card fade-up delay-2">
            <h3>${escapeHtml(a?.name || a || 'Achievement')}</h3>
            ${a?.description ? `<p>${sanitizeHtml(a.description)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </section>` : ''}

    ${hasContact ? `<section class="section contact" id="contact">
      <div class="row">
        <h2>Get in Touch</h2>
        <div class="contact__info">
          <div class="contact-chips">
            ${[basics.email, basics.phone, basics.location].filter(Boolean).map((m) => `<span>${escapeHtml(m)}</span>`).join('')}
          </div>
          <a class="btn" href="mailto:${escapeAttr(basics.email || '')}">Email me</a>
        </div>
      </div>
    </section>` : ''}
  </main>

  <footer class="footer">
    <div class="row">
      <div class="footer__links">
        ${basics.linkedin ? `<a class="social-link" href="${escapeAttr(basics.linkedin)}" target="_blank" rel="noreferrer" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5ZM3.5 9h3v11h-3V9Zm6 0h2.9v1.5h.1c.4-.8 1.5-1.6 3.1-1.6c3.3 0 3.9 2.2 3.9 5v6.1h-3v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20h-3V9Z"/></svg>
        </a>` : ''}
        ${basics.github ? `<a class="social-link" href="${escapeAttr(basics.github)}" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.55 2.87 8.41 6.84 9.77c.5.1.68-.22.68-.48c0-.24-.01-.87-.01-1.7c-2.78.62-3.37-1.38-3.37-1.38c-.45-1.2-1.1-1.52-1.1-1.52c-.9-.63.07-.62.07-.62c1 .07 1.52 1.06 1.52 1.06c.9 1.57 2.36 1.12 2.94.86c.09-.67.35-1.12.63-1.38c-2.22-.26-4.56-1.13-4.56-5.04c0-1.11.39-2.02 1.03-2.74c-.1-.26-.45-1.32.1-2.75c0 0 .84-.27 2.75 1.05c.8-.23 1.65-.34 2.5-.34c.85 0 1.7.12 2.5.34c1.9-1.32 2.74-1.05 2.74-1.05c.55 1.43.2 2.49.1 2.75c.64.72 1.03 1.63 1.03 2.74c0 3.92-2.35 4.77-4.58 5.02c.36.32.68.95.68 1.92c0 1.39-.01 2.5-.01 2.84c0 .27.18.59.69.48C19.14 20.67 22 16.81 22 12.26C22 6.58 17.52 2 12 2Z"/></svg>
        </a>` : ''}
      </div>
      <p>© ${new Date().getFullYear()} ${escapeHtml(name)}</p>
    </div>
  </footer>
  `}
</body>
</html>`,
    css: `@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&display=swap');:root{--bg:#0f1014;--surface:#151821;--ink:#f5f7ff;--muted:#b3b8c5;--accent:#7ee7c6;--accent-2:#4f8df5;--border:rgba(255,255,255,0.08);--shadow:0 24px 60px rgba(0,0,0,0.35);}*{box-sizing:border-box;}html{scroll-behavior:smooth;}body{margin:0;font-family:"Manrope",system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);} .header{min-height:70vh;display:grid;align-items:center;background:radial-gradient(500px 280px at 10% 10%, rgba(79,141,245,0.25), transparent 60%),radial-gradient(500px 280px at 90% 0%, rgba(126,231,198,0.22), transparent 55%),var(--bg);} .row{max-width:1100px;margin:0 auto;padding:28px 18px;} .header__top{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;text-align:center;} .header__avatar{width:72px;height:72px;border-radius:50%;overflow:hidden;border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;} .header__avatar img{width:100%;height:100%;object-fit:cover;display:block;} .avatar__placeholder{font-size:12px;color:var(--muted);} .nav{display:flex;justify-content:center;width:100%;} .nav__items{display:flex;gap:18px;list-style:none;padding:0;margin:0;flex-wrap:wrap;justify-content:center;} .nav__link{color:var(--muted);text-decoration:none;font-size:14px;} .nav__link:hover{color:var(--ink);} .header__text{max-width:720px;} .heading-primary{font-size:40px;letter-spacing:-0.02em;margin:0 0 12px;} .header__text p{color:var(--muted);font-size:16px;margin:0 0 18px;} .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:linear-gradient(135deg,var(--accent-2),var(--accent));color:#0b0c10;text-decoration:none;font-weight:600;} .section{padding:28px 0;} .section h2{font-size:22px;margin:0 0 16px;text-align:left;} #contact h2{text-align:center;} .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:18px;box-shadow:var(--shadow);} .about__content{display:grid;gap:18px;grid-template-columns:1fr;align-items:center;} .about__photo{width:100%;border-radius:16px;border:1px solid var(--border);} .work__boxes{display:grid;gap:16px;} .work__box{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:18px;} .work__list{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:12px 0 0;} .work__list li{padding:6px 10px;border-radius:999px;border:1px solid var(--border);color:var(--muted);font-size:12px;} .resume-link{display:inline-flex;margin-top:18px;} .contact-chips{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 14px;} .contact-chips span{padding:8px 12px;border-radius:999px;border:1px solid var(--border);color:var(--muted);background:var(--surface);} .contact__info{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;} .social-link{color:var(--ink);text-decoration:none;border:1px solid var(--border);width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;} .social-link svg{width:18px;height:18px;display:block;} .contact-chips{justify-content:center;} .contact__info .btn{padding:8px 14px;border-radius:12px;font-size:12px;display:inline-flex;width:auto;max-width:220px;justify-content:center;}  .meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;font-size:12px;color:var(--muted);} .meta span{padding:6px 10px;border-radius:999px;border:1px solid var(--border);}  .footer{padding:30px 0;color:var(--muted);text-align:center;} .footer__links{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;} .fade-up{opacity:0;transform:translateY(16px);animation:fadeUp 0.8s ease forwards;} .delay-1{animation-delay:0.1s;} .delay-2{animation-delay:0.2s;} .delay-3{animation-delay:0.3s;} @keyframes fadeUp{to{opacity:1;transform:translateY(0);}} @media (max-width: 900px){.header__top{flex-direction:column;align-items:center;}}
`
  };
}
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/\s/g, '');
}

function dateRange(start, end) {
  if (!start && !end) return '';
  const startFmt = formatMonth(start);
  const endFmt = formatMonth(end);
  if (start && end) return `${startFmt} — ${endFmt}`;
  return startFmt || endFmt;
}

function formatMonth(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${year}`;
}

function sanitizeHtml(html) {
  const allowed = new Set(['B', 'I', 'EM', 'STRONG', 'UL', 'OL', 'LI', 'A', 'BR', 'P']);
  if (!html) return '';
  return String(html)
    .replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
      const upper = String(tag).toUpperCase();
      if (!allowed.has(upper)) return '';
      if (upper === 'A') {
        const href = attrs.match(/href\s*=\s*['"]([^'"]+)['"]/i);
        return href ? `<a href=\"${escapeAttr(href[1])}\">` : '<a>';
      }
      return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
    });
}

function normalizeLinks(basics, links) {
  const items = [];
  if (basics?.website) items.push({ label: basics.website, url: basics.website });
  if (basics?.linkedin) items.push({ label: 'LinkedIn', url: basics.linkedin });
  if (basics?.github) items.push({ label: 'GitHub', url: basics.github });
  (Array.isArray(links) ? links : []).forEach((l) => {
    if (typeof l === 'string') {
      if (l.trim()) items.push({ label: l, url: l });
      return;
    }
    const url = l?.url || l?.link || '';
    const label = l?.label || url;
    if (url) items.push({ label, url });
  });
  return items;
}

function normalizeProfile(profile) {
  if (!profile) return emptyProfile();
  const base = emptyProfile();
  if (!profile.basics) {
    return {
      ...base,
      basics: {
        ...base.basics,
        name: profile.name || '',
        headline: profile.bio || '',
        bio: profile.bio || ''
      },
      experience: Array.isArray(profile.experience) ? profile.experience.map((e) => ({ title: e })) : [],
      projects: Array.isArray(profile.projects) ? profile.projects.map((p) => ({ name: p })) : [],
      links: Array.isArray(profile.links) ? profile.links.map((l) => ({ url: l, label: l })) : []
    };
  }
  return {
    ...base,
    ...profile,
    basics: { ...base.basics, ...profile.basics },
    education: Array.isArray(profile.education) ? profile.education : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    links: Array.isArray(profile.links) ? profile.links : []
  };
}

function emptyProfile() {
  return {
    basics: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      bio: ''
    },
    education: [],
    experience: [],
    projects: [],
    skills: [],
    achievements: [],
    links: []
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
