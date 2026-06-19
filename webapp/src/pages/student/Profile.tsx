import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../api/client";
import ActivityGrid from "../../components/ActivityGrid";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    firstName: "", lastName: "", course: "",
    displayName: "", institution: "",
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempts, setAttempts] = useState<Array<{ createdAt: string; score: number }>>([]);

  useEffect(() => {
    api.auth.me().then((data) => {
      const u = data.user as Record<string, string>;
      setProfile({
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        course: u.course || "",
        displayName: u.displayName || "",
        institution: u.institution || "",
      });
    }).catch(() => {});

    api.progress.get().then((data) => {
      setAttempts(data.recentAttempts.map((a) => ({
        createdAt: a.createdAt,
        score: a.score,
      })));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-mono text-accent mb-8">Профиль</h1>

      <div className="space-y-6">
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Аты</label>
              {editing ? (
                <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} />
              ) : (
                <p className="text-sm text-text">{profile.firstName || "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Тегі</label>
              {editing ? (
                <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} />
              ) : (
                <p className="text-sm text-text">{profile.lastName || "—"}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Курс</label>
              {editing ? (
                <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={profile.course} onChange={e => setProfile({...profile, course: e.target.value})} placeholder="мысалы, 4-ші курс" />
              ) : (
                <p className="text-sm text-text">{profile.course || "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Электрондық пошта</label>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Рөл</label>
            <p className="text-sm text-text font-mono">{user?.role === "ADMIN" ? "Әкімші" : "Студент"}</p>
          </div>
          {editing ? (
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="bg-accent text-bg rounded px-4 py-2 text-sm">{saving ? "Сақталуда..." : "Сақтау"}</button>
              <button onClick={() => setEditing(false)} className="text-muted text-sm hover:text-text">Болдырмау</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="text-accent text-sm hover:underline">Өңдеу</button>
          )}
        </div>

        <ActivityGrid attempts={attempts} />
      </div>
    </div>
  );
}
