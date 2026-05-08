/* =============================================================
   IntroScreen.jsx
   Canadian Business Dashboard — Screen 1 of 6: Intro / Cover
   Displays an overview of the dashboard with EN → FR bilingual
   fade transition. Self-contained timing — no props required.
   ============================================================= */

import { useState, useEffect } from 'react';
import gcWordmark from '../assets/sig-blk-gov-en.svg';
import './IntroScreen.css';

// ── Bilingual content ────────────────────────────────────────
const CONTENT = {
  en: {
    wordmarkAlt: 'Government of Canada',
    source:      'Statistics Canada · Tables 33100034–33101096',
    eyebrow:     'CANADIAN BUSINESS ACTIVITY DASHBOARD · 2017–2023 · MAY 2026',
    titleLine1:  'Canadian Business:',
    titleAccent: 'Trends, Resilience,',
    titleLine2:  'and What the Data Shows',
    description:
      'Seven years of Statistics Canada data — new business creation, ' +
      'rural profiles, and sector performance, from coast to coast to coast.',
    stats: [
      { value: '1.3M+',  label: 'Canadian Businesses' },
      { value: '7',      label: 'Years of Data (2017–2023)' },
      { value: '15',     label: 'Major Sectors' },
      { value: '13',     label: 'Regions Covered' },
    ],
  },
  fr: {
    wordmarkAlt: 'Gouvernement du Canada',
    source:      'Statistique Canada · Tableaux 33100034–33101096',
    eyebrow:     'TABLEAU DE BORD · ACTIVITÉ COMMERCIALE CANADIENNE · 2017–2023 · MAI 2026',
    titleLine1:  'Commerce Canadien :',
    titleAccent: 'Tendances, Résilience,',
    titleLine2:  'et Ce Que Les Données Montrent',
    description:
      'Sept ans de données de Statistique Canada — création d\'entreprises, ' +
      'profils ruraux et performance sectorielle, d\'un océan à l\'autre.',
    stats: [
      { value: '1,3 M+', label: 'Entreprises canadiennes' },
      { value: '7',      label: 'Ans de données (2017–2023)' },
      { value: '15',     label: 'Secteurs principaux' },
      { value: '13',     label: 'Régions couvertes' },
    ],
  },
};

// ── Timing constants ─────────────────────────────────────────
// DISPLAY_MS must match or exceed the App.jsx slide slot ÷ 2.
// FADE_MS    must match --duration-xslow in tokens.css (1200ms).
const DISPLAY_MS = 8000;   // ms each language is fully visible
const FADE_MS    = 1200;   // ms for fade-out + fade-in crossfade

export default function IntroScreen() {
  const [lang, setLang]       = useState('en');
  const [visible, setVisible] = useState(true);

  // EN → FR → EN bilingual cycle
  useEffect(() => {
    const displayTimer = setTimeout(() => {
      // Begin fade-out
      setVisible(false);

      // After fade completes, swap language and fade back in
      const swapTimer = setTimeout(() => {
        setLang(prev => (prev === 'en' ? 'fr' : 'en'));
        setVisible(true);
      }, FADE_MS);

      return () => clearTimeout(swapTimer);
    }, DISPLAY_MS);

    return () => clearTimeout(displayTimer);
  }, [lang]); // re-trigger each time lang changes

  const c = CONTENT[lang];

  return (
    <div className="intro-screen">

      {/* ── HEADER: GoC wordmark + data source ─────────── */}
      <header className="intro-header">
        <img
          src={gcWordmark}
          alt={c.wordmarkAlt}
          className="intro-wordmark"
        />
        <span className="intro-source">{c.source}</span>
      </header>

      {/* ── RED ACCENT BAR ─────────────────────────────── */}
      <div className="intro-accent-bar" aria-hidden="true" />

      {/* ── MAIN CONTENT (fades in/out on language swap) ── */}
      <main className={`intro-content${visible ? ' intro-visible' : ' intro-hidden'}`}>

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
      <div className="intro-lang-badge" aria-label={`Language: ${lang.toUpperCase()}`}>
        {lang.toUpperCase()}
      </div>

    </div>
  );
}
