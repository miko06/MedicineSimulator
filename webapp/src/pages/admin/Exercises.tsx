import { useEffect, useState } from "react";
import { api } from "../../api/client";
import ImageUploader from "../../components/ImageUploader";

interface Exercise {
  id: string;
  titleEn: string;
  titleRu: string;
  difficulty: string;
  specialty: { id: string; slug: string; nameEn: string; nameRu: string };
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

  const handleCreate = async () => {
    await api.admin.exercises.create(form);
    setShowForm(false);
    setForm({ titleEn: "", titleRu: "", descriptionEn: "", descriptionRu: "", specialtyId: "", difficulty: "INTERMEDIATE", images: [] });
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
    if (!confirm("Delete this exercise?")) return;
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
    setShowForm(true);
  };

  if (loading) return <div className="text-muted text-sm p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-accent">Exercises</h1>
        <button
          onClick={() => { setEditing(null); setForm({ titleEn: "", titleRu: "", descriptionEn: "", descriptionRu: "", specialtyId: "", difficulty: "INTERMEDIATE", images: [] }); setShowForm(true); }}
          className="glass rounded-lg px-4 py-2 text-sm hover:border-accent/30 transition-all"
        >
          + New Exercise
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-mono text-accent mb-4">
            {editing ? "Edit Exercise" : "New Exercise"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Title EN" value={form.titleEn} onChange={e => setForm({...form, titleEn: e.target.value})} />
            <input className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Title RU" value={form.titleRu} onChange={e => setForm({...form, titleRu: e.target.value})} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Description EN" value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} rows={2} />
            <textarea className="bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent outline-none" placeholder="Description RU" value={form.descriptionRu} onChange={e => setForm({...form, descriptionRu: e.target.value})} rows={2} />
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:border-accent outline-none" value={form.specialtyId} onChange={e => setForm({...form, specialtyId: e.target.value})}>
              <option value="">Select specialty</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{s.nameEn}</option>)}
            </select>
            <select className="bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:border-accent outline-none" value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>

          {editing && (
            <div className="mt-4">
              <ImageUploader
                images={form.images}
                exerciseId={editing.id}
                onImagesChange={(imgs) => setForm({...form, images: imgs})}
              />
            </div>
          )}

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
              <th className="px-4 py-3 text-xs text-muted font-normal">Title</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Specialty</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Difficulty</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Symptoms</th>
              <th className="px-4 py-3 text-xs text-muted font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => (
              <tr key={ex.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-4 py-3 text-text">{ex.titleEn}</td>
                <td className="px-4 py-3 text-muted">{ex.specialty?.nameEn}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${ex.difficulty === "BEGINNER" ? "bg-green-400/10 text-green-400" : ex.difficulty === "INTERMEDIATE" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}>{ex.difficulty}</span>
                </td>
                <td className="px-4 py-3 text-muted text-xs">{ex._count?.exerciseSymptoms ?? 0} symptoms, {ex._count?.exerciseDiagnoses ?? 0} diagnoses</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(ex)} className="text-xs text-muted hover:text-text mr-3">Edit</button>
                  <button onClick={() => handleDelete(ex.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
