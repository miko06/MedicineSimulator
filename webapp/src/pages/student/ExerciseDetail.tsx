import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type ExerciseDetail, type AttemptResult } from "../../api/client";
import { useLocale } from "../../hooks/useLocale";
import SplineRobotViewer from "../../components/robot/SplineRobotViewer";
import PatientImages from "../../components/PatientImages";
import VoicePlayer from "../../components/VoicePlayer";

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-sm text-red-400">{message}</p>
      <button onClick={onRetry} className="border border-border rounded px-4 py-2 text-sm hover:border-accent/30 transition-colors">
        Retry
      </button>
    </div>
  );
}

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const { version } = useLocale();

  const fetchExercise = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.exercises
      .get(id)
      .then(setExercise)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load exercise"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExercise();
  }, [id, version]);

  const zoneSymptoms = useMemo(() => {
    if (!exercise || !selectedZone) return [];
    return exercise.symptoms.filter((s) => s.bodyZone === selectedZone);
  }, [exercise, selectedZone]);

  const allHighlightedZones = useMemo(() => {
    if (!exercise) return [];
    return exercise.symptoms
      .filter((s) => !selectedZone || s.bodyZone === selectedZone)
      .map((s) => ({
        zone: s.bodyZone,
        color: s.color,
        intensity: s.severity / 10,
      }));
  }, [exercise, selectedZone]);

  const startAttempt = async () => {
    if (!id) return;
    try {
      const data = await api.exercises.startAttempt(id);
      setAttemptId(data.id);
      setResult(null);
      setSelectedAnswer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start attempt");
    }
  };

  const submitAnswer = async (diagnosisId: string, final: boolean) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const data = await api.exercises.submitAnswer(id, diagnosisId, timeSpent, final);
      setSelectedAnswer(diagnosisId);
      setResult(data);
      if (final) setAttemptId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-muted text-sm">
        Loading exercise...
      </div>
    );
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={fetchExercise} />;
  }

  if (!exercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <p className="text-sm text-muted">Exercise not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-accent hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)} className="text-xs text-muted hover:text-text mb-4 transition-colors">
        ← Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 3D Robot */}
        <div className="glass rounded-xl overflow-hidden h-[400px] lg:h-[520px] relative">
          <SplineRobotViewer
            className="w-full h-full"
            zoneOverrides={allHighlightedZones}
            selectedZone={selectedZone}
            onZoneClick={(zoneId) => setSelectedZone(zoneId === selectedZone ? null : zoneId)}
          />

          {selectedZone && zoneSymptoms.length > 0 && (
          <div className="absolute bottom-12 left-3 right-3 glass rounded-lg p-3 z-10">
            <p className="text-xs text-muted mb-1">
              {selectedZone} — {zoneSymptoms.length} symptom{zoneSymptoms.length > 1 ? "s" : ""}
            </p>
            {zoneSymptoms.map((s) => (
              <div key={s.id} className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-text">{s.name}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Right: Patient Images */}
        <PatientImages images={exercise.images} />
      </div>

      {/* Voice Player */}
      <div className="mt-4">
        <VoicePlayer exerciseId={exercise.id} />
      </div>

      {/* Title + Description */}
      <div className="mt-6">
        <p className="text-xs text-muted font-mono uppercase tracking-wider">{exercise.specialty.name}</p>
        <h1 className="text-xl font-mono text-accent mt-1">{exercise.title}</h1>
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded mt-2 ${exercise.difficulty === "BEGINNER" ? "bg-green-400/10 text-green-400" : exercise.difficulty === "INTERMEDIATE" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}
        >
          {exercise.difficulty}
        </span>
      </div>

      <p className="text-sm text-muted leading-relaxed mt-3">{exercise.description}</p>

      {/* Symptoms + Test/Dx area — full width below */}
      <div className="mt-6">
        <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
          Symptoms
          {selectedZone && (
            <button onClick={() => setSelectedZone(null)} className="ml-2 text-accent hover:underline">
              (clear filter)
            </button>
          )}
        </h3>
        <div className="space-y-2">
          {exercise.symptoms
            .filter((s) => !selectedZone || s.bodyZone === selectedZone)
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedZone(s.bodyZone === selectedZone ? null : s.bodyZone)}
                className={`w-full text-left glass rounded p-3 flex items-center gap-3 hover:border-accent/30 transition-all ${s.bodyZone === selectedZone ? "border-accent/40" : ""}`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div>
                  <p className="text-sm text-text">{s.name}</p>
                  <p className="text-xs text-muted">{s.description}</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`w-1 h-3 rounded-full ${i < s.severity ? "bg-red-400/60" : "bg-border"}`} />
                  ))}
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Diagnosis / Test section */}
      <div className="mt-4">
        {!attemptId && !result?.completed && (
          <button
            onClick={startAttempt}
            className="w-full bg-accent text-bg font-medium text-sm py-3 rounded hover:opacity-90 transition-opacity"
          >
            Start Diagnosis
          </button>
        )}

        {result && (
          <div className={`glass rounded-lg p-4 border ${result.isCorrect ? "border-green-400/30" : "border-red-400/30"}`}>
            <p className={`text-sm font-medium ${result.isCorrect ? "text-green-400" : "text-red-400"}`}>
              {result.isCorrect ? "Correct diagnosis!" : "Incorrect"}
            </p>
            {result.answerDetails && (
              <div className="mt-2">
                <p className="text-xs text-muted">Your answer: {result.answerDetails.name}</p>
                <p className="text-xs text-muted mt-1">{result.answerDetails.description}</p>
              </div>
            )}
            {result.correctDiagnosis && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-green-400 font-medium">Correct diagnosis:</p>
                <p className="text-sm text-text mt-1">{result.correctDiagnosis.name}</p>
                <p className="text-xs text-muted mt-1">{result.correctDiagnosis.description}</p>
                {result.correctDiagnosis.treatments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted mb-1">Treatment:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.correctDiagnosis.treatments.map((t, i) => (
                        <span key={i} className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-text">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {attemptId && !result?.completed && (
          <div>
            <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
              Select Diagnosis ({exercise.diagnosesCount} options)
            </h3>
            <div className="space-y-2">
              {exercise.diagnoses.map((d) => (
                <button
                  key={d.id}
                  onClick={() => submitAnswer(d.id, false)}
                  disabled={submitting}
                  className={`w-full text-left glass rounded-lg p-3 text-sm hover:border-accent/40 transition-all ${selectedAnswer === d.id ? "border-accent/50 bg-accent/5" : ""}`}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedAnswer && submitAnswer(selectedAnswer, true)}
              disabled={!selectedAnswer || submitting}
              className="w-full bg-accent/10 text-accent border border-accent/20 rounded py-2.5 text-sm mt-4 hover:bg-accent/20 transition-colors disabled:opacity-30"
            >
              {submitting ? "Submitting..." : "Submit Final Answer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
