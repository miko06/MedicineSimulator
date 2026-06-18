import { useEffect, useState } from "react";
import { api, type ProgressData } from "../../api/client";
import { useLocale } from "../../hooks/useLocale";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["#888888", "#AAAAAA", "#CCCCCC", "#666666", "#999999", "#BBBBBB"];

export default function Progress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  const { version } = useLocale();

  useEffect(() => {
    api.progress.get().then(setProgress).finally(() => setLoading(false));
  }, [version]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted text-sm">Loading...</div>;
  if (!progress) return null;

  const { summary, bySpecialty, recentAttempts } = progress;

  const pieData = bySpecialty.filter(s => s.total > 0).map(s => ({ name: s.nameEn, value: s.total }));

  const barData = bySpecialty.filter(s => s.total > 0).map(s => ({ name: s.nameEn, Score: s.averageScore, Completed: s.completed, Total: s.total }));

  const lineData = recentAttempts.slice().reverse().map((a, i) => ({ name: `#${i + 1}`, score: a.score, time: a.timeSpent }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-mono text-accent mb-8">Progress Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={String(summary.totalAttempts)} />
        <StatCard label="Completed" value={String(summary.completedAttempts)} />
        <StatCard label="Avg Score" value={`${summary.averageScore}%`} />
        <StatCard label="Best" value={`${summary.bestScore}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {pieData.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Exercises by Specialty</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--border)" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {barData.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Performance by Specialty</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="Score" fill="#AAAAAA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {lineData.length > 1 && (
        <div className="glass rounded-xl p-6 mb-8">
          <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Recent Score Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="#888888" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <h3 className="text-xs font-mono text-muted uppercase tracking-wider px-4 py-3 border-b border-border">Recent Attempts</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-xs text-muted font-normal">Exercise</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Specialty</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Score</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentAttempts.map((a) => (
              <tr key={a.id} className="border-t border-border/50">
                <td className="px-4 py-2.5 text-text">{a.exerciseTitle}</td>
                <td className="px-4 py-2.5 text-muted">{a.specialty}</td>
                <td className="px-4 py-2.5 font-mono">{a.score}%</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs ${a.status === "COMPLETED" ? "text-green-400" : "text-yellow-400"}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-4 text-center">
      <p className="text-2xl font-mono text-accent">{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}
