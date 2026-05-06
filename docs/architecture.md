# Architecture Notes

## 1. Tech Stack

- React + Vite
- JavaScript
- JSON datasets
- CSS modules
- GitHub Pages hosting

## 2. App Structure

```
src/
  assets/
  components/
  config/
  data/
  hooks/
  screens/
  styles/
  utils/
```

## 3. Screen Flow

1. Intro
2. New Business Creation
3. Rural Profile
4. Sector Comparisons
5. Fun Facts
6. Outro

## 4. Bilingual System

- All text stored in `/src/config/languages.json`.
- Each screen receives `{ lang }` prop.
- Auto‑toggle every 10 seconds.

## 5. Charting

- Chart library: Chart.js.
- All charts must:
  - Use large fonts
  - Use high contrast
  - Avoid clutter
  - Display EN/FR labels

## 6. Deployment

- Build → `/dist`
- GitHub Pages → `gh-pages` branch
- URL: https://vbarsott.github.io/ca-biz-dashboard/
