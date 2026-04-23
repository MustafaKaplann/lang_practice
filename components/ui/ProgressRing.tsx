export default function ProgressRing({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const pct = max > 0 ? value / max : 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fill="#f1f5f9"
        fontSize="20"
        fontWeight="bold"
      >
        {Math.round(pct * 100)}%
      </text>
      <text x="50" y="62" textAnchor="middle" fill="#64748b" fontSize="9">
        {value} / {max}
      </text>
    </svg>
  );
}
