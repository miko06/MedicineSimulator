import { useState, useEffect } from "react";

interface PatientImagesProps {
  images: string[];
}

export default function PatientImages({ images }: PatientImagesProps) {
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  if (!images || images.length === 0) {
    return (
      <div className="glass rounded-lg p-4 text-center text-xs text-muted">
        No patient images available for this case
      </div>
    );
  }

  const current = images[selected];
  const isImage = current && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(current);

  if (!isImage) {
    return (
      <div className="glass rounded-lg p-4">
        <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
          Patient Scans
        </h4>
        <p className="text-xs text-muted">
          Scans available in: {images.join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4">
      <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
        Patient Scans ({images.length})
      </h4>

      <img
        src={current}
        alt={`Patient scan ${selected + 1}`}
        className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onDoubleClick={() => setFullscreen(true)}
      />

      {images.length > 1 && (
        <div className="flex justify-between mt-2">
          <button
            onClick={() => setSelected((s) => (s - 1 + images.length) % images.length)}
            className="text-xs text-muted hover:text-text px-2 py-1"
          >
            ← Prev
          </button>
          <span className="text-xs text-muted">{selected + 1} / {images.length}</span>
          <button
            onClick={() => setSelected((s) => (s + 1) % images.length)}
            className="text-xs text-muted hover:text-text px-2 py-1"
          >
            Next →
          </button>
        </div>
      )}

      {fullscreen && (
        <div
          className="fixed inset-0 bg-bg/95 z-50 flex items-center justify-center p-8 cursor-pointer"
          onDoubleClick={() => setFullscreen(false)}
        >
          <img
            src={current}
            alt={`Patient scan ${selected + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg pointer-events-none"
          />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted">
            Double-click or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
