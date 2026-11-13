import { useId } from "react";

export type BlueMood = "idle" | "happy" | "thinking";

/**
 * Blue — the Virtual Science Park AI companion.
 *
 * The silhouette comes straight out of the Blue Science Park symbol: an angular dart
 * built from two flat facets, a notched tail and open negative space, with a small
 * spark above the tip. Everything is plain SVG so it stays lightweight at any size.
 */
export function BlueMascot({ size = 62, mood = "idle", className = "" }: { size?: number; mood?: BlueMood; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const light = `${uid}-light`;
  const deep = `${uid}-deep`;
  const shade = `${uid}-shade`;

  return (
    <svg className={`blue-mascot ${className}`.trim()} data-mood={mood} width={size} height={size * 1.12} viewBox="0 0 100 112" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={light} x1="14" y1="20" x2="58" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--blue-facet-light-top)" />
          <stop offset="1" stopColor="var(--blue-facet-light-end)" />
        </linearGradient>
        <linearGradient id={deep} x1="44" y1="18" x2="90" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--blue-facet-deep-top)" />
          <stop offset="1" stopColor="var(--blue-facet-deep-end)" />
        </linearGradient>
        <radialGradient id={shade}>
          <stop offset="0" stopColor="var(--blue-shadow)" />
          <stop offset="1" stopColor="var(--blue-shadow-fade)" />
        </radialGradient>
      </defs>

      <ellipse className="blue-shadow" cx="50" cy="104" rx="22" ry="4.2" fill={`url(#${shade})`} />

      <g className="blue-float">
        <g className="blue-body">
          {/* The deeper fold of the symbol. */}
          <path d="M50 22 L84 54 L72 90 L50 76 Z" fill={`url(#${deep})`} stroke={`url(#${deep})`} strokeWidth="9" strokeLinejoin="round" />
          {/* The bright side, kept as open negative space. */}
          <path d="M50 22 L50 76 L28 90 L16 54 Z" fill={`url(#${light})`} stroke={`url(#${light})`} strokeWidth="9" strokeLinejoin="round" />
          <path className="blue-crease" d="M50 27 L50 72" />

          <g className="blue-spark">
            <path d="M50 2 L52.5 7 L57 9 L52.5 11 L50 16 L47.5 11 L43 9 L47.5 7 Z" />
          </g>

          {mood === "happy" ? (
            <>
              <path className="blue-arc" d="M31 45 Q38 37 45 45" />
              <path className="blue-arc" d="M55 45 Q62 37 69 45" />
              <path className="blue-smile" d="M41 58 Q50 68 59 58" />
            </>
          ) : (
            <>
              <g className="blue-eye">
                <ellipse cx="38" cy="46" rx="7.6" ry="8.6" fill="var(--blue-eye)" />
                <circle className="blue-pupil" cx="38" cy="48" r="3.7" fill="var(--blue-ink)" />
              </g>
              <g className="blue-eye">
                <ellipse cx="62" cy="46" rx="7.6" ry="8.6" fill="var(--blue-eye)" />
                <circle className="blue-pupil" cx="62" cy="48" r="3.7" fill="var(--blue-ink)" />
              </g>
              <path className="blue-smile" d={mood === "thinking" ? "M43 61 Q50 64 57 61" : "M42 60 Q50 66 58 60"} />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
