# GitHub and deployment setup

## 1. Get the source

The source repository is https://github.com/ShivamMathtech/mathverse-x. To work locally, clone it:

```bash
git clone https://github.com/ShivamMathtech/mathverse-x.git
cd mathverse-x
npm ci
```

A suitable repository description is:

> A local-first mathematical visualization and computational studio for interactive graphing, calculus, and future multidimensional exploration.

If you are using the ZIP to create your own separate repository, create an empty repository and run these commands from the extracted `mathverse-x` directory. Use your own repository URL in the remote command.

```bash
git init
git add .
git commit -m "Build MATHVERSE X Phase 1 foundation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mathverse-x.git
git push -u origin main
```

If a remote or Git history already exists, inspect it and retain it rather than reinitializing or force pushing. The source package contains no embedded GitHub credentials. Keep private backend tokens in your ignored .env file.

## 2. Import into Vercel

Select the repository in Vercel's New Project flow. Set Root Directory to the repository root. Do not select `frontend`: root package.json, package-lock.json and vercel.json are designed to work together as one npm workspace.

| Setting | Exact value |
| --- | --- |
| Framework | Vite |
| Node.js | 24.x |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | frontend/dist |
| Environment | No variables required |

Vercel's SPA rewrite is already included. Once the build succeeds, open your returned deployment URL and exercise the graph, console and a page reload. This package does not contain a deployed URL or claim a completed Vercel deployment.

## 3. Optional Python hosting

The supplied Vercel configuration hosts only the browser app. The Python service is a separate long-running process or Docker service because it spawns isolated SymPy jobs and enforces process deadlines. The package does not configure the Python API as a Vercel function.

For local Docker, first generate `backend/.env`, then run:

```bash
python scripts/configure_backend.py
docker compose up --build
```

For a remote container host, build `backend/Dockerfile`, expose port 8000 through HTTPS, and configure these runtime variables:

| Variable | Meaning |
| --- | --- |
| MATHVERSE_API_TOKEN | A random secret with at least 32 characters, generated independently for your deployment |
| CORS_ORIGINS | Comma-separated exact frontend origins, e.g. your actual Vercel URL, with no trailing slash |

The static app may use public `VITE_API_URL` for the API origin. Supply the token manually through Settings. Secrets do not belong in Vercel frontend environment variables. Explicitly enumerate preview origins if you need preview deployments to access the API. Do not set a wildcard origin.

Set a container memory limit and a small worker count. Two symbolic jobs can execute concurrently per API process; an additional request receives 429. An 8-second wall-clock timeout terminates over-budget jobs. Linux additionally enforces child CPU/address-space limits. Windows uses the same spawn protocol and wall-clock deadline; OS-level memory isolation should be supplied by the host/container for remote service operation.

## Common problems

- **Build cannot find package.json:** the root directory points to a parent folder or a ZIP wrapper. Choose the folder with root package.json and vercel.json.
- **Output directory not found:** use `frontend/dist`, and run `npm run build` from the repository root.
- **Blank graph after a syntax error:** correct the highlighted expression; valid curves continue plotting. See the finite-real-number domain restriction.
- **Windows platform dependency errors:** discard node_modules copied from another OS and run `npm ci` locally. Keep the provided cross-platform lockfile.
- **Python connection fails on the deployed frontend:** localhost refers to the visitor's own device; use a hosted HTTPS URL and exact CORS origin. The app intentionally rejects an HTTP backend from an HTTPS page.
- **401:** token is missing or incorrect. **503:** backend token was not configured with at least 32 characters. **408:** symbolic operation exceeded its deadline. **429:** both slots are occupied.
- **Downloaded file not visible:** check your browser's downloads panel and automatic-download permissions. A successful export preparation cannot override browser download restrictions.
- **Browser storage full:** export JSON and clear unneeded browser data yourself. The app displays storage failure rather than claiming a save succeeded.

## Documentation checked

Configuration follows the official documentation reviewed for this build:

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://mathjs.org/docs/expressions/security.html

Dependencies are pinned in package-lock.json, and direct Python requirements are pinned to the versions used for validation. Browser entry points and rendering code do not depend on the optional Python service being online.
