import { useState, useEffect } from "react";

export function useTVHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      setHeight(width * 9 / 16);
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return height;
}
