import { useState } from "react";

interface PatientImagesProps {
  images: string[];
}

export default function PatientImages({ images }: PatientImagesProps) {
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="glass rounded-lg p-4 text-center text-xs text-muted">
        No patient images available for this case
      </div>
    );
  }

  const current = images[selected];
  const isImage = current && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(current);

  // Since images are stored as folder paths, show a note
  if (!isImage) {
    return (
      <div className="glass rounded-lg p-4">
        <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
          Patient Scans
        </h4>
        <p className="text-xs text-muted">
          Scans available in: {images.join(", ")}
        </p>
        <p className="text-xs text-muted mt-1">
          Upload individual images via Admin Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4">
      <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
        Patient Scans ({images.length})
      </h4>

      <div className="relative">
        <img
          src={current}
          alt={`Patient scan ${selected + 1}`}
          className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setFullscreen(true)}
        />

        {images.length > 1 && (
          <div className="flex justify-between mt-2">
            <button
              onClick={() => setSelected((s) => (s - 1 + images.length) % images.length)}
              className="text-xs text-muted hover:text-text px-2 py-1"
              disabled={selected === 0}
            >
              ← Prev
            </button>
            <span className="text-xs text-muted">
              {selected + 1} / {images.length}
            </span>
            <button
              onClick={() => setSelected((s) => (s + 1) % images.length)}
              className="text-xs text-muted hover:text-text px-2 py-1"
              disabled={selected === images.length - 1}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 bg-bg/95 z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-muted hover:text-text text-sm"
            onClick={() => setFullscreen(false)}
          >
            ✕ Close
          </button>
          <img
            src={current}
            alt={`Patient scan ${selected + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
