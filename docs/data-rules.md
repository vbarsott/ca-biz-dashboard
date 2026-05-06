# Data Rules & Transformations

## 1. General Rules
- All raw data must be stored in `/src/data/raw/`.
- All cleaned data must be stored in `/src/data/processed/`.
- All transformations must be documented and reproducible.
- No transformations should occur inside React components.

## 2. Cleaning Rules
- Remove rows with missing province/territory codes.
- Standardize province names:
  - AB, BC, MB, NB, NL, NS, NT, NU, ON, PE, QC, SK, YT
- Convert all year fields to integers.
- Normalize sector names (trim, title case).
- Convert revenue/expense values to numeric.

## 3. Derived Fields
- `growth_rate = (current_year - previous_year) / previous_year`
- `profit_margin = (revenue - expenses) / revenue`
- `rural_indicator = rural | urban`

## 4. COVID Comparison Rules
- Pre‑COVID: 2016–2019
- Post‑COVID: 2020–present
- Highlight:
  - Declines
  - Recovery slopes
  - Provinces with fastest recovery

## 5. Fun‑Fact Extraction Rules
- Identify outliers or unusual concentrations.
- Validate contextual facts using reputable sources.
- Combine data + context into a short bilingual insight.
- Each fun fact must map to a chart.

