# Publish the prototype

## GitHub repo + Pages (public link for submission)

1. Create a **public** repo on GitHub (or push this folder to an existing repo).
2. Push `main`:

```bash
cd ~/Projects/meeting-participation-metrics
git remote add origin https://github.com/YOUR_USERNAME/meeting-participation-metrics.git
git push -u origin main
```

3. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)**
4. Wait ~1–2 minutes. Your live coach URL:

   `https://YOUR_USERNAME.github.io/meeting-participation-metrics/`

5. Update `YOUR_USERNAME` in [README.md](../README.md) and [DESCRIPTION.md](../DESCRIPTION.md).

6. Open the Pages URL in an incognito window and click **Run demo mode** to verify.

## Local preview (before push)

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — required because the app uses ES modules.

## Rename repo (optional)

You may rename the GitHub repo to `speak-up-meeting-coach`; update the Pages URL in DESCRIPTION accordingly.
