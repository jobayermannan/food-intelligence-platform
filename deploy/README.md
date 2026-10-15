# Vercel and Neon production setup

Deploy the web and API as separate Vercel projects from this monorepo. Set the
web project root to `apps/web` and the API project root to `apps/api`. The API
project configuration pins its Node.js Function to Singapore (`sin1`).

The web project needs `API_ORIGIN` during its build. Set it to the stable HTTPS
production URL of the API project. The Next.js `/api` rewrite keeps browser
requests on the web origin while Vercel proxies them to the API.

The API project needs the runtime variables in `production.env.example`. Use
Neon's pooled URL, with a `-pooler` hostname and `sslmode=require`, for
`DATABASE_URL`. The API pool defaults to four connections on Vercel and uses
Vercel's database-pool lifecycle helper. Set `DATABASE_POOL_MAX` only when a
measured connection budget requires a different value.

Create the production Neon database empty. Do not import a local database.
Run the existing migration command once from an operator or CI environment with
`DATABASE_URL` set to Neon's direct TLS URL:

```powershell
npm run db:migrate
```

The migration creates the schema and standard role codes only. It does not add
development users, businesses, locations, sessions, or sample operational data.

Docker remains supported as a fallback. The web Docker image receives
`API_ORIGIN` as a build argument; the API Docker image continues to use `PORT`
and its runtime `DATABASE_URL`.
