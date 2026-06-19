import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import ImageUploader from "../../components/ImageUploader";

interface Exercise {
  id: string;
  titleEn: string;
  titleRu: string;
  difficulty: string;
  specialty: { id: string; slug: string; nameEn: string; nameRu: string; nameKz?: string };
  specialtyId: string;
  descriptionEn: string;
  descriptionRu: string;
  images: string[];
  robotPreset?: { zoneOverrides: unknown[] };
  exerciseSymptoms?: Array<{ symptom: { id: string; nameEn: string } }>;
  exerciseDiagnoses?: Array<{ diagnosis: { id: string; nameEn: string }; isCorrect: boolean }>;
  _count?: { exerciseSymptoms: number; exerciseDiagnoses: number };
}

interface Specialty {
  id: string;
  slug: string;
  nameEn: string;
  nameRu: string;
  nameKz?: string;
}

export default function AdminExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titleEn: "", titleRu: "", descriptionEn: "", descriptionRu: "",
    specialtyId: "", difficulty: "INTERMEDIATE", images: [] as string[],
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const createFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [ex, sp] = await Promise.all([
      api.admin.exercises.list() as Promise<Exercise[]>,
      api.admin.specialties.list() as Promise<Specialty[]>,
    ]);
    setExercises(ex);
    setSpecialties(sp);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const uploadImagesForExercise = async (exerciseId: string, files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    const res = await fetch(`/api/admin/exercises/${exerciseId}/images`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setForm((f) => ({ ...f, images: data.images as string[] }));
    }
  };

  const handleCreate = async () => {
    const payload = {
      titleEn: form.titleEn,
      titleRu: form.titleRu,
      descriptionEn: form.descriptionEn,
      descriptionRu: form.descriptionRu,
      specialtyId: form.specialtyId,
      difficulty: form.difficulty,
    };
    const ex = await api.admin.exercises.create(payload) as Exercise;
    if (imageFiles.length > 0) {
      setImageUploading(true);
      await uploadImagesForExercise(ex.id, imageFiles);
      setImageUploading(false);
      setImageFiles([]);
    }
    setEditing(ex);
    setForm({
      titleEn: ex.titleEn, titleRu: ex.titleRu, descriptionEn: ex.descriptionEn,
      descriptionRu: ex.descriptionRu, specialtyId: ex.specialtyId, difficulty: ex.difficulty,
      images: (ex.images ?? []) as string[],
    });
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.admin.exercises.update(editing.id, form);
    setEditing(null);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Бұл жаттығуды жою керек пе?")) return;
    await api.admin.exercises.delete(id);
    load();
  };

  const startEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({
      titleEn: ex.titleEn, titleRu: ex.titleRu,
      descriptionEn: ex.descriptionEn, descriptionRu: ex.descriptionRu,
      specialtyId: ex.specialtyId, difficulty: ex.difficulty,
      images: (ex.images ?? []) as string[],
    });
    setImageFiles([]);
    setShowForm(true);
  };

  if (loading) return <div className="text-muted text-sm p-8">Жүктелуде...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-accent">Жаттығулар</h1>
        <button
          onClick={() => { setEditing(null); setForm({ titleEn: "", titleRu: "", descriptionEn: "", descriptionRu: "", specialtyId: "", difficulty: "INTERMEDIATE", images: [] }); setImageFiles([]); setShowForm(true); }}
          className="glass rounded-lg px-4 py-2 text-sm hover:border-accent/30 transition-all"
        >
          + Жаңа жаттығу
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-mono text-accent mb-4">
            {editing ? "Жаттығуды өңдеу" : "Жаңа жаттығу"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Атауы (EN)" value={form.titleEn} onChange={e => setForm({...form, titleEn: e.target.value})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Атауы (RU)" value={form.titleRu} onChange={e => setForm({...form, titleRu: e.target.value})} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Сипаттама (EN)" value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} rows={2} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Сипаттама (RU)" value={form.descriptionRu} onChange={e => setForm({...form, descriptionRu: e.target.value})} rows={2} />
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:border-accent outline-none" value={form.specialtyId} onChange={e => setForm({...form, specialtyId: e.target.value})}>
              <option value="">Мамандықты таңдаңыз</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{(s as any).nameKz || s.nameRu || s.nameEn}</option>)}
            </select>
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:border-accent outline-none" value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
              <option value="BEGINNER">Қарапайым</option>
              <option value="INTERMEDIATE">Орташа</option>
              <option value="ADVANCED">Күрделі</option>
            </select>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
              Талдау суреттері ({editing ? form.images.length : imageFiles.length})
            </h4>
            {editing ? (
              <ImageUploader
                images={form.images}
                exerciseId={editing.id}
                onImagesChange={(imgs) => setForm({...form, images: imgs})}
              />
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  ref={createFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    setImageFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                {imageFiles.length === 0 ? (
                  <button
                    onClick={() => createFileRef.current?.click()}
                    className="text-xs text-accent hover:underline"
                  >
                    + Талдау суреттерін таңдау
                  </button>
                ) : (
                  <div className="text-left">
                    <ul className="text-xs text-text space-y-1 mb-2">
                      {imageFiles.map((f) => (
                        <li key={f.name} className="flex items-center gap-2">
                          <span className="text-accent">📎</span>
                          {f.name}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => createFileRef.current?.click()}
                      className="text-xs text-muted hover:text-text"
                    >
                      Басқа суреттер қосу
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={editing ? handleUpdate : handleCreate} disabled={imageUploading} className="bg-accent text-bg rounded px-4 py-2 text-sm disabled:opacity-50">{editing ? "Сақтау" : "Қосу"}</button>
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
              <th className="px-4 py-3 text-xs text-muted font-normal">Деңгей</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Белгілер</th>
              <th className="px-4 py-3 text-xs text-muted font-normal text-right">Әрекеттер</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => (
              <tr key={ex.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-4 py-3 text-text">{ex.titleEn}</td>
                <td className="px-4 py-3 text-muted">{ex.specialty?.nameKz || ex.specialty?.nameRu || ex.specialty?.nameEn}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${ex.difficulty === "BEGINNER" ? "bg-green-400/10 text-green-400" : ex.difficulty === "INTERMEDIATE" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}>{ex.difficulty === "BEGINNER" ? "Қарапайым" : ex.difficulty === "INTERMEDIATE" ? "Орташа" : "Күрделі"}</span>
                </td>
                <td className="px-4 py-3 text-muted text-xs">{ex._count?.exerciseSymptoms ?? 0} белгі, {ex._count?.exerciseDiagnoses ?? 0} диагноз</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(ex)} className="text-xs text-muted hover:text-text mr-3">Өңдеу</button>
                  <button onClick={() => handleDelete(ex.id)} className="text-xs text-red-400 hover:text-red-300">Жою</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
