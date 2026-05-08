/* =============================================================
   App.jsx
   Canadian Business Dashboard — Root Component
   Renders the IntroScreen as the sole active slide.
   Additional screens will be added here as they are built.
   ============================================================= */

import IntroScreen from './screens/IntroScreen';
import './App.css';

function App() {
  return (
    <div id="tv-container">
      <section id="hero" aria-label="Intro">
        <IntroScreen />
      </section>
    </div>
  );
}

export default App;
