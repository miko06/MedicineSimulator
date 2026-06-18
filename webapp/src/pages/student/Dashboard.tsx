import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useLocale } from "../../hooks/useLocale";
import { api, type ProgressData } from "../../api/client";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { version } = useLocale();
  const [specialties, setSpecialties] = useState<Array<{ id: string; slug: string; name: string; icon: string; exerciseCount: number }>>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.specialties.list(),
      api.progress.get().catch(() => null),
    ]).then(([specs, prog]) => {
      setSpecialties(specs);
      setProgress(prog as ProgressData | null);
    }).finally(() => setLoading(false));
  }, [version]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted text-sm">Loading...</div>;
  }

  const totalDone = progress?.summary.completedAttempts ?? 0;
  const totalAll = progress?.summary.totalAttempts ?? 0;
  const avgScore = progress?.summary.averageScore ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-mono text-accent mb-1">Welcome, {user?.email}</h1>
        <p className="text-sm text-muted">Select a specialty to start practicing</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Completed" value={String(totalDone)} sub={`of ${totalAll}`} />
        <StatCard label="Avg Score" value={`${avgScore}%`} />
        <StatCard label="Specialties" value={String(specialties.length)} />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono text-muted uppercase tracking-wider">Specialties</h2>
          <Link to="/progress" className="text-xs text-muted hover:text-text transition-colors">View progress →</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {specialties.map((s) => (
            <Link
              key={s.id}
              to={`/exercises?specialty=${s.slug}`}
              className="glass rounded-lg p-4 hover:border-accent/30 transition-all group"
            >
              <span className="text-2xl">{s.icon}</span>
              <h3 className="text-sm text-text mt-2 group-hover:text-accent transition-colors">{s.name}</h3>
              <p className="text-xs text-muted mt-1">{s.exerciseCount} exercises</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-lg p-4 text-center">
      <p className="text-2xl font-mono text-accent">{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
      {sub && <p className="text-xs text-muted/60">{sub}</p>}
    </div>
  );
}
