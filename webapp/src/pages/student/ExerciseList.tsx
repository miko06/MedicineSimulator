import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { useLocale } from "../../hooks/useLocale";
import { kzDifficulty } from "../../lib/i18n";

interface ExerciseCard {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  specialty: { slug: string; name: string };
  symptomsCount: number;
  diagnosesCount: number;
  attemptsCount: number;
}

export default function ExerciseList() {
  const [searchParams] = useSearchParams();
  const { version } = useLocale();
  const specialtySlug = searchParams.get("specialty") ?? "";

  const [exercises, setExercises] = useState<ExerciseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<Array<{ slug: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");

  const load = (p: number) => {
    setLoading(true);
    const params: Record<string, string> = { page: String(p), limit: "12" };
    if (specialtySlug) params.specialty = specialtySlug;
    if (difficulty) params.difficulty = difficulty;
    if (search) params.search = search;

    api.exercises.list(params).then((data) => {
      setExercises(data.data as ExerciseCard[]);
      setTotal(data.pagination.total);
      setPage(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.specialties.list().then(setSpecialties).catch(() => {});
  }, [version]);

  useEffect(() => {
    load(1);
  }, [specialtySlug, difficulty, version]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link to="/dashboard" className="text-xs text-muted hover:text-text mb-4 inline-block transition-colors">
        ← Басты бет
      </Link>

      <h1 className="text-xl font-mono text-accent mb-6">
        {specialtySlug ? specialties.find((s) => s.slug === specialtySlug)?.name ?? specialtySlug : "Барлық жаттығулар"}
      </h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Жаттығуларды іздеу..."
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </form>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="">Барлық деңгейлер</option>
          <option value="BEGINNER">Қарапайым</option>
          <option value="INTERMEDIATE">Орташа</option>
          <option value="ADVANCED">Күрделі</option>
        </select>
      </div>

      {!specialtySlug && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            to="/exercises"
            className="text-xs px-3 py-1.5 rounded glass text-accent border-accent/30"
          >
            Барлығы
          </Link>
          {specialties.map((s) => (
            <Link
              key={s.slug}
              to={`/exercises?specialty=${s.slug}`}
              className="text-xs px-3 py-1.5 rounded glass text-muted hover:text-text hover:border-accent/30 transition-all"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted text-sm py-20">Жүктелуде...</div>
      ) : exercises.length === 0 ? (
        <div className="text-center text-muted text-sm py-20">
          Жаттығулар табылмады. Басқа сүзгі қолданып көріңіз.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {exercises.map((ex) => (
              <Link
                key={ex.id}
                to={`/exercises/${ex.id}`}
                className="glass rounded-lg p-4 hover:border-accent/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      ex.difficulty === "BEGINNER"
                        ? "bg-green-400/10 text-green-400"
                        : ex.difficulty === "INTERMEDIATE"
                          ? "bg-yellow-400/10 text-yellow-400"
                          : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {kzDifficulty(ex.difficulty)}
                  </span>
                  <span className="text-xs text-muted">{ex.specialty.name}</span>
                </div>
                <h3 className="text-sm text-text group-hover:text-accent transition-colors">
                  {ex.title}
                </h3>
                <p className="text-xs text-muted mt-1 line-clamp-2">{ex.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                  <span>{ex.symptomsCount} белгі</span>
                  <span>{ex.diagnosesCount} диагноз</span>
                  <span>{ex.attemptsCount} әрекет</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => load(i + 1)}
                  className={`w-8 h-8 rounded text-xs ${
                    page === i + 1
                      ? "bg-accent text-bg"
                      : "glass text-muted hover:text-text"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
