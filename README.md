# NS FITNESS

NS FITNESS is a gym membership management app for a gym owner and its members. It uses React, Vite, and Tailwind CSS on the frontend, with Express, Mongoose, and MongoDB on the backend.

[Open NS Fitness](https://ns-fitness.netlify.app/)

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

## Accounts and sign-in

Admins and members sign in using a phone number and password. Ten-digit numbers use India's +91 country code. Enter other international numbers with their country code.

### Create an admin from VS Code

Open a terminal in the project root. To create an admin for the live gym, use the same database in `backend/.env` as Render uses for `MONGODB_URI`. Temporarily add `ADMIN_PHONE` and `ADMIN_PASSWORD` to `backend/.env`. Choose a password of at least 12 characters and at most 72 UTF-8 bytes. From the project root, run:

```powershell
node backend/src/createAdmin.js
```

After the script prints **Admin account created.**, remove `ADMIN_PHONE` and `ADMIN_PASSWORD` from the local file. You can sign in immediately. Repeat with an unused phone number for each additional admin.

### Register a member

1. Sign in as an admin and open **Add member**. Enter the member's details, initial password, and membership plan.
2. Select **Create member**. The app saves the profile, login, and first membership together.
3. Give the member their login details. They can use [Sign in](https://ns-fitness.netlify.app/login) or the sign-in form on the [Sign up page](https://ns-fitness.netlify.app/signup). New visitors can call the gym from that page to arrange registration.

Passwords start hidden on **Sign in**, **Sign up**, and **Add member**. Select the eye inside the password field to show the password, then select it again to hide it.

### Migrate an older email-based database

Stop the old backend before switching versions. For a single existing admin, set `ADMIN_PHONE` in `backend/.env` to the number that admin will use to sign in. For multiple admins, set `ADMIN_PHONES_JSON` to a JSON object mapping each admin's MongoDB user ID to their phone number. Members use the mobile number already saved on their profile.

Run `node backend/src/migratePhones.js` from the project root for a read-only check. Resolve any missing numbers or collisions it reports. With a backup available and the backend still stopped, run `node backend/src/migratePhones.js --apply` to populate the new identifiers and remove the old email fields and indexes. Then start the updated app. Existing passwords and membership records are preserved. A fresh database can skip the migration.

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

## Production deployment

The frontend runs on Netlify and the API runs on Render. MongoDB Atlas stores the gym's records.

| Service | Project settings |
| --- | --- |
| Netlify | Base directory `frontend`, build command `npm run build`, publish directory `dist`. The repository's `netlify.toml` sets `VITE_API_URL=/api`. |
| Render | Node web service with root directory `backend`, build command `npm ci --omit=dev`, and start command `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`. |

For this deployment, set **`CLIENT_ORIGIN=https://ns-fitness.netlify.app`** in Render. The login route checks the browser's origin before it checks the password. If the form says **Access denied**, confirm that the setting matches the address used to open the frontend, including `https://`, with no trailing slash or path. Save any correction and redeploy the backend.

Netlify forwards `/api/*` to `https://ns-fitness.onrender.com/api/:splat` and serves the React app for other routes. After a deployment, open the [health endpoint through Netlify](https://ns-fitness.netlify.app/api/health) and look for `{"status":"ready"}`. Then sign in, refresh the dashboard to check the session, and open the [public payment page](https://ns-fitness.netlify.app/pay).
