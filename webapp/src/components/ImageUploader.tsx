import { useRef, useState } from "react";

interface ImageUploaderProps {
  images: string[];
  exerciseId: string;
  onImagesChange: (images: string[]) => void;
}

export default function ImageUploader({ images, exerciseId, onImagesChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch(`/api/admin/exercises/${exerciseId}/images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onImagesChange(data.images as string[]);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    const res = await fetch(`/api/admin/exercises/${exerciseId}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ index }),
    });

    if (res.ok) {
      const data = await res.json();
      onImagesChange(data.images as string[]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-mono text-muted uppercase tracking-wider">
          Талдау суреттері ({images.length})
        </h4>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-accent hover:underline"
        >
          {uploading ? "Жүктелуде..." : "+ Қосу"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver ? "border-accent/50 bg-accent/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
      >
        {images.length === 0 ? (
          <p className="text-xs text-muted">
            Суреттерді осы жерге тасыңыз немесе <span className="text-accent cursor-pointer" onClick={() => inputRef.current?.click()}>+ Қосу</span> басыңыз
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img}
                  alt={`Сурет ${i + 1}`}
                  className="w-full h-20 object-cover rounded"
                />
                <button
                  onClick={() => handleDelete(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
