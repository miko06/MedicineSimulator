import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

interface DiagnosisRecord {
  id: string;
  symptoms: string;
  notes: string;
  result: string;
  createdAt: string;
}

export default function DiagnosisHistory() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.ai
      .diagnoses()
      .then((res) => setDiagnoses(res.diagnoses))
      .catch(() => setDiagnoses([]))
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
        <h1 className="text-xl font-mono text-accent">
          Диагноздар тарихы
        </h1>
        <Link
          to="/ai"
          className="text-xs text-muted hover:text-text transition-colors"
        >
          ← ЖИ зертханасы
        </Link>
      </div>

      {diagnoses.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted">
          Әлі ешқандай ЖИ диагнозы жоқ. Жаңа диагноз жасау үшін ЖИ зертханасына
          өтіңіз.
        </div>
      ) : (
        <div className="space-y-3">
          {diagnoses.map((d) => {
            const isOpen = expandedId === d.id;
            return (
              <div key={d.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">
                      {d.symptoms || "Белгілер көрсетілмеген"}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {new Date(d.createdAt).toLocaleString("kk-KZ")}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : d.id)}
                    className="text-xs text-accent hover:underline whitespace-nowrap"
                  >
                    {isOpen ? "Жабу" : "Нәтижені қарау"}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    {d.notes && (
                      <div>
                        <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                          Қосымша жазбалар
                        </h4>
                        <p className="text-sm text-text whitespace-pre-wrap">
                          {d.notes}
                        </p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                        ЖИ нәтижесі
                      </h4>
                      <div className="bg-surface border border-border rounded-lg p-4 text-sm text-text whitespace-pre-wrap leading-relaxed">
                        {d.result || "Нәтиже бос."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
