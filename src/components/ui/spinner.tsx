/**
 * Three blocks lighting up in turn. A rotating ring is a smooth arc, which is
 * the one thing the pixel world never draws; a marquee of squares says "busy"
 * in the same language as the rest of the interface.
 */
const DELAYS = ["0ms", "150ms", "300ms"];

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-0.5 ${className}`}>
      {DELAYS.map((delay) => (
        <span
          key={delay}
          className="blink block h-1.5 w-1.5 bg-current"
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
  );
}
