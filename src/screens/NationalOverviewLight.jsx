/* =============================================================
   NationalOverviewLight.jsx
   Canadian Business Dashboard — Slides 3 (EN) + 4 (FR)
   National Overview, Light Theme.

   Converted from national-overview-slide.html.
   Follows the same bilingual fade pattern as IntroScreen.jsx.

   Props:
     lang (optional) — "en" | "fr"
       When provided, App.jsx controls the language and the
       internal EN → FR cycling is disabled.
       When omitted, the component self-cycles (standalone use).
   ============================================================= */

import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import gcWordmark from "../assets/sig-blk-gov-en.svg";
import "./NationalOverviewLight.css";

// Register all Chart.js components once at module load
Chart.register(...registerables);


/* =============================================================
   CHART DATA
   Source: Statistics Canada, Canadian Business Counts
   Reference period: June (July-dated CSV per StatCan semi-annual
   cycle). Period definitions per CLAUDE.md + data-rules.md:
     Pre-COVID  → all years ≤ 2019  (indices 0–4)
     COVID      → 2020–2021         (indices 5–6)
     Post-COVID → 2022 onward       (indices 7–10)
   Data is language-independent — declared once outside CONTENT.
   ============================================================= */
const CHART_LABELS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const WITH_EMP = [
  1254937, 1265751, 1270783, 1283789, // pre-COVID: 2015–2018
  1311397,                             // pre-COVID: 2019 (peak)
  1302392, 1300633,                    // COVID:      2020–2021
  1336336, 1351744, 1358077, 1372109,  // post-COVID: 2022–2025
];

const WITHOUT_EMP = [
  2614908, 2631372, 2777670, 2859965, // pre-COVID: 2015–2018
  2835732,                             // pre-COVID: 2019
  2860194, 2850191,                    // COVID:      2020–2021
  3021567, 3236753, 3483724, 3667853,  // post-COVID: 2022–2025
];


/* =============================================================
   BILINGUAL CONTENT
   All translatable strings. Chart data stays in CHART_LABELS /
   WITH_EMP / WITHOUT_EMP above — only axis/tooltip labels here.
   ============================================================= */
