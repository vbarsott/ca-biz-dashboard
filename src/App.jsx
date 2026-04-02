import { useState, useEffect } from "react";

import img1 from "./assets/slide-1.png";
import img2 from "./assets/slide-2.png";
import img3 from "./assets/slide-3.png";
import img4 from "./assets/slide-4.png";
import img5 from "./assets/slide-5.png";
import img6 from "./assets/slide-6.png";
import img7 from "./assets/slide-7.png";
import img8 from "./assets/slide-8.png";
import "./App.css";

function App() {
  const images = [img1, img2, img3, img4, img5, img6, img7, img8];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      <div id="tv-container">
        <section id="hero">
          <img
            src={images[index]}
            className="dashboard-img"
            alt="Dashboard slide"
          />
        </section>
      </div>
    </>
  );
}

export default App;
