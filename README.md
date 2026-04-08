# LGTM - COMP 307 Project

## Tech Stack

- Frontend: React
- Backend: Node.js (Express)
- Database: SQLite3

## Project Structure

```
LGTM/
  client/   # React frontend
  server/   # Node/Express backend
```


## Prerequisites

- Node.js
- npm

Check versions:

```
node --version
npm --version
```


## 🖥️🎨 Frontend Setup

```
cd client
npm install
```

Run:

```
npm start
```

or:

```
npm run dev
```

## 🚀 Backend Setup

```
cd server
npm install
```

Run:

```
node index.js
```

Default port: 5000



## 📊 Database

- SQLite3 is used (no external database server required)
- Database is stored locally as a file
- Schema is defined in `server/database/booking_schema.sql`

### Initial Setup (first time only)

From the `server` folder:

```
npm run init-db
```

This will create the database and initialize all tables.

Location: `server/database/app.db`

Inside SQLite:

```
.tables                  -- list tables
.schema table_name       -- see structure
PRAGMA table_info(t);    -- columns

.headers on
.mode column            -- readable output

SELECT * FROM t LIMIT 10;

.timer on               -- query timing
.explain                -- debug query plan

.dump                   -- backup DB
.quit                   -- exit
```
### Notes (Schema change)
Do not commit `app.db` to Git (file already in `.gitignore`)
*If schema changes*, delete app.db and run `npm run init-db` again.

## Git Workflow (Rebase)

Before starting work:

```
git checkout main
git pull origin main
git checkout your-branch
git rebase main
```

After making changes:

```
git add .
git commit -m "message"
git push origin your-branch
```

If rebase conflicts occur:

```
# fix conflicts manually
git add .
git rebase --continue
```

If needed to cancel rebase:

```
git rebase --abort
```
