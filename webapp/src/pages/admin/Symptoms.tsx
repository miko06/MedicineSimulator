import { useEffect, useState } from "react";
import { api } from "../../api/client";

interface SymptomRecord {
  id: string; nameEn: string; nameRu: string; bodyZone: string; severity: number; color: string;
}

const ZONES = ["HEAD","NECK","CHEST","ABDOMEN","PELVIS","BACK","LEFT_ARM","RIGHT_ARM","LEFT_HAND","RIGHT_HAND","LEFT_LEG","RIGHT_LEG","LEFT_FOOT","RIGHT_FOOT","FULL_BODY","SKIN","EYES","EARS","NOSE","MOUTH"];

export default function AdminSymptoms() {
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SymptomRecord | null>(null);
  const [form, setForm] = useState({ nameEn: "", nameRu: "", bodyZone: "ABDOMEN", severity: 5, color: "#EF4444" });

  const load = async () => {
    setLoading(true);
    const data = await api.admin.symptoms.list() as SymptomRecord[];
    setSymptoms(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.admin.symptoms.create(form);
    setShowForm(false);
    setForm({ nameEn: "", nameRu: "", bodyZone: "ABDOMEN", severity: 5, color: "#EF4444" });
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.admin.symptoms.update(editing.id, form);
    setEditing(null); setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await api.admin.symptoms.delete(id);
    load();
  };

  if (loading) return <div className="text-muted text-sm p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-accent">Symptoms</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="glass rounded-lg px-4 py-2 text-sm hover:border-accent/30 transition-all">+ New</button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-mono text-accent mb-4">{editing ? "Edit" : "New"} Symptom</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Name EN" value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Name RU" value={form.nameRu} onChange={e => setForm({...form, nameRu: e.target.value})} />
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={form.bodyZone} onChange={e => setForm({...form, bodyZone: e.target.value})}>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" type="number" min={1} max={10} value={form.severity} onChange={e => setForm({...form, severity: Number(e.target.value)})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={editing ? handleUpdate : handleCreate} className="bg-accent text-bg rounded px-4 py-2 text-sm">{editing ? "Update" : "Create"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted text-sm hover:text-text">Cancel</button>
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs text-muted font-normal">Name</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Zone</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Sev</th>
              <th className="px-4 py-3 text-xs text-muted font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {symptoms.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-4 py-3 text-text">{s.nameEn}</td>
                <td className="px-4 py-3 text-muted text-xs">{s.bodyZone}</td>
                <td className="px-4 py-3">{s.severity}/10</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(s); setForm({ nameEn: s.nameEn, nameRu: s.nameRu, bodyZone: s.bodyZone, severity: s.severity, color: s.color }); setShowForm(true); }} className="text-xs text-muted hover:text-text mr-3">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
