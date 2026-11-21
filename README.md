# NS FITNESS

NS FITNESS is a gym membership management app for a gym owner and its members. It uses React, Vite, and Tailwind CSS on the frontend, with Express, Mongoose, and MongoDB on the backend.

| Who | What they can do |
| --- | --- |
| Gym owner | Create member accounts, update profiles, deactivate access, renew or suspend memberships, record manual payments, and upload the gym’s payment QR code. |
| Member | Sign in to view their profile, membership dates, outstanding balance, and receipt history. |
| Visitor | Open `/pay` to scan or download the gym’s QR code. The owner records payments manually after checking receipt. |

## Run locally

Use Node.js 22.12 or later and MongoDB Atlas or a local MongoDB replica set. Creating member accounts, renewing memberships, and recording payments use database transactions.

From the project root, run these PowerShell commands on first setup:

```powershell
npm.cmd --prefix backend ci
npm.cmd --prefix frontend ci
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Set the following values in `backend/.env`. To generate a JWT secret locally, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Connection string for the gym database. For Atlas, allow the backend’s network address. |
| `JWT_SECRET` | Private signing secret of at least 32 characters. Keep the same value across server restarts. |
| `CLIENT_ORIGIN` | Frontend origin. The local default is `http://localhost:5173`. |
| `PORT` | Backend port. The local default is `5000`. |

Start the backend and frontend in separate terminals from the root:

```powershell
npm.cmd --prefix backend run dev
```

```powershell
npm.cmd --prefix frontend run dev
```

Open [the local app](http://localhost:5173). The frontend defaults to the local API. To override it, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`. Frontend variables are visible to visitors.

## Create the first admin

Admins and members sign in using a phone number and password. Ten-digit numbers use India's +91 country code. Enter other international numbers with their country code.

### Upgrade an existing database

Stop the old backend before switching versions. For a single existing admin, set `ADMIN_PHONE` in `backend/.env` to the number that admin will use to sign in. For multiple admins, set `ADMIN_PHONES_JSON` to a JSON object mapping each admin's MongoDB user ID to their phone number. Members use the mobile number already saved on their profile.

Run `node backend/src/migratePhones.js` from the project root for a read-only check. Resolve any missing numbers or collisions it reports. With a backup available and the backend still stopped, run `node backend/src/migratePhones.js --apply` to populate the new identifiers and remove the old email fields and indexes. Then start the updated app. Existing passwords and membership records are preserved. A fresh database can skip the migration.

### New admin account

Temporarily add `ADMIN_PHONE` and `ADMIN_PASSWORD` to `backend/.env`. Choose a password of at least 12 characters and at most 72 UTF-8 bytes. From the project root, run:

```powershell
node backend/src/createAdmin.js
```

After the script prints **Admin account created**, remove those two bootstrap values and sign in. The script creates a new account and rejects a phone number already in use. To create a regular member, use **Admin → Add member**. The server assigns the member role and creates the profile, login, and initial membership together.

## Memberships and payments

- Choose a **1, 3, 6, or 12 month** plan. Renewing adds a new term to the member’s history. The gym uses India time, and each term includes its end date.
- In **Admin → Payments**, record cash, UPI, or bank transfers against a specific membership. Verified receipts reduce the balance and count toward revenue. Pending receipts await verification.
- In **Admin → Settings**, upload the gym QR as a PNG or JPEG up to 512 KB. Members can open it from their dashboard, and visitors can use the payment link on the sign-in page.
- Members can read their own records. Deactivating an account blocks sign-in and invalidates access on its next protected request.

## Project layout

| Path | Contents |
| --- | --- |
| `backend/app.js` | Express application, middleware, and API routes |
| `backend/src/` | Server startup, admin bootstrap script, models, controllers, routes, and authorization |
| `backend/test/` | Integration tests and optional Chrome layout checks |
| `frontend/src/` | Admin and member pages, public QR page, authentication context, and API client |

## Build and test

Build the React app before running the integration suite. The tests start a disposable MongoDB replica set and use temporary accounts. Set `MONGOD_BIN` to your MongoDB server executable if it is outside your PATH. Set `CHROME_BIN` to include browser login and layout checks.

```powershell
npm.cmd --prefix frontend run build
$env:MONGOD_BIN = 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node backend/test/phase8.mjs
```

## Deployment plan

The planned hosts are **Netlify for the frontend** and **Render for the backend**. Deployment is pending. Both can use the npm build and start scripts.

| Service | Settings |
| --- | --- |
| Netlify | Base directory `frontend`, build command `npm ci --include=dev && npm run build`, publish directory `dist`. Set `VITE_API_URL=/api`. |
| Render | Node web service, root directory `backend`, build command `npm ci --omit=dev`, start command `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN` to the exact Netlify HTTPS origin for the latter. |

When deploying, configure Netlify to proxy `/api/*` to the Render service’s `/api/:splat` first, then rewrite remaining frontend paths to `/index.html`. This lets the browser use the session cookie through the frontend origin. Verify `/api/health`, sign-in after refresh, and the public `/pay` page from the Netlify URL.