const CONTENT = {
  en: {
    /* Header */
    wordmarkAlt: "Government of Canada",
    source1:     "Statistics Canada · Open Government Portal",
    source2:     "Canadian Business Counts · Tables 33-10-0034-01 to 33-10-1096-01",

    /* Title block */
    title:    "Canada's Business Boom: Who's Actually Hiring?",
    subtitle:
      "Canada crossed 5 million businesses for the first time in 2025 — " +
      "but nearly all growth came from self-employment, not employers.",

    /* Stat cards */
    stats: [
      {
        accent:   "accent-green",
        label:    "Non-Employer Growth",
        value:    "+40.3%",
        sublabel: "2015 → 2025 · 2.6M → 3.7M businesses",
      },
      {
        accent:   "",
        label:    "Employer Growth",
        value:    "+9.3%",
        sublabel: "2015 → 2025 · 1.25M → 1.37M businesses",
      },
      {
        accent:   "accent-red",
        label:    "COVID Employer Drop",
        value:    "−28,783",
        sublabel: "Dec 2019 → Dec 2020 · Largest single-period decline on record",
      },
      {
        accent:   "accent-orange",
        label:    "Employer Firms per 1,000 Canadians",
        value:    "~33",
        sublabel: "Down from ~35 in 2015 · Hiring base shrinking per capita",
      },
      {
        accent:   "accent-teal",
        label:    "Self-Employed Share",
        value:    "72.8%",
        sublabel: "Up from 67.6% in 2015 · 7 in 10 Canadian businesses have no employees",
      },
    ],

    /* Chart labels (text only — data unchanged) */
    chart: {
      datasetWithout: "Without employees",
      datasetWith:    "With employees",
      yTitle:         "Number of businesses",
      bandLabels:     { pre: "Pre-COVID", covid: "COVID", post: "Post-COVID" },
    },

    /* Legend labels (below chart) */
    legendLabels: ["Businesses without employees", "Businesses with employees"],

    /* Source line (below chart) */
    sourceLine:
      "Statistics Canada — Canadian Business Counts " +
      "(Tables 33-10-0034-01 to 33-10-1096-01)" +
      " |  June reference period snapshots, 2015–2025" +
      " |  Pre-COVID: ≤ 2019 · COVID: 2020–2021 · Post-COVID: 2022+",

    /* Insight box */
    insightLabel: "National Insight",
  },

  fr: {
    /* Header */
    wordmarkAlt: "Gouvernement du Canada",
    source1:     "Statistique Canada · Portail du gouvernement ouvert",
    source2:
      "Dénombrement des entreprises canadiennes " +
      "· Tableaux 33-10-0034-01 à 33-10-1096-01",

    /* Title block */
    title:
      "L’essor des entreprises au Canada : " +
      "qui embauche vraiment ?",
    subtitle:
      "Le Canada a franchi le cap des 5 millions d’entreprises " +
      "pour la première fois en 2025 — mais la quasi-totalité " +
      "de la croissance provient du travail autonome, et non des employeurs.",

    /* Stat cards */
    stats: [
      {
        accent:   "accent-green",
        label:    "Croissance des non-employeurs",
        value:    "+40,3 %",
        sublabel: "2015 → 2025 · 2,6 M → 3,7 M entreprises",
      },
      {
        accent:   "",
        label:    "Croissance des entreprises employeuses",
        value:    "+9,3 %",
        sublabel: "2015 → 2025 · 1,25 M → 1,37 M entreprises",
      },
      {
        accent:   "accent-red",
        label:    "Baisse des employeurs durant la COVID",
        value:    "−28 783",
        sublabel:
          "Déc. 2019 → Déc. 2020 " +
          "· Plus importante baisse sur une seule période",
      },
      {
        accent:   "accent-orange",
        label:    "Entreprises employeuses pour 1 000 Canadiens",
        value:    "~33",
        sublabel:
          "En baisse depuis ~35 en 2015 " +
          "· Base d’embauche en recul par habitant",
      },
      {
        accent:   "accent-teal",
        label:    "Part des travailleurs autonomes",
        value:    "72,8 %",
        sublabel:
          "En hausse depuis 67,6 % en 2015 " +
          "· 7 entreprises sur 10 n’ont pas d’employés",
      },
    ],

    /* Chart labels (text only — data unchanged) */
    chart: {
      datasetWithout: "Sans employés",
      datasetWith:    "Avec employés",
      yTitle:         "Nombre d’entreprises",
      bandLabels:     { pre: "Pré-COVID", covid: "COVID", post: "Post-COVID" },
    },

    /* Legend labels (below chart) */
    legendLabels: [
      "Entreprises sans employés",
      "Entreprises avec employés",
    ],

    /* Source line (below chart) */
    sourceLine:
      "Statistique Canada — Dénombrement des entreprises " +
      "(Tableaux 33-10-0034-01 à 33-10-1096-01)" +
      " |  Instantanés de juin, 2015–2025" +
      " |  Pré-COVID : ≤ 2019 · COVID : 2020–2021 · Post-COVID : 2022+",

    /* Insight box */
    insightLabel: "Données nationales",
  },
};


/* =============================================================
   TIMING CONSTANTS
   Match IntroScreen.jsx — FADE_MS must equal the CSS transition
   duration set in NationalOverviewLight.css (.nov-content).
   ============================================================= */
const DISPLAY_MS = 500; // ms each language is fully visible
const FADE_MS    = 500; // ms for fade-out before language swap


/* =============================================================
   COMPONENT
   ============================================================= */
