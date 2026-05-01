import { useState, useEffect } from "react";

export function useHeaderHeight() {
  const [height, setHeight] = useState(80);

  useEffect(() => {
    const el = document.getElementById("main-header");
    if (!el) return;

    const update = () => setHeight(el.offsetHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return height;
}
