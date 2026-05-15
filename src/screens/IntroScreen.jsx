/* =============================================================
   IntroScreen.jsx
   Canadian Business Dashboard — Screen 1 of 6: Intro / Cover
   Displays an overview of the dashboard with EN → FR bilingual
   fade transition.

   Props:
     lang (optional) — "en" | "fr"
       When provided, App.jsx controls the language and the
       internal EN → FR cycling is disabled.
       When omitted, the component self-cycles (standalone use).
   ============================================================= */

import { useState, useEffect } from "react";
import gcWordmark from "../assets/sig-blk-gov-en.svg";
import "./IntroScreen.css";

// ── Bilingual content ────────────────────────────────────────
const CONTENT = {
  en: {
    wordmarkAlt: "Government of Canada",
    source: "Statistics Canada · Tables 33100034–33101096",
    eyebrow: "Canadian Business Activity — 2015–2025",
    titleLine1: "Canadian Business Activity",
    titleAccent: "A Decade in Data",
    titleLine2: "",
    description:
      "Visualizing business creation and growth across Canada from 2015 to 2025 — " +
      "national trends, business size structure, regional divergence, sector shifts, " +
      "and surprising deep dives into the industries reshaping Canada's economy.",
    stats: [
      { value: "5.04M+", label: "Total Businesses, Jul 2025" },
      { value: "10", label: "Years of Data (2015–2025)" },
      { value: "13", label: "Regions Covered" },
    ],
  },
  fr: {
    wordmarkAlt: "Gouvernement du Canada",
    source: "Statistique Canada · Tableaux 33100034–33101096",
    eyebrow: "Activité commerciale canadienne — 2015–2025",
    titleLine1: "Activité Commerciale Canadienne",
    titleAccent: "Une Décennie en Données",
    titleLine2: "",
    description:
      "Visualiser la création et la croissance des entreprises à travers le Canada " +
      "de 2015 à 2025 — tendances nationales, structure par taille d'entreprise, " +
      "divergences régionales, évolutions sectorielles et plongées surprenantes dans " +
      "les industries qui redéfinissent l'économie canadienne.",
    stats: [
      { value: "5,04 M+", label: "Entreprises au total, juil. 2025" },
      { value: "10", label: "Ans de données (2015–2025)" },
      { value: "13", label: "Régions couvertes" },
    ],
  },
};

// ── Timing constants ─────────────────────────────────────────
// DISPLAY_MS must match or exceed the App.jsx slide slot ÷ 2.
// FADE_MS    must match --duration-xslow in tokens.css (1200ms).
const DISPLAY_MS = 1500; // ms each language is fully visible
const FADE_MS = 500; // ms for fade-out + fade-in crossfade

export default function IntroScreen({ lang: propLang }) {
  const [lang, setLang] = useState(propLang ?? "en");
  const [visible, setVisible] = useState(true);

  // Sync local state when App.jsx changes the lang prop.
  // Handles the case where IntroScreen stays mounted across
  // slide 1 → slide 2 without unmounting (same component type).
  useEffect(() => {
    if (propLang !== undefined) setLang(propLang);
  }, [propLang]);

  // EN → FR → EN bilingual cycle.
  // Disabled when a lang prop is provided — App.jsx owns the language.
  useEffect(() => {
    if (propLang !== undefined) return; // parent is driving language

    const displayTimer = setTimeout(() => {
      // Begin fade-out
      setVisible(false);

      // After fade completes, swap language and fade back in
      const swapTimer = setTimeout(() => {
        setLang((prev) => (prev === "en" ? "fr" : "en"));
        setVisible(true);
      }, FADE_MS);

      return () => clearTimeout(swapTimer);
    }, DISPLAY_MS);

    return () => clearTimeout(displayTimer);
  }, [lang, propLang]); // re-trigger each time lang or prop changes

  const c = CONTENT[lang];

  return (
    <div className="intro-screen">
      {/* ── HEADER: GoC wordmark + data source ─────────── */}
      <header className="intro-header">
        <img src={gcWordmark} alt={c.wordmarkAlt} className="intro-wordmark" />
        <span className="intro-source">{c.source}</span>
      </header>

      {/* ── RED ACCENT BAR ─────────────────────────────── */}
      <div className="intro-accent-bar" aria-hidden="true" />

      {/* ── MAIN CONTENT (fades in/out on language swap) ── */}
      <main
        className={`intro-content${visible ? " intro-visible" : " intro-hidden"}`}
      >
        {/* Eyebrow label */}
        <p className="intro-eyebrow">{c.eyebrow}</p>

        {/* Hero title — 3 lines with accent highlight */}
        <h1 className="intro-title">
          {c.titleLine1}
          <br />
          <span className="intro-title-accent">{c.titleAccent}</span>
          <br />
          {c.titleLine2}
        </h1>

        {/* Supporting description */}
        <p className="intro-description">{c.description}</p>

        {/* ── DIVIDER ──────────────────────────────────── */}
        <hr className="intro-divider" />

        {/* ── KPI STATS ROW ────────────────────────────── */}
        <div className="intro-stats" role="list">
          {c.stats.map((stat, i) => (
            <div key={i} className="intro-stat" role="listitem">
              <span className="intro-stat-value">{stat.value}</span>
              <span className="intro-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── LANGUAGE BADGE (bottom-right) ──────────────── */}
      <div
        className="intro-lang-badge"
        aria-label={`Language: ${lang.toUpperCase()}`}
      >
        {lang.toUpperCase()}
      </div>
    </div>
  );
}
