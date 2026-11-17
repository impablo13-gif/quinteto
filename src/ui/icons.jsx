/* Iconos propios que Lucide no tiene, con el mismo trazo (1.75). Sustituyen a
 * los emojis, que cambian de aspecto según el dispositivo. */
import { T } from "../theme/theme.js";

/* Balón de fútbol sala: círculo con un pentágono central. */
export function BallIcon({ size = 16, color = "currentColor", strokeWidth = 1.75 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, verticalAlign: "-0.15em" }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l3.8 2.8-1.5 4.4H9.7L8.2 10.3z" fill={color} stroke="none" />
      <path d="M12 3v4.5M20.6 9.4l-4.8 0.9M17.3 19.4l-3-4.7M6.7 19.4l3-4.7M3.4 9.4l4.8 0.9" />
    </svg>
  );
}

/* Tarjeta (amarilla/roja) o marca de inferioridad/superioridad. */
export function CardIcon({ size = 12, color = T.warning }) {
  return <span aria-hidden="true" style={{ display: "inline-block", width: size * 0.62, height: size * 0.85, background: color, borderRadius: 2, verticalAlign: "-0.1em", flexShrink: 0 }} />;
}
