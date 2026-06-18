import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../api/client";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ displayName: string; institution: string }>({ displayName: "", institution: "" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.auth.me().then((data) => {
      setProfile({ displayName: (data.user as Record<string, string>).displayName || "", institution: (data.user as Record<string, string>).institution || "" });
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
    <div className="max-w-lg mx-auto px-6 py-8">
      <h1 className="text-xl font-mono text-accent mb-8">Profile</h1>

      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">Email</label>
          <p className="text-sm text-text">{user?.email}</p>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Role</label>
          <p className="text-sm text-text font-mono">{user?.role}</p>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Display Name</label>
          {editing ? (
            <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} />
          ) : (
            <p className="text-sm text-text">{profile.displayName || "—"}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Institution</label>
          {editing ? (
            <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={profile.institution} onChange={e => setProfile({...profile, institution: e.target.value})} />
          ) : (
            <p className="text-sm text-text">{profile.institution || "—"}</p>
          )}
        </div>
        {editing ? (
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="bg-accent text-bg rounded px-4 py-2 text-sm">{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setEditing(false)} className="text-muted text-sm hover:text-text">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-accent text-sm hover:underline">Edit</button>
        )}
      </div>
    </div>
  );
}
