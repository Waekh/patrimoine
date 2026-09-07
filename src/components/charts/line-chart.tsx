import { formatCurrency, formatDate } from "@/lib/formatting";
import type { CurrencyCode } from "@/config/currencies";

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: Array<{ date: string; valueCents: number }>;
}

/**
 * Dependency-free SVG line chart. Data is also rendered as a table by the
 * caller, so the chart is decorative for assistive technologies.
 */
export function LineChart({
  series,
  currency,
  height = 220,
}: {
  series: LineSeries[];
  currency: CurrencyCode;
  height?: number;
}) {
  const width = 720;
  const pad = { l: 12, r: 12, t: 12, b: 24 };
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;
  const dates = Array.from(new Set(all.map((p) => p.date))).sort();
  const min = Math.min(0, ...all.map((p) => p.valueCents));
  const max = Math.max(1, ...all.map((p) => p.valueCents));
  const x = (date: string) =>
    pad.l + ((width - pad.l - pad.r) * dates.indexOf(date)) / Math.max(1, dates.length - 1);
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
  const zeroY = y(0);
  return (
    <figure className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[480px]"
        role="img"
        aria-label={series.map((s) => s.label).join(", ")}
      >
        <line
          x1={pad.l}
          x2={width - pad.r}
          y1={zeroY}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
          const d = pts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.valueCents).toFixed(1)}`,
            )
            .join(" ");
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p) => (
                <circle key={p.date} cx={x(p.date)} cy={y(p.valueCents)} r="3" fill={s.color}>
                  <title>{`${s.label} · ${formatDate(p.date)} · ${formatCurrency({ amountCents: p.valueCents, currency })}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x={pad.l} y={height - 6} fontSize="11" fill="currentColor" fillOpacity="0.6">
          {formatDate(dates[0]!)}
        </text>
        <text
          x={width - pad.r}
          y={height - 6}
          fontSize="11"
          textAnchor="end"
          fill="currentColor"
          fillOpacity="0.6"
        >
          {formatDate(dates[dates.length - 1]!)}
        </text>
      </svg>
      <figcaption className="text-fg-muted mt-2 flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-3 rounded-sm"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
