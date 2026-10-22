# BirthSite

A cinematic, personalized birthday surprise built with Next.js, TypeScript, Tailwind CSS, and Motion for React. A countdown, velvet curtain reveal, cloud transition, and birth-year gate lead into a celebration with memories, a letter, floating balloons, confetti, a birthday cake, and a final wish.

## Run locally

Use Node.js 24 (pinned in `.nvmrc`) and npm. Node.js 22 or newer is supported. The repository includes a dependency lockfile.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the development server address printed by Next.js in your local browser. The default birthday experience is Olivia’s demo at `/`; its birth-year password is **2006**. The admin dashboard is at `/admin`. Customer celebrations use `/c/<customer-slug>`.

The demo works without any credentials. To enable the admin, supply your own `ADMIN_PASSWORD` (at least 16 characters) and `ADMIN_SESSION_SECRET` (at least 32 characters) in `.env.local`, then restart the app. There is no default admin password. Generate these values with a password manager or another cryptographically secure generator. Never commit `.env.local` or put credentials in frontend code.

## Personalize a celebration

1. Sign in at `/admin` and choose **New celebration**.
2. Set the recipient’s name, displayed birthday, unique share-link slug, and four-digit birth-year password.
3. Select a blush, lavender, or champagne theme and edit the reveal headline and welcome message.
4. Add photo URLs and captions, a personal letter, the sender’s name, and a final wish.
5. Save, preview, and copy the customer’s `/c/<slug>` link.

Photos accept direct HTTPS image URLs or local `/images/…` paths. Put locally hosted images under `public/images/`. Photo uploads are not included; use your own image host or an object-storage provider for customer assets. Only use photos you have permission to share. Leave the password field empty while editing to retain the existing password. Deleting a celebration requires confirmation and permanently removes it.

The built-in Olivia experience is an immutable sample, separate from managed customer records. Its public defaults are in `lib/demo.ts`; private password verification stays on the server. Customize sold customer experiences through the dashboard instead of changing the sample.

## Storage and security

During local development, customer records use the ignored `.birthsite-data/` JSON data store. This is convenient for development and is **not durable on Vercel’s serverless filesystem**. Set `DATABASE_URL` to a Neon PostgreSQL connection string before using customer management in production. The server initializes its required database tables. Include the connection string’s SSL options. Production customer management fails closed when persistent storage is not configured.

Admin authentication uses a signed, HTTP-only cookie and a server-side password check. Mutation endpoints validate the request origin. Login and birth-year attempts are throttled. Sensitive environment values are never exposed with `NEXT_PUBLIC_` variables. Birth years are intentionally low-entropy passwords: the birthday gate is intended for a personal surprise, so avoid storing sensitive documents or private financial or medical data in a celebration.

## Validate

```sh
npm run check
npm run build
npm run test:e2e
npm run start
```

`check` generates Next.js route types and runs TypeScript and ESLint. `build` creates the production application; `start` serves that build. Stop any running development server before running the end-to-end suite; it starts its own isolated server on port 3102 with temporary test credentials and never uses an inherited database. On machines without Chromium installed, first run `npx playwright install --with-deps chromium`. The end-to-end suite exercises the interactive birthday experience and server authorization. See `package.json` and the test configuration for exact commands and browser prerequisites. Use the production build when checking deployment behavior. Development uses Next.js’s supported Webpack mode to avoid a Turbopack Fast Refresh loop in the installed release; production builds use Turbopack.

## Deploy to Vercel

1. Push your branch to GitHub and import the repository into Vercel.
2. Keep the **Next.js** framework preset, use `npm run build`, and let Vercel install from `package-lock.json`.
3. Add `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `DATABASE_URL` in the Vercel project’s environment settings. Use separate secrets for preview and production deployments.
4. Deploy, then verify the birthday flow, `/admin` login, customer creation, and a saved customer’s share link.

No secrets are needed for the public sample experience. The admin requires secure configuration. Do not use the local JSON store for commercial production hosting. Custom-domain configuration, payment processing, image storage, customer consent, and your business’s legal terms are separate deployment decisions.

## Open a GitHub pull request

Review the final diff before publishing:

```sh
git status --short
git diff --stat
git switch -c feat/birthsite-experience
git add .
git commit -m "Build personalized BirthSite birthday experience"
git push -u origin feat/birthsite-experience
gh pr create --base main --title "Build personalized BirthSite birthday experience" --body "Add the cinematic birthday flow, reusable customer personalization, secure admin, and deployment documentation."
```

If GitHub CLI authentication is unavailable, use GitHub’s **Compare & pull request** button after pushing the branch. Check that no environment files, local customer data, build output, or browser artifacts are staged. The repository’s `.gitignore` excludes development and secret files.

## Demo assets

See [ASSETS.md](ASSETS.md) for the locally served fonts, sample photographs, original sources, and included licenses. Replace the placeholder travel photos with customer-owned photos when personalizing a paid celebration.
