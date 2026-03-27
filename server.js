// server.js - DevConnect
// Run: node server.js
// Then open: http://localhost:3000

const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcrypt');
const mysql   = require('mysql2/promise');
const path    = require('path');

const app  = express();
const PORT = 3000;

// ============================================================
// DATABASE - put your MySQL password here
// ============================================================
const db = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',           // <-- YOUR MYSQL PASSWORD HERE
  database: 'devconnect',
  charset:  'utf8mb4',
});

let dbOk = false;
db.getConnection()
  .then(conn => {
    dbOk = true;
    console.log('MySQL connected OK');
    conn.release();
  })
  .catch(e => {
    console.error('MySQL FAILED: ' + e.message);
  });

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());

app.use(session({
  secret: 'devconnect-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Log every request
app.use(function(req, res, next) {
  console.log(req.method + ' ' + req.url);
  next();
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', function(req, res) {
  res.json({
    server: 'running',
    database: dbOk ? 'connected' : 'NOT connected',
    session: req.session.userId ? 'logged in as ' + req.session.username : 'not logged in',
  });
});

// ============================================================
// AUTH
// ============================================================

app.post('/api/register', async function(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?', [username, email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username or email already taken' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    req.session.userId   = result.insertId;
    req.session.username = username;
    req.session.save(function(err) {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ ok: true, user: { id: result.insertId, username } });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.post('/api/login', async function(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', [username, username]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId   = rows[0].id;
    req.session.username = rows[0].username;
    req.session.save(function(err) {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ ok: true, user: { id: rows[0].id, username: rows[0].username } });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.post('/api/logout', function(req, res) {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', function(req, res) {
  if (!req.session.userId) return res.json({ user: null });
  res.json({ user: { id: req.session.userId, username: req.session.username } });
});

// ============================================================
// CVs
// ============================================================

app.get('/api/cvs', async function(req, res) {
  try {
    const { q = '', skill = '' } = req.query;
    let sql = 'SELECT c.*, u.username FROM cvs c JOIN users u ON u.id = c.user_id WHERE c.is_public = 1';
    const params = [];
    if (q) { sql += ' AND (c.full_name LIKE ? OR c.description LIKE ?)'; params.push('%'+q+'%','%'+q+'%'); }
    if (skill) { sql += ' AND c.id IN (SELECT cv_id FROM cv_skills WHERE skill_name = ?)'; params.push(skill); }
    sql += ' ORDER BY c.updated_at DESC';
    const [cvs] = await db.query(sql, params);
    for (const cv of cvs) {
      const [skills] = await db.query('SELECT skill_name FROM cv_skills WHERE cv_id = ?', [cv.id]);
      cv.skills = skills.map(s => s.skill_name);
    }
    res.json({ cvs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.get('/api/my-cv', async function(req, res) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first' });
  try {
    const [rows] = await db.query('SELECT * FROM cvs WHERE user_id = ?', [req.session.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'No CV yet' });
    const cv = rows[0];
    const [skills] = await db.query('SELECT skill_name FROM cv_skills WHERE cv_id = ?', [cv.id]);
    cv.skills = skills.map(s => s.skill_name);
    res.json({ cv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.get('/api/cvs/:id', async function(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT c.*, u.username FROM cvs c JOIN users u ON u.id = c.user_id WHERE c.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'CV not found' });
    const cv = rows[0];
    const [skills] = await db.query('SELECT skill_name FROM cv_skills WHERE cv_id = ?', [cv.id]);
    cv.skills = skills.map(s => s.skill_name);
    res.json({ cv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.post('/api/cvs', async function(req, res) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first' });
  const { full_name, education, description, github, portfolio, linkedin, skills = [], is_public = true } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  try {
    const [existing] = await db.query('SELECT id FROM cvs WHERE user_id = ?', [req.session.userId]);
    if (existing.length > 0) return res.status(409).json({ error: 'You already have a CV' });
    const [result] = await db.query(
      'INSERT INTO cvs (user_id, full_name, education, description, github, portfolio, linkedin, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.session.userId, full_name, education||null, description||null, github||null, portfolio||null, linkedin||null, is_public?1:0]
    );
    for (const skill of skills) {
      await db.query('INSERT INTO cv_skills (cv_id, skill_name) VALUES (?, ?)', [result.insertId, skill]);
    }
    res.json({ ok: true, cvId: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.put('/api/cvs/:id', async function(req, res) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first' });
  const { full_name, education, description, github, portfolio, linkedin, skills = [], is_public = true } = req.body;
  const cvId = parseInt(req.params.id);
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  try {
    const [rows] = await db.query('SELECT id FROM cvs WHERE id = ? AND user_id = ?', [cvId, req.session.userId]);
    if (rows.length === 0) return res.status(403).json({ error: 'CV not found or not yours' });
    await db.query(
      'UPDATE cvs SET full_name=?, education=?, description=?, github=?, portfolio=?, linkedin=?, is_public=?, updated_at=NOW() WHERE id=?',
      [full_name, education||null, description||null, github||null, portfolio||null, linkedin||null, is_public?1:0, cvId]
    );
    await db.query('DELETE FROM cv_skills WHERE cv_id = ?', [cvId]);
    for (const skill of skills) {
      await db.query('INSERT INTO cv_skills (cv_id, skill_name) VALUES (?, ?)', [cvId, skill]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

app.delete('/api/cvs/:id', async function(req, res) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first' });
  const cvId = parseInt(req.params.id);
  try {
    const [rows] = await db.query('SELECT id FROM cvs WHERE id = ? AND user_id = ?', [cvId, req.session.userId]);
    if (rows.length === 0) return res.status(403).json({ error: 'CV not found or not yours' });
    await db.query('DELETE FROM cvs WHERE id = ?', [cvId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ============================================================
// STATIC FILES - serves all HTML/CSS/JS from same folder as server.js
// Must be LAST so API routes above take priority
// ============================================================
app.use(express.static(__dirname));

// ============================================================
// START
// ============================================================
app.listen(PORT, function() {
  console.log('');
  console.log('DevConnect running at http://localhost:' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/api/health');
  console.log('');
});