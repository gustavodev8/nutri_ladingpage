import { useEffect, useRef, useState } from "react";

/**
 * Scroll-linked reveal animation.
 *
 * Reads the element's real position on every scroll tick so transitions
 * always fire while the element is still on screen — both entering and leaving,
 * in either scroll direction.
 *
 * Active zone: viewport minus 10% inset on top and bottom.
 * When any part of the element is inside this zone → visible.
 * When it leaves through the top  → hidden-above (slides up)
 * When it leaves through the bottom → hidden-below (slides down)
 */
export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"hidden-below" | "visible" | "hidden-above">("hidden-below");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const INSET = 0.10; // 10% of viewport height on each side

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const top = vh * INSET;
      const bottom = vh * (1 - INSET);

      // Element overlaps the active zone when its bottom > top-inset AND top < bottom-inset
      const inZone = rect.bottom > top && rect.top < bottom;

      if (inZone) {
        setState("visible");
      } else if (rect.bottom <= top) {
        // Entire element is above the active zone
        setState("hidden-above");
      } else {
        // Entire element is below the active zone
        setState("hidden-below");
      }
    };

    // Run once immediately so elements already in view on mount are shown
    update();

    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const hiddenClass =
    state === "hidden-above" ? "opacity-0 -translate-y-6" : "opacity-0 translate-y-6";

  return { ref, isVisible: state === "visible", hiddenClass };
}
