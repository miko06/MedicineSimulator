import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ErrorAttempt } from "../../api/client";

export default function ErrorHistory() {
  const [attempts, setAttempts] = useState<ErrorAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.progress
      .errorHistory()
      .then((res) => setAttempts(res.attempts))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted text-sm">
        Жүктелуде...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-accent">Қателіктер тарихы</h1>
        <Link
          to="/progress"
          className="text-xs text-muted hover:text-text transition-colors"
        >
          ← Прогресс
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted">
          Сізде әлі тіркелген қателер жоқ. Барлық жаттығуларды сәтті орындадыңыз.
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((a) => (
            <div key={a.id} className="glass rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-text">
                    {a.exercise.title || "Жаттығу"}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {a.exercise.specialty.nameKz ||
                      a.exercise.specialty.nameRu ||
                      a.exercise.specialty.nameEn}
                    {" · "}
                    {a.exercise.difficulty}
                    {" · "}
                    {new Date(a.createdAt).toLocaleString("kk-KZ")}
                  </p>
                </div>
                <span className="text-lg font-mono text-red-400">
                  {a.score}%
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {a.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className={`text-xs px-3 py-2 rounded-lg border ${
                      ans.isCorrect
                        ? "border-green-500/30 bg-green-500/10 text-green-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {ans.isCorrect ? "✓" : "✗"} {ans.diagnosisName}
                  </div>
                ))}
              </div>

              {a.correctDiagnosis && (
                <p className="text-xs text-muted mb-3">
                  Дұрыс диагноз:{" "}
                  <span className="text-text">{a.correctDiagnosis.name}</span>
                </p>
              )}

              <Link
                to={`/ai?tab=errors&attempt=${a.id}`}
                className="text-xs text-accent hover:underline"
              >
                ЖИ талдауын қарау →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
