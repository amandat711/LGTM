# LGTM - COMP 307 Project

TRAN,   	AMANDA,     	261158347 ;
ZHANG,  	RITA,       	261167918 ;
LI,     	JOCELYNE,   	261178604 ;
DING,   	SHIRLEY,    	261168210 ;

Each of our instructions are described in our seperate README files 
## Running URL Link

[https://winter2026-comp307-group32.cs.mcgill.ca/](https://winter2026-comp307-group32.cs.mcgill.ca/)

Full demo run:

```
cd client         # frontend
npm install
npm run build

cd ../server      # backend
npm install
npm run init-db                                             # creates app.db in server/database
~/bin/cloudflared tunnel --url http://127.0.0.1:3000        # demo cloudflared tunnel for calendar sync
NODE_ENV=production PORT=3000 npm start
```

Important: Copy the generated `https://...trycloudflare.com` and set in `server/.env`:

```
CALENDAR_SYNC_PUBLIC_BASE_URL=https://...trycloudflare.com
```

## Tech Stack

- Frontend: React
- Backend: Node.js (Express)
- Database: SQLite3
- Hosting: SOCS + Cloudfare

## Design

[https://www.figma.com/design/8FH8U2YcMTHTTtA2lQAfGq/COMP-307---Design?node-id=57-6&t=JcOsFhzaSJM2k7MX-1](https://www.figma.com/design/8FH8U2YcMTHTTtA2lQAfGq/COMP-307---Design?node-id=57-6&t=JcOsFhzaSJM2k7MX-1)

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

Run the dev server (opens the app, default [http://localhost:3001](http://localhost:3001)):

```
npm start
```

## 🚀 Backend Setup

```
cd server
npm install
```

Run the API (default port **3000**):


| Command       | Use case                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` | **Recommended for development.** Uses [nodemon](https://nodemon.io/) to restart the server when you change `.js` files. |
| `npm start`   | Runs `node index.js` once; restart manually after edits.                                                                |


The React app is configured to call the API at `http://localhost:3000`. Keep the backend running while you use the frontend.

For route and payload details, see `server/README.md`.

## 🌐 Production Startup (SOCS)

For SOCS deployment, the reverse proxy should route your subdomain traffic to the backend on port `3000`.

1. Ensure the repo is located directly at `/home/cs307-user/app`.
2. Configure backend env vars in `server/.env`: message us for the .env
3. Build frontend static files:

```
cd /home/cs307-user/app/client
npm install
npm run build
```

1. Start backend in production:

```
cd /home/cs307-user/app/server
npm install
NODE_ENV=production PORT=3000 npm start
```

1. Quick health check:

```
curl -i http://127.0.0.1:3000/api/health
```

Optional: keep the process running with PM2:

```
cd /home/cs307-user/app/server
pm2 start index.js --name lgtm --update-env
pm2 logs lgtm
```

### Calendar Live Sync (Google/Outlook demo)

If hosting is VPN-only, calendar subscriptions will not refresh unless the feed URL is public.

1. Start backend (check above for instructions)
2. In another terminal, start temporary public tunnel:

```
~/bin/cloudflared tunnel --url http://127.0.0.1:3000
```

1. Copy the generated `https://...trycloudflare.com` and set in `server/.env`:

```
CALENDAR_SYNC_PUBLIC_BASE_URL=https://...trycloudflare.com
```

1. Restart backend (`NODE_ENV=production PORT=3000 npm start`) and use the new sync URL from the app modal.

Notes:

- Keep the tunnel running during the demo.
- Google and Outlook refresh subscribed ICS feeds periodically (not instant).

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

