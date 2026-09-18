# Household Deal

A phone web app that deals today’s household jobs so nobody has to pick names.

Each day it assigns every job that must happen (daily musts plus rotating jobs that are due), splitting them across whoever is home. Longer jobs count more. Kids only get jobs they are allowed to do. Extra jobs sit in **Up for grabs**.

## On your phone

1. Open the GitHub Pages URL.
2. Create a household (or join with a code).
3. Safari / Chrome: **Add to Home Screen**.
4. Pick **Me** on each phone.

Until Firebase is connected, data stays on that one device.

## Local development

```bash
cd household-deal
npm install
npm test
npm run dev
```

## Personal GitHub Pages

This repo is set up to publish from GitHub Actions. You need **your** github.com account (not a work/Cursor host).

1. `gh auth login` to github.com with your personal user.
2. Create the repo `household-deal` and push `main`.
3. Repo **Settings → Pages → GitHub Actions**.
4. Add a free [Firebase](https://console.firebase.google.com/) project:
   - Enable **Anonymous** auth
   - Create a **Firestore** database
   - Paste [`firestore.rules`](firestore.rules) into Firestore Rules and publish
5. Copy the Firebase web app keys into GitHub **Settings → Secrets and variables → Actions**:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
6. Push or re-run the **Deploy GitHub Pages** workflow.

The family URL will be `https://spart1cle.github.io/household-deal/`.

For local Firebase, copy `.env.example` to `.env` and fill the same keys.
