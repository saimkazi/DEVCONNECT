# DevConnect — Setup Guide

## What you need installed
- Node.js (v18+)
- MySQL (running locally)

---

## Step 1 — Set up the database

Open MySQL and run the schema file once:

```
mysql -u root -p < backend/schema.sql
```

This creates the `devconnect` database and all tables.

---

## Step 2 — Set your MySQL password

Open `backend/server.js` and find this section near the top:

```js
const db = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',   // ← put your MySQL password here
  database: 'devconnect',
});
```

Change the empty string to your MySQL password.

---

## Step 3 — Install backend dependencies

```
cd backend
npm install
```

---

## Terminal 1 — Start the backend

```
cd backend
node server.js
```

You should see:
```
✅ MySQL connected
🚀 DevConnect API running at http://localhost:3000
```

---

## Terminal 2 — Start the frontend

From the project root, serve the frontend folder with any static server.

If you have Node installed you can use `npx`:

```
npx serve frontend -p 8080
```

Or if you prefer Python:

```
cd frontend
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

---

## File structure

```
devconnect-simple/
├── backend/
│   ├── server.js       ← entire backend in one file
│   ├── schema.sql      ← run this once in MySQL
│   └── package.json
│
└── frontend/
    ├── index.html          ← homepage / browse
    ├── css/styles.css      ← all styles
    ├── js/app.js           ← all shared JS (fetch, auth, card builder)
    └── pages/
        ├── login.html
        ├── signup.html
        ├── cv.html         ← CV detail view (?id=X)
        ├── edit-cv.html    ← create / edit your CV
        ├── search.html     ← search with filters
        └── profile.html    ← redirects to your CV
```

## API endpoints (all at localhost:3000)

| Method | Path | What it does |
|--------|------|-------------|
| POST | /api/register | Create account |
| POST | /api/login | Log in |
| POST | /api/logout | Log out |
| GET | /api/me | Who am I? |
| GET | /api/cvs | List all public CVs (supports ?q= and ?skill=) |
| GET | /api/cvs/:id | Get one CV |
| GET | /api/my-cv | Get your own CV (must be logged in) |
| POST | /api/cvs | Create your CV |
| PUT | /api/cvs/:id | Update your CV |
| DELETE | /api/cvs/:id | Delete your CV |
