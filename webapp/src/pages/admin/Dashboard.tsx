import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AdminDashboard } from "../../api/client";

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted text-sm">Жүктелуде...</div>;
  }

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-mono text-accent mb-8">Әкімші панелі</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Студенттер" value={String(data.users.students)} />
        <StatCard label="Әкімшілер" value={String(data.users.admins)} />
        <StatCard label="Жаттығулар" value={String(data.content.exercises)} />
        <StatCard label="Орташа балл" value={`${data.attempts.averageScore}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Мамандықтар бойынша жаттығулар</h2>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs text-muted font-normal">Мамандық</th>
                  <th className="px-4 py-2 text-xs text-muted font-normal text-right">Сан</th>
                </tr>
              </thead>
              <tbody>
                {data.exercisesBySpecialty.map((s) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-text">{s.nameKz || s.nameRu || s.nameEn}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{s.exerciseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Соңғы белсенділік</h2>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs text-muted font-normal">Пайдаланушы</th>
                  <th className="px-4 py-2 text-xs text-muted font-normal">Жаттығу</th>
                  <th className="px-4 py-2 text-xs text-muted font-normal text-right">Балл</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-text">{a.user}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{a.exercise}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={a.status === "IN_PROGRESS" ? "text-yellow-400" : "text-green-400"}>
                        {a.score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/exercises" className="glass rounded-lg px-4 py-2.5 text-sm hover:border-accent/30 transition-all">Жаттығуларды басқару →</Link>
        <Link to="/admin/symptoms" className="glass rounded-lg px-4 py-2.5 text-sm hover:border-accent/30 transition-all">Белгілерді басқару →</Link>
        <Link to="/admin/diagnoses" className="glass rounded-lg px-4 py-2.5 text-sm hover:border-accent/30 transition-all">Диагноздарды басқару →</Link>
        <Link to="/admin/users" className="glass rounded-lg px-4 py-2.5 text-sm hover:border-accent/30 transition-all">Пайдаланушыларды басқару →</Link>
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
