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

- McGill VPN (if not on the network)
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

Run the dev server (opens the app, default [http://localhost:3000](http://localhost:3000)):

```
npm start
```

## 🚀 Backend Setup

```
cd server
npm install
```

Run the API (default port **4000**):

| Command | Use case |
|--------|----------|
| `npm run dev` | **Recommended for development.** Uses [nodemon](https://nodemon.io/) to restart the server when you change `.js` files. |
| `npm start` | Runs `node index.js` once; restart manually after edits. |

The React app is configured to call the API at `http://localhost:4000`. Keep the backend running while you use the frontend.

For route and payload details, see `server/README.md`.

## 📊 Database

- SQLite3 is used (no external database server required)
- Database is stored locally as a file
- Schema is defined in `server/database/booking_schema.sql`

### Quick Start: Seed Sample Data

To quickly populate the database with sample users, availabilities, and appointments:

```
./data-starter.sh
```

This will:
- Recreate the database schema
- Seed one professor and one student
- Create sample availabilities and appointments

**Note:** If the backend server is already running, restart it after running this script.

### Manual Setup

If you prefer to set up the database manually:

From the `server` folder:

```
npm run init-db
```

This will create the database and initialize all tables (without sample data).

### Opening SQLite

From the `server` folder:

```
sqlite3 database/app.db
```

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
*If schema changes*, run `./data-starter.sh` again to rebuild, or manually delete `app.db` and run `npm run init-db`.

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
