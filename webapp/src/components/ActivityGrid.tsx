export default function ActivityGrid({ attempts }: { attempts: Array<{ createdAt: string; score: number }> }) {
  const weeks = 20;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - weeks * 7);

  const grid: Array<{ date: string; score: number; count: number }> = [];

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayAttempts = attempts.filter((a) => a.createdAt.slice(0, 10) === dateStr);
    const avgScore = dayAttempts.length > 0
      ? Math.round(dayAttempts.reduce((sum, a) => sum + a.score, 0) / dayAttempts.length)
      : 0;
    grid.push({ date: dateStr, score: avgScore, count: dayAttempts.length });
  }

  const colorForScore = (score: number, count: number) => {
    if (count === 0) return "bg-surface border border-border";
    if (score >= 90) return "bg-green-500/60";
    if (score >= 70) return "bg-green-500/35";
    if (score >= 50) return "bg-yellow-500/35";
    return "bg-red-500/30";
  };

  const weeksArr: typeof grid[] = [];
  for (let w = 0; w < weeks; w++) {
    weeksArr.push(grid.slice(w * 7, w * 7 + 7));
  }

  const totalAttempts = attempts.length;
  const activeDays = grid.filter((d) => d.count > 0).length;

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-muted uppercase tracking-wider">
          Белсенділік ({totalAttempts} әрекет {activeDays} күнде)
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted">
          <span>Аз</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-surface border border-border" />
            <div className="w-3 h-3 rounded-sm bg-green-500/35" />
            <div className="w-3 h-3 rounded-sm bg-green-500/60" />
          </div>
          <span>Көп</span>
        </div>
      </div>
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {weeksArr.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${colorForScore(day.score, day.count)}`}
                title={`${day.date}: ${day.count} attempts, avg ${day.score}%`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
