import { useEffect, useState } from "react";
import { api } from "../../api/client";

interface DiagnosisRecord {
  id: string; nameEn: string; nameRu: string; nameKz?: string; specialty: { id: string; slug: string; nameEn: string; nameRu: string; nameKz?: string };
  specialtyId: string; descriptionEn: string; descriptionRu: string; descriptionKz?: string;
  treatmentsEn: string[]; treatmentsRu: string[]; treatmentsKz?: string[];
}

interface SpecialtyShort { id: string; slug: string; nameEn: string; nameRu: string; nameKz?: string; }

export default function AdminDiagnoses() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiagnosisRecord | null>(null);
  const [form, setForm] = useState({ nameEn: "", nameRu: "", specialtyId: "", descriptionEn: "", descriptionRu: "", treatmentsEn: "", treatmentsRu: "" });

  const load = async () => {
    setLoading(true);
    const [d, s] = await Promise.all([
      api.admin.diagnoses.list() as Promise<DiagnosisRecord[]>,
      api.admin.specialties.list() as Promise<SpecialtyShort[]>,
    ]);
    setDiagnoses(d);
    setSpecialties(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.admin.diagnoses.create({
      ...form,
      treatmentsEn: form.treatmentsEn ? form.treatmentsEn.split(",").map((t: string) => t.trim()) : [],
      treatmentsRu: form.treatmentsRu ? form.treatmentsRu.split(",").map((t: string) => t.trim()) : [],
    });
    setShowForm(false);
    setForm({ nameEn: "", nameRu: "", specialtyId: "", descriptionEn: "", descriptionRu: "", treatmentsEn: "", treatmentsRu: "" });
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.admin.diagnoses.update(editing.id, {
      ...form,
      treatmentsEn: form.treatmentsEn ? form.treatmentsEn.split(",").map((t: string) => t.trim()) : [],
      treatmentsRu: form.treatmentsRu ? form.treatmentsRu.split(",").map((t: string) => t.trim()) : [],
    });
    setEditing(null); setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Бұл диагнозды жою керек пе?")) return;
    await api.admin.diagnoses.delete(id);
    load();
  };

  if (loading) return <div className="text-muted text-sm p-8">Жүктелуде...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-accent">Диагноздар</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="glass rounded-lg px-4 py-2 text-sm hover:border-accent/30 transition-all">+ Жаңа</button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-mono text-accent mb-4">{editing ? "Диагнозды өңдеу" : "Жаңа диагноз"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Атауы (EN)" value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Атауы (RU)" value={form.nameRu} onChange={e => setForm({...form, nameRu: e.target.value})} />
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={form.specialtyId} onChange={e => setForm({...form, specialtyId: e.target.value})}>
              <option value="">Мамандықты таңдаңыз</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{s.nameKz || s.nameRu || s.nameEn}</option>)}
            </select>
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Емдеу (EN, үтірлермен)" value={form.treatmentsEn} onChange={e => setForm({...form, treatmentsEn: e.target.value})} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Сипаттама (EN)" value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} rows={2} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Сипаттама (RU)" value={form.descriptionRu} onChange={e => setForm({...form, descriptionRu: e.target.value})} rows={2} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent col-span-2" placeholder="Емдеу (RU, үтірлермен)" value={form.treatmentsRu} onChange={e => setForm({...form, treatmentsRu: e.target.value})} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={editing ? handleUpdate : handleCreate} className="bg-accent text-bg rounded px-4 py-2 text-sm">{editing ? "Сақтау" : "Қосу"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted text-sm hover:text-text">Болдырмау</button>
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs text-muted font-normal">Атауы</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Мамандық</th>
              <th className="px-4 py-3 text-xs text-muted font-normal text-right">Әрекеттер</th>
            </tr>
          </thead>
          <tbody>
            {diagnoses.map((d) => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-4 py-3 text-text">{d.nameKz || d.nameRu || d.nameEn}</td>
                <td className="px-4 py-3 text-muted text-xs">{d.specialty?.nameKz || d.specialty?.nameRu || d.specialty?.nameEn}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(d); setForm({ nameEn: d.nameEn, nameRu: d.nameRu, specialtyId: d.specialtyId, descriptionEn: d.descriptionEn, descriptionRu: d.descriptionRu, treatmentsEn: (d.treatmentsEn||[]).join(", "), treatmentsRu: (d.treatmentsRu||[]).join(", ") }); setShowForm(true); }} className="text-xs text-muted hover:text-text mr-3">Өңдеу</button>
                  <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-300">Жою</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
