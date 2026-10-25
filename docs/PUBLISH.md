# Publish the prototype (GitHub — public link for assignment)

The project is committed locally. To create the **public link** for your submission:

## GitHub (recommended for classmates)

1. Sign in at [github.com/new](https://github.com/new).
2. Repository name: `meeting-participation-metrics` (public).
3. Do **not** initialize with README (this repo already has one).
4. In Terminal, from this folder:

```bash
cd ~/Projects/meeting-participation-metrics
git remote add origin https://github.com/YOUR_USERNAME/meeting-participation-metrics.git
git push -u origin main
```

5. Replace `YOUR_USERNAME` in [README.md](../README.md) and [DESCRIPTION.md](../DESCRIPTION.md) with your GitHub username.
6. Open the repo in an incognito window to verify the link works.

## Optional: Cursor Origin backup

If you use Cursor-hosted repos:

```bash
export PATH="$HOME/.local/bin:$PATH"
origin auth login
origin repo create meeting-participation-metrics
# Add the printed clone URL as a second remote, e.g. git remote add cursor-origin <URL>
git push -u cursor-origin main
```

Origin repos are not public by default; use GitHub for the assignment link unless your instructor accepts Cursor codebase URLs.
