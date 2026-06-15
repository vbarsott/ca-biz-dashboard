/* ═══════════════════════════════════════════════════════════════════════════
   charts.js — Shared Chart.js helpers for the Canadian Business Dashboard
   Requires Chart.js 4.4.1 to be loaded first.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── PALETTE ────────────────────────────────────────────────────────────── */
const PALETTE = {
  navy: "#003366",
  navyMid: "#1a4a7a",
  navyPale: "#eaf0f8",
  red: "#cc0000",
  redDark: "#990000",
  green: "#1d7a4f",
  teal: "#006b5e",
  tealPale: "#e5f3f1",
  orange: "#b54708",
  ink: "#1a1a1a",
  mid: "#555555",
  ghost: "#888888",
  border: "#cccccc",
  paper: "#f8f8f8",
  white: "#ffffff",
  preCovidBlue: "#b3c8e0",
  projectionBlue: "#7aafd4",
  accentRedBright: "#ff6b6b",
};

/* ── FONT ───────────────────────────────────────────────────────────────── */
const FONT = "Lato";

/* ── SHARED TOOLTIP CONFIG ──────────────────────────────────────────────── */
const TOOLTIP_DEFAULTS = {
  backgroundColor: PALETTE.ink,
  titleColor: PALETTE.white,
  bodyColor: PALETTE.border,
  padding: 14,
  cornerRadius: 6,
};

/* ── SHARED AXIS TICK CONFIG ────────────────────────────────────────────── */
const AXIS_TICK = {
  color: PALETTE.mid,
  font: { size: 14, family: FONT, weight: "600" },
};

const AXIS_TITLE_STYLE = {
  color: PALETTE.mid,
  font: { size: 14, family: FONT, weight: "600" },
};

/* ── SHARED GRID CONFIG ─────────────────────────────────────────────────── */
const GRID_STYLE = {
  color: PALETTE.border,
  lineWidth: 0.5,
};

const GRID_SUBTLE = { color: "rgba(0,0,0,0.06)" };

/* ── RESPONSIVE OPTIONS ─────────────────────────────────────────────────── */
const RESPONSIVE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
};

/* ── NUMBER FORMATTERS ──────────────────────────────────────────────────── */
/**
 * Format large numbers with M / K suffix (e.g. 1500000 → "1.5M")
 */
function fmtNum(val) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(0) + "K";
  return String(val);
}

/**
 * Format with Canadian locale (comma thousands)
 */
function fmtLocale(val) {
  return val.toLocaleString("en-CA");
}

/**
 * Format as percentage change with leading + for positive values
 */
function fmtPct(val) {
  return (val >= 0 ? "+" : "") + val.toFixed(1) + "%";
}

/* ── BAND PLUGIN ────────────────────────────────────────────────────────────
   Draws Pre-COVID / COVID / Post-COVID shaded background bands on line charts.
   Period definitions per CLAUDE.md §3.1:
     Pre-COVID  → ≤ 2019 (indices 0–4 for a 2015-based 11-point series)
     COVID      → 2020–2021 (indices 5–6)
     Post-COVID → 2022 onward (indices 7–10)
   ─────────────────────────────────────────────────────────────────────── */
const bandPlugin = {
  id: "bandPlugin",
  beforeDraw(chart) {
    const {
      ctx,
      chartArea: { top, bottom },
      scales: { x },
    } = chart;

    function drawBand(idxStart, idxEnd, fillStyle) {
      const x0 = x.getPixelForValue(idxStart);
      const x1 = x.getPixelForValue(idxEnd);
      ctx.save();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x0, top, x1 - x0, bottom - top);
      ctx.restore();
    }

    /* COVID band — indices 5–6 */
    drawBand(4, 6, "rgba(204, 0, 0, 0.07)");

    /* Band labels */
    ctx.save();
    ctx.font = `600 14px ${FONT}, system-ui, sans-serif`;
    ctx.textAlign = "center";

    ctx.fillStyle = PALETTE.red;
    ctx.globalAlpha = 0.6;
    ctx.fillText(
      "COVID",
      (x.getPixelForValue(4) + x.getPixelForValue(6)) / 2,
      top + 30,
    );

    ctx.restore();
  },
};

/* ── CENTRE-TEXT PLUGIN ─────────────────────────────────────────────────────
   Renders a headline stat + sub-label in the hole of a doughnut chart.
   Usage: pass options via chart.options.plugins.centreText = { value, label }
   OR override the afterDatasetDraw method directly for a fixed label.
   ─────────────────────────────────────────────────────────────────────── */
const centreTextPlugin = {
  id: "centreText",
  afterDatasetDraw(chart) {
    const opts = chart.options.plugins && chart.options.plugins.centreText;
    if (!opts) return;

    const {
      ctx,
      chartArea: { top, bottom, left, right },
    } = chart;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    /* Large headline value */
    ctx.font = `800 2.2rem ${FONT}, system-ui, sans-serif`;
    ctx.fillStyle = PALETTE.navy;
    ctx.fillText(opts.value, cx, cy - 12);

    /* Small sub-label */
    ctx.font = `600 0.75rem ${FONT}, system-ui, sans-serif`;
    ctx.fillStyle = PALETTE.mid;
    ctx.fillText(opts.label, cx, cy + 18);

    ctx.restore();
  },
};
