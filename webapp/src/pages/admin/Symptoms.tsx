import { useEffect, useState, useRef } from "react";
import { api } from "../../api/client";
import { kzBodyZone } from "../../lib/i18n";

interface SymptomRecord {
  id: string; nameEn: string; nameRu: string; nameKz?: string; bodyZone: string; severity: number; color: string;
  descriptionEn?: string; descriptionRu?: string; descriptionKz?: string;
  attachments: Array<{ name: string; path: string }>;
}

const ZONES = ["HEAD","NECK","CHEST","ABDOMEN","PELVIS","BACK","LEFT_ARM","RIGHT_ARM","LEFT_HAND","RIGHT_HAND","LEFT_LEG","RIGHT_LEG","LEFT_FOOT","RIGHT_FOOT","FULL_BODY","SKIN","EYES","EARS","NOSE","MOUTH"];

export default function AdminSymptoms() {
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SymptomRecord | null>(null);
  const [form, setForm] = useState({ nameEn: "", nameRu: "", nameKz: "", bodyZone: "ABDOMEN", severity: 5, color: "#EF4444", descriptionEn: "", descriptionRu: "", descriptionKz: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadSymptomId, setUploadSymptomId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setForm({ nameEn: "", nameRu: "", nameKz: "", bodyZone: "ABDOMEN", severity: 5, color: "#EF4444", descriptionEn: "", descriptionRu: "", descriptionKz: "" });
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.admin.symptoms.update(editing.id, form);
    setEditing(null); setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Бұл белгіні жою керек пе?")) return;
    await api.admin.symptoms.delete(id);
    load();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!uploadSymptomId || !files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (const f of files) formData.append("files", f);
    await fetch(`/api/admin/symptoms/${uploadSymptomId}/attachments`, {
      method: "POST", credentials: "include", body: formData,
    });
    setUploading(false);
    setUploadSymptomId(null);
    load();
  };

  const startFileUpload = (symptomId: string) => {
    setUploadSymptomId(symptomId);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const handleDeleteAttachment = async (symptomId: string, index: number) => {
    await fetch(`/api/admin/symptoms/${symptomId}/attachments`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ index }),
    });
    load();
  };

  if (loading) return <div className="text-muted text-sm p-8">Жүктелуде...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-accent">Белгілер</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="glass rounded-lg px-4 py-2 text-sm hover:border-accent/30 transition-all">+ Жаңа</button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-mono text-accent mb-4">{editing ? "Өңдеу" : "Жаңа"} белгі</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Атауы (EN)" value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Атауы (RU)" value={form.nameRu} onChange={e => setForm({...form, nameRu: e.target.value})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Атауы (KZ)" value={form.nameKz} onChange={e => setForm({...form, nameKz: e.target.value})} />
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" value={form.bodyZone} onChange={e => setForm({...form, bodyZone: e.target.value})}>
              {ZONES.map(z => <option key={z} value={z}>{kzBodyZone(z)}</option>)}
            </select>
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" type="number" min={1} max={10} value={form.severity} onChange={e => setForm({...form, severity: Number(e.target.value)})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Сипаттама (EN)" value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} rows={2} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent" placeholder="Сипаттама (RU)" value={form.descriptionRu} onChange={e => setForm({...form, descriptionRu: e.target.value})} rows={2} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent col-span-2" placeholder="Сипаттама (KZ)" value={form.descriptionKz} onChange={e => setForm({...form, descriptionKz: e.target.value})} rows={2} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={editing ? handleUpdate : handleCreate} className="bg-accent text-bg rounded px-4 py-2 text-sm">{editing ? "Сақтау" : "Қосу"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted text-sm hover:text-text">Болдырмау</button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ""; }}
      />

      <div className="space-y-3">
        {symptoms.map((s) => (
          <div key={s.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text">{s.nameEn}</p>
                <p className="text-xs text-muted">{kzBodyZone(s.bodyZone)} • {s.severity}/10</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(s.attachments || []).map((a, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs bg-surface border border-border rounded px-2 py-0.5">
                      <a href={a.path} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">📎 {a.name}</a>
                      <button onClick={() => handleDeleteAttachment(s.id, i)} className="text-muted hover:text-red-400 ml-1">×</button>
                    </div>
                  ))}
                  <button onClick={() => startFileUpload(s.id)} disabled={uploading} className="text-xs text-muted hover:text-text border border-dashed border-border rounded px-2 py-0.5 disabled:opacity-50">
                    + Файл қосу
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(s); setForm({ nameEn: s.nameEn, nameRu: s.nameRu, nameKz: s.nameKz ?? "", bodyZone: s.bodyZone, severity: s.severity, color: s.color, descriptionEn: s.descriptionEn ?? "", descriptionRu: s.descriptionRu ?? "", descriptionKz: s.descriptionKz ?? "" }); setShowForm(true); }} className="text-xs text-muted hover:text-text">Өңдеу</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Жою</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
