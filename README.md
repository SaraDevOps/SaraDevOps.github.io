# Saraswathy S — portfolio

Cloud Engineer and DevOps Engineer at CloudJournee, Bengaluru. Plain HTML, CSS and JavaScript with no build step, deployed to GitHub Pages by GitHub Actions on every push to `main` (or `master`).

Live: https://saradevops.github.io/

## What's in here

```
index.html                     page content (edit text here)
assets/css/style.css           styles
assets/js/main.js              intro + walk-in name reveal, certification validity bar
assets/video/intro.mp4         walk-in + talking clip joined (watermarks removed, background pure white, her voice)
assets/video/final-pose.webp   last frame, shown if the video can't play or animations are off
assets/img/about-*.webp        About photo, one per gaze direction (her eyes follow the cursor)
assets/fonts/                  Archivo + Instrument Sans (SIL Open Font License)
.github/workflows/deploy.yml   validate → list placeholders → deploy to Pages
```

## Placeholders

Anything still unconfirmed is marked in `index.html` with `class="todo"` and shows on the page as a dashed red box. Replace the whole `<span class="todo">…</span>` with the real text. Every deploy lists the remaining ones as warnings in the Actions run.

## How the intro works

Pressing **Enter** plays `intro.mp4` (with sound; a button in the hero mutes it). `main.js` holds her position across the frame for every moment of the video (`TRACK`), and shows each letter of the name once she has walked past it. On phones the letters follow her progress instead. If the video can't play, the last frame is shown and the text appears normally.

## Deploy

1. Create a public repo named `SaraDevOps.github.io` and push these files to `main`.
2. **Settings → Pages → Build and deployment → Source → GitHub Actions** (one-time).
3. Watch the **Actions** tab; when it's green the site is live at `https://saradevops.github.io`.
