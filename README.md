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

---

## Prerequisites

- Node.js
- npm

Check versions:

```
node --version
npm --version
```

---

## Frontend Setup

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

---

## Backend Setup

```
cd server
npm install
```

Run:

```
node index.js
```

Default port: 5000

---

## Database

- SQLite3 is used
- No external database server required
- Database file is stored locally

Location:

```
server/database/lgtm.sqlite
```

Tables are initialized by backend code.

---

## Development Workflow

Run frontend and backend in separate terminals.

Frontend:

```
cd client
npm install
npm start
```

Backend:

```
cd server
npm install
node index.js
```


---

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
