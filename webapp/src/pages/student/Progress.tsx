import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ProgressData } from "../../api/client";
import { useLocale } from "../../hooks/useLocale";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["#888888", "#AAAAAA", "#CCCCCC", "#666666", "#999999", "#BBBBBB"];

export default function Progress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { version } = useLocale();

  useEffect(() => {
    api.progress.get().then(setProgress).finally(() => setLoading(false));
  }, [version]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted text-sm">Loading...</div>;
  if (!progress) return null;

  const { summary, bySpecialty, recentAttempts } = progress;

  const pieData = bySpecialty.filter(s => s.total > 0).map(s => ({ name: s.nameEn, value: s.total }));

  const barData = bySpecialty.filter(s => s.total > 0).map(s => ({ name: s.nameEn, Score: s.averageScore, Completed: s.completed, Total: s.total }));

  const lineData = recentAttempts.slice().reverse().map((a, i) => ({ name: `#${i + 1}`, score: a.score, time: a.timeSpent }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-mono text-accent">Прогресс</h1>
        <div className="flex items-center gap-4">
          <Link to="/history/errors" className="text-xs text-muted hover:text-text transition-colors">Қателер тарихы →</Link>
          <Link to="/ai" className="text-xs text-muted hover:text-text transition-colors">ЖИ зертханасына өту →</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Барлығы" value={String(summary.totalAttempts)} />
        <StatCard label="Аяқталды" value={String(summary.completedAttempts)} />
        <StatCard label="Орташа балл" value={`${summary.averageScore}%`} />
        <StatCard label="Ең жақсы" value={`${summary.bestScore}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {pieData.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Мамандықтар бойынша жаттығулар</h3>
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
            <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Мамандықтар бойынша нәтиже</h3>
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
          <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Соңғы балл динамикасы</h3>
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
        <h3 className="text-xs font-mono text-muted uppercase tracking-wider px-4 py-3 border-b border-border">Соңғы әрекеттер</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-xs text-muted font-normal">Жаттығу</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Мамандық</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Балл</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Күй</th>
              <th className="px-4 py-2 text-xs text-muted font-normal">Әрекет идентификаторы</th>
              <th className="px-4 py-2 text-xs text-muted font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {recentAttempts.map((a) => (
              <tr key={a.id} className="border-t border-border/50">
                <td className="px-4 py-2.5 text-text">{a.exerciseTitle}</td>
                <td className="px-4 py-2.5 text-muted">{a.specialty}</td>
                <td className="px-4 py-2.5 font-mono">{a.score}%</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs ${a.status === "COMPLETED" ? "text-green-400" : "text-yellow-400"}`}>
                    {a.status === "COMPLETED" ? "Аяқталды" : "Белсенді"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => copyId(a.id)}
                    className="font-mono text-xs text-muted hover:text-accent transition-colors"
                    title="Толық идентификаторды көшіру"
                  >
                    {a.id.slice(0, 8)}… {copiedId === a.id ? "көшірілді" : "көшіру"}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  {a.status === "COMPLETED" && a.score < 100 && (
                    <Link
                      to={`/ai?tab=errors&attempt=${a.id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Қатені талдау →
                    </Link>
                  )}
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
