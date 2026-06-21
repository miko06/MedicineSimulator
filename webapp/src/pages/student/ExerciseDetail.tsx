import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type ExerciseDetail, type AttemptResult } from "../../api/client";
import { useLocale } from "../../hooks/useLocale";
import { kzBodyZone, kzDifficulty } from "../../lib/i18n";
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
        Жаттығу жүктелуде...
      </div>
    );
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={fetchExercise} />;
  }

  if (!exercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <p className="text-sm text-muted">Жаттығу табылмады</p>
        <button onClick={() => navigate(-1)} className="text-xs text-accent hover:underline">Артқа</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)} className="text-xs text-muted hover:text-text mb-4 transition-colors">
        ← Артқа
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
              {kzBodyZone(selectedZone)} — {zoneSymptoms.length} белгі
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
          {kzDifficulty(exercise.difficulty)}
        </span>
      </div>

      <p className="text-sm text-muted leading-relaxed mt-3">{exercise.description}</p>

      {(exercise.patientAge || exercise.patientGender || exercise.patientHistory) && (
        <div className="glass rounded-lg p-4 mt-3">
          <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Науқас туралы ақпарат</h4>
          <div className="space-y-1 text-sm">
            {exercise.patientAge && <p className="text-text"><span className="text-muted">Жасы:</span> {exercise.patientAge}</p>}
            {exercise.patientGender && <p className="text-text"><span className="text-muted">Жынысы:</span> {exercise.patientGender}</p>}
            {exercise.patientHistory && <p className="text-text"><span className="text-muted">Анамнез:</span> {exercise.patientHistory}</p>}
          </div>
        </div>
      )}

      {/* Symptoms + Test/Dx area — full width below */}
      <div className="mt-6">
        <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
          Белгілер
          {selectedZone && (
            <button onClick={() => setSelectedZone(null)} className="ml-2 text-accent hover:underline">
              (сүзгіні тазалау)
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
                      {s.attachments && (s.attachments as Array<{name:string;path:string}>).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(s.attachments as Array<{name:string;path:string}>).map((a, ai) => (
                            <a key={ai} href={a.path} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-accent/10 text-accent rounded px-2 py-0.5 hover:bg-accent/20 transition-colors inline-flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                              {a.name}
                            </a>
                          ))}
                        </div>
                      )}
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
        {exercise.testSteps && (exercise.testSteps as Array<{type:string;title:string;options:string[];correctIndex:number}>).length > 0 ? (
          <MultiStepTest
            steps={exercise.testSteps as Array<{type:string;title:string;options:string[];correctIndex:number}>}
            attemptId={attemptId}
            startAttempt={startAttempt}
            result={result}
            submitting={submitting}
            onSubmit={submitAnswer}
          />
        ) : (
          <>
            {!attemptId && !result?.completed && (
              <button onClick={startAttempt} className="w-full bg-accent text-bg font-medium text-sm py-3 rounded hover:opacity-90 transition-opacity">
                Диагнозды бастау
              </button>
            )}

            {result && (
              <div className={`glass rounded-lg p-5 border ${result.isCorrect ? "border-green-400/30" : "border-red-400/30"}`}>
                <p className="text-base font-medium text-accent">Тест тапсырылды</p>
                <p className="text-2xl font-heading font-semibold text-text mt-2">
                  Сіздің баллыңыз: {result.score} / 100
                </p>
                <p className={`text-sm font-medium mt-2 ${result.isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {result.isCorrect ? "Дұрыс!" : "Қате"}
                </p>
                {result.answerDetails && (
                  <div className="mt-2">
                    <p className="text-xs text-muted">Сіздің жауабыңыз: {result.answerDetails.name}</p>
                    <p className="text-xs text-muted mt-1">{result.answerDetails.description}</p>
                  </div>
                )}
                {result.correctDiagnosis && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-green-400 font-medium">Дұрыс жауап:</p>
                    <p className="text-sm text-text mt-1">{result.correctDiagnosis.name}</p>
                    <p className="text-xs text-muted mt-1">{result.correctDiagnosis.description}</p>
                    {result.correctDiagnosis.treatments.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted mb-1">Емдеу:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.correctDiagnosis.treatments.map((t, i) => (
                            <span key={i} className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-text">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedAnswer(null);
                    setResult(null);
                    startAttempt();
                  }}
                  className="mt-5 bg-accent text-bg rounded px-4 py-2 text-sm hover:opacity-90 transition-opacity"
                >
                  Қайта тапсыру
                </button>
              </div>
            )}

            {attemptId && !result?.completed && (
              <div>
                <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
                  Диагнозды таңдаңыз ({exercise.diagnosesCount} нұсқа)
                </h3>
                <div className="space-y-2">
                  {exercise.diagnoses.map((d) => (
                    <button key={d.id} onClick={() => submitAnswer(d.id, false)} disabled={submitting}
                      className={`w-full text-left glass rounded-lg p-3 text-sm hover:border-accent/40 transition-all ${selectedAnswer === d.id ? "border-accent/50 bg-accent/5" : ""}`}>
                      {d.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => selectedAnswer && submitAnswer(selectedAnswer, true)}
                  disabled={!selectedAnswer || submitting}
                  className="w-full bg-accent/10 text-accent border border-accent/20 rounded py-2.5 text-sm mt-4 hover:bg-accent/20 transition-colors disabled:opacity-30">
                  {submitting ? "Жіберілуде..." : "Соңғы жауапты жіберу"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MultiStepTest({
  steps, attemptId, startAttempt, result, submitting, onSubmit,
}: {
  steps: Array<{ type: string; title: string; options: string[]; correctIndex: number }>;
  attemptId: string | null;
  startAttempt: () => void;
  result: AttemptResult | null;
  submitting: boolean;
  onSubmit: (answer: string, final: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);

  if (!attemptId) {
    return (
      <button onClick={startAttempt} className="w-full bg-accent text-bg font-medium text-sm py-3 rounded hover:opacity-90 transition-opacity">
        Көп қадамды тесті бастау ({steps.length} қадам)
      </button>
    );
  }

  if (completed) {
    const correct = answers.filter((a, i) => a === steps[i]!.correctIndex).length;
    const score = result?.score ?? Math.round((correct / steps.length) * 100);
    return (
      <div className="glass rounded-lg p-5 border border-accent/30">
        <p className="text-base font-medium text-accent">Тест тапсырылды</p>
        <p className="text-2xl font-heading font-semibold text-text mt-2">
          Сіздің баллыңыз: {score} / 100
        </p>
        <p className="text-sm text-muted mt-1">
          {correct} / {steps.length} дұрыс жауап
        </p>
        {result && result.correctDiagnosis && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-green-400 font-medium">Дұрыс диагноз:</p>
            <p className="text-sm text-text mt-1">{result.correctDiagnosis.name}</p>
            <p className="text-xs text-muted mt-1">{result.correctDiagnosis.description}</p>
          </div>
        )}
        <button
          onClick={() => {
            setStep(0);
            setAnswers([]);
            setCompleted(false);
            startAttempt();
          }}
          className="mt-5 bg-accent text-bg rounded px-4 py-2 text-sm hover:opacity-90 transition-opacity"
        >
          Қайта тапсыру
        </button>
      </div>
    );
  }

  const current = steps[step];
  if (!current) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-accent" : i === step ? "bg-accent/60" : "bg-border"}`} />
        ))}
        <span className="text-xs text-muted ml-2">{step + 1}/{steps.length}</span>
      </div>

      <div className="glass rounded-lg p-4">
        <h3 className="text-sm font-medium text-text mb-3">{current.title}</h3>
        <div className="space-y-2">
          {current.options.map((opt, i) => (
            <button key={i} onClick={() => {
              const newAnswers = [...answers];
              newAnswers[step] = i;
              setAnswers(newAnswers);
            }} className={`w-full text-left glass rounded-lg p-3 text-sm hover:border-accent/40 transition-all ${answers[step] === i ? "border-accent/50 bg-accent/5" : ""}`}>
              {opt}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="text-xs text-muted hover:text-text disabled:opacity-30">← Артқа</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={answers[step] === undefined} className="bg-accent/10 text-accent rounded px-4 py-1.5 text-sm disabled:opacity-30">Келесі →</button>
          ) : (
            <button onClick={() => { setCompleted(true); onSubmit(answers.join(","), true); }} disabled={answers[step] === undefined || submitting} className="bg-accent text-bg rounded px-4 py-1.5 text-sm disabled:opacity-30">
              {submitting ? "Жіберілуде..." : "Тестті аяқтау"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
