# Project Requirements

## 1. Functional Requirements
- Display a sequence of bilingual (EN/FR) data‑driven slides.
- Automatically rotate slides every ~10 seconds.
- Include smooth transitions between English and French.
- Load pre‑processed JSON datasets.
- Render charts using a consistent visual style.
- Display both percentages and absolute values when applicable.
- Include pre‑ and post‑COVID comparisons.
- Include trend projections for recovery timelines.
- Include “fun facts” derived from:
  - Dataset patterns
  - Internet‑verified contextual information

## 2. Non‑Functional Requirements
- Must run on a large TV screen.
- Must be readable from 3 metres.
- Must load quickly on GitHub Pages.
- Must use high‑contrast, accessible colour palettes.
- Must follow a simplified Government of Canada aesthetic.
- Must avoid clutter, dense text, or small fonts.
- Must be fully static (no backend).

## 3. Technical Requirements
- Built with React + Vite + JavaScript.
- Data processed in Excel and exported as JSON.
- Hosted on GitHub Pages at:
  https://vbarsott.github.io/ca-biz-dashboard/
- Use modular components for charts and screens.
- Centralized bilingual text management.

## 4. Constraints
- No user interaction.
- No scrolling.
- No external APIs at runtime.
- All data must be pre‑processed.
- Must support offline display once loaded.

