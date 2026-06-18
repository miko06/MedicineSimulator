import { useState, useRef } from "react";

interface VoicePlayerProps {
  exerciseId: string;
}

export default function VoicePlayer({ exerciseId }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAndPlay = async () => {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/exercises/${exerciseId}/voice`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError(true);
        }
        return;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        setError(true);
        return;
      }

      const url = URL.createObjectURL(blob);
      setCachedUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        setCachedUrl(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlaying(false);
        setError(true);
        URL.revokeObjectURL(url);
        setCachedUrl(null);
        audioRef.current = null;
      };

      await audio.play();
      setPlaying(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    // Always fetch fresh audio — ElevenLabs streams are single-use
    await fetchAndPlay();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="glass rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm hover:border-accent/30 transition-all disabled:opacity-50 w-full justify-center"
      title={error ? "Voice unavailable for this exercise" : playing ? "Stop" : "Listen to patient"}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-muted border-t-accent rounded-full animate-spin" />
          <span className="text-muted">Generating voice...</span>
        </>
      ) : error ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21" fill="currentColor" />
          </svg>
          <span className="text-muted">Voice unavailable</span>
        </>
      ) : playing ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          <span className="text-accent">Stop</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21" fill="currentColor" />
          </svg>
          <span className="text-text">Listen to patient</span>
        </>
      )}
    </button>
  );
}