export default function NationalOverviewLight({ lang: propLang }) {
  const [lang, setLang]       = useState(propLang ?? "en");
  const [visible, setVisible] = useState(true);
  const chartRef              = useRef(null);   // canvas DOM element
  const chartInstanceRef      = useRef(null);   // Chart.js instance


  // Sync local state when App.jsx changes the lang prop.
  // Handles the case where NationalOverviewLight stays mounted
  // across slide 3 → slide 4 without unmounting (same component type).
  useEffect(() => {
    if (propLang !== undefined) setLang(propLang);
  }, [propLang]);


  /* ── EN → FR → EN bilingual cycle ───────────────────────────
     Disabled when a lang prop is provided — App.jsx owns the language.
     ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (propLang !== undefined) return; // parent is driving language

    const displayTimer = setTimeout(() => {
      // Begin fade-out
      setVisible(false);

      // After fade completes: swap language and fade back in
      const swapTimer = setTimeout(() => {
        setLang((prev) => (prev === "en" ? "fr" : "en"));
        setVisible(true);
      }, FADE_MS);

      return () => clearTimeout(swapTimer);
    }, DISPLAY_MS);

    return () => clearTimeout(displayTimer);
  }, [lang, propLang]); // re-trigger each time lang or prop changes


  /* ── Chart initialisation ─────────────────────────────────
     Re-runs on lang change so tooltip / axis labels update.
     Destroys the previous instance before creating a new one
     to avoid the "Canvas is already in use" Chart.js warning.
     ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!chartRef.current) return;

    // Tear down existing instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const c = CONTENT[lang].chart;

    /* ── BACKGROUND BAND PLUGIN ──────────────────────────────
       Draws three shaded regions matching the official project
       period definitions. Lifted verbatim from the HTML source.
       ────────────────────────────────────────────────────────*/
    const bandPlugin = {
      id: "bandPlugin",
      beforeDraw(chart) {
        const {
          ctx,
          chartArea: { top, bottom },
          scales: { x },
        } = chart;

        // Helper: fill a band between two x-axis data indices
        function drawBand(idxStart, idxEnd, fillStyle) {
          const x0 = x.getPixelForValue(idxStart);
          const x1 = x.getPixelForValue(idxEnd);
          ctx.save();
          ctx.fillStyle = fillStyle;
          ctx.fillRect(x0, top, x1 - x0, bottom - top);
          ctx.restore();
        }

        // Pre-COVID band: 2015–2019 (indices 0–4)
        drawBand(0, 4, "rgba(179, 200, 224, 0.22)");  // --pre-covid-blue tint
        // COVID band: 2020–2021 (indices 5–6)
        drawBand(5, 6, "rgba(204, 0, 0, 0.07)");       // --red tint
        // Post-COVID band: 2022–2025 (indices 7–10)
        drawBand(7, 10, "rgba(229, 243, 241, 0.75)");  // --teal-pale tint

        // Band labels
        ctx.save();
        ctx.font       = "600 11px Segoe UI, system-ui, sans-serif";
        ctx.textAlign  = "center";

        // Pre-COVID label
        ctx.fillStyle   = "#6A90B0";
        ctx.globalAlpha = 1;
        ctx.fillText(
          c.bandLabels.pre,
          (x.getPixelForValue(0) + x.getPixelForValue(4)) / 2,
          top + 15,
        );

        // COVID label
        ctx.fillStyle   = "#CC0000";
        ctx.globalAlpha = 0.60;
        ctx.fillText(
          c.bandLabels.covid,
          (x.getPixelForValue(5) + x.getPixelForValue(6)) / 2,
          top + 15,
        );

        // Post-COVID label
        ctx.fillStyle   = "#006B5E";
        ctx.globalAlpha = 0.75;
        ctx.fillText(
          c.bandLabels.post,
          (x.getPixelForValue(7) + x.getPixelForValue(10)) / 2,
          top + 15,
        );

        ctx.restore();
      },
    };

    /* ── CHART CONFIG ────────────────────────────────────────
       Structure, palette, axis formatting, tooltip style, and
       point rendering match the HTML prototype exactly.
       ────────────────────────────────────────────────────────*/
    chartInstanceRef.current = new Chart(
      chartRef.current.getContext("2d"),
      {
        type: "line",
        plugins: [bandPlugin],
        data: {
          labels: CHART_LABELS,
          datasets: [
            {
              label:                c.datasetWithout,
              data:                 WITHOUT_EMP,
              borderColor:          "#006B5E",              // --teal
              backgroundColor:      "rgba(0,107,94,0.08)",
              borderWidth:          3,
              pointRadius:          6,
              pointHoverRadius:     9,
              pointBackgroundColor: "#006B5E",
              pointBorderColor:     "#FFFFFF",
              pointBorderWidth:     2,
              fill:                 false,
              tension:              0.35,
              order:                1,
            },
            {
              label:                c.datasetWith,
              data:                 WITH_EMP,
              borderColor:          "#003366",              // --navy
              backgroundColor:      "rgba(0,51,102,0.06)",
              borderWidth:          3,
              pointRadius:          6,
              pointHoverRadius:     9,
              pointBackgroundColor: "#003366",
              pointBorderColor:     "#FFFFFF",
              pointBorderWidth:     2,
              fill:                 false,
              tension:              0.35,
              order:                2,
            },
          ],
        },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false }, // custom legend rendered below chart
            tooltip: {
              backgroundColor: "#1A1A1A",
              titleColor:      "#FFFFFF",
              bodyColor:       "#CCCCCC",
              padding:         14,
              callbacks: {
                label(ctx) {
                  const val = ctx.raw.toLocaleString("en-CA");
                  return `  ${ctx.dataset.label}: ${val}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid:   { color: "#CCCCCC", lineWidth: 0.5 },
              ticks:  { color: "#555555", font: { size: 13, weight: "600" } },
              border: { color: "#CCCCCC" },
            },
            y: {
              min:    900000,
              grid:   { color: "#CCCCCC", lineWidth: 0.5 },
              ticks: {
                color: "#555555",
                font:  { size: 12 },
                callback(val) {
                  if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
                  return (val / 1000).toFixed(0) + "K";
                },
                maxTicksLimit: 8,
              },
              border: { color: "#CCCCCC" },
              title: {
                display: true,
                text:    c.yTitle,
                color:   "#555555",
                font:    { size: 12, weight: "600" },
              },
            },
          },
        },
      },
    );

    // Cleanup: destroy chart on lang change or unmount
    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [lang]);


  /* ── Convenience alias ───────────────────────────────────── */
  const c = CONTENT[lang];


  /* ── JSX ─────────────────────────────────────────────────── */
  return (
    <div className="national-overview-light">

      {/* ── HEADER ───────────────────────────────────────────
          GoC wordmark on the left, data source on the right.
          Stays outside the fade wrapper (structural chrome).  */}
      <div className="slide-header">
        <div className="goc-wordmark">
          <img src={gcWordmark} alt={c.wordmarkAlt} />
        </div>
        <div className="slide-source">
          {c.source1}<br />
          {c.source2}
        </div>
      </div>

      {/* ── RED ACCENT BAR ───────────────────────────────────
          Full-width brand rule below the header.             */}
      <div className="accent-bar" aria-hidden="true" />

      {/* ── CONTENT (fades on language swap) ─────────────────
          Everything below the accent bar fades in/out.       */}
      <div className={`nov-content${visible ? " nov-visible" : " nov-hidden"}`}>

        {/* ── TITLE BLOCK ────────────────────────────────── */}
        <h1>{c.title}</h1>
        <p className="subtitle">{c.subtitle}</p>

        {/* ── STAT STRIP (5 cards) ───────────────────────── */}
        <div className="stats-strip">
          {c.stats.map((stat, i) => (
            <div
              key={i}
              className={`stat-card${stat.accent ? ` ${stat.accent}` : ""}`}
            >
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-sublabel">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* ── CHART ──────────────────────────────────────── */}
        <div className="chart-wrapper">
          <div className="chart-canvas-wrap">
            <canvas ref={chartRef} id="bizChart" />
          </div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: "var(--teal)" }} />
              {c.legendLabels[0]}
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: "var(--navy)" }} />
              {c.legendLabels[1]}
            </div>
          </div>
        </div>

        {/* ── SOURCE LINE ────────────────────────────────── */}
        <p className="source-line">{c.sourceLine}</p>

        {/* ── INSIGHT BOX ────────────────────────────────── */}
        <div id="national" role="note" aria-label={c.insightLabel}>
          <div className="insight-label">{c.insightLabel}</div>

          {lang === "en" ? (
            <p>
              In the post-COVID period (2022→2025), Canada added over{" "}
              <strong>646,000 non-employer businesses</strong> — while employer
              firm counts grew by just <strong>35,773</strong>. Employer firms
              have essentially plateaued since mid-2023, even as immigration and
              GDP continued to grow. Since 2015, for every{" "}
              <strong>1 new employer business</strong> created, self-employment
              added <strong>9 more</strong>.
            </p>
          ) : (
            <p>
              Dans la période post-COVID (2022→2025), le Canada a ajouté plus
              de{" "}
              <strong>646&nbsp;000 entreprises sans employés</strong> — alors
              que le nombre d&apos;entreprises employeuses n&apos;a augmenté que
              de <strong>35&nbsp;773</strong>. Les entreprises employeuses sont
              essentiellement stabilisées depuis mi-2023, même si
              l&apos;immigration et le PIB ont continué de croître. Depuis 2015,
              pour chaque{" "}
              <strong>1 nouvelle entreprise employeuse</strong> créée, le
              travail autonome en a ajouté <strong>9 de plus</strong>.
            </p>
          )}
        </div>

      </div>{/* end .nov-content */}

      {/* ── LANGUAGE BADGE (bottom-right) ────────────────── */}
      <div
        className="nov-lang-badge"
        aria-label={`Language: ${lang.toUpperCase()}`}
      >
        {lang.toUpperCase()}
      </div>

    </div>
  );
}
