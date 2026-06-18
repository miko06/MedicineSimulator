import { lazy, Suspense, useRef, useCallback, useEffect, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SCENE_URL = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

// Maps body zones to Spline object name substrings
const ZONE_TO_SPLINE: Record<string, string[]> = {
  HEAD: ["Head"],
  NECK: ["Neck"],
  CHEST: ["Top part"],
  ABDOMEN: ["Body"],
  PELVIS: ["Pelvic"],
  LEFT_ARM: ["arm", "elbow", "forearm"],
  RIGHT_ARM: ["arm", "elbow", "forearm"],
  LEFT_HAND: ["Hand LEFT"],
  RIGHT_HAND: ["Hand"],
  LEFT_LEG: ["femur", "shin"],
  RIGHT_LEG: ["femur", "shin"],
  LEFT_FOOT: ["Foot"],
  RIGHT_FOOT: ["Foot"],
};

export interface ZoneOverride {
  zone: string;
  color: string;
  intensity: number;
  symptomIds?: string[];
}

interface SplineRobotViewerProps {
  className?: string;
  zoneOverrides?: ZoneOverride[];
  selectedZone?: string | null;
  onZoneClick?: (zoneId: string) => void;
  onZoneHover?: (zoneId: string | null) => void;
}

function SplineInner({
  zoneOverrides = [],
  selectedZone,
  onZoneClick,
  onZoneHover,
}: Omit<SplineRobotViewerProps, "className">) {
  const splineAppRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const highlightedRef = useRef<Set<string>>(new Set());

  const applyZoneColor = useCallback(
    (zoneKey: string, color: string, intensity: number, highlight: boolean) => {
      const app = splineAppRef.current;
      if (!app) return;

      const searchTerms = ZONE_TO_SPLINE[zoneKey];
      if (!searchTerms) return;

      try {
        const allObjects = app.getAllObjects?.() ?? [];

        for (const obj of allObjects) {
          if (!obj?.name) continue;

          const matches = searchTerms.some((term) =>
            obj.name.includes(term)
          );
          if (!matches) continue;

          if (highlight) {
            highlightedRef.current.add(obj.name);
            if (obj.material) {
              obj.material.color?.set?.(color);
              obj.material.emissive?.set?.(color);
              obj.material.emissiveIntensity = intensity * 0.7;
            }
            for (const child of obj.children || []) {
              if (child.material) {
                child.material.color?.set?.(color);
                child.material.emissive?.set?.(color);
                child.material.emissiveIntensity = intensity * 0.5;
              }
            }
          } else {
            highlightedRef.current.delete(obj.name);
            if (obj.material) {
              obj.material.color?.set?.("#3A3A3A");
              obj.material.emissive?.set?.("#000000");
              obj.material.emissiveIntensity = 0;
            }
            for (const child of obj.children || []) {
              if (child.material) {
                child.material.color?.set?.("#3A3A3A");
                child.material.emissive?.set?.("#000000");
                child.material.emissiveIntensity = 0;
              }
            }
          }
        }
      } catch {
        // ignore
      }
    },
    []
  );

  useEffect(() => {
    if (!loaded) return;

    const app = splineAppRef.current;
    if (!app) return;

    // Reset all previously highlighted objects
    try {
      const prev = highlightedRef.current;
      const all = app.getAllObjects?.() ?? [];
      for (const obj of all) {
        if (!obj?.name || !prev.has(obj.name)) continue;
        if (obj.material) {
          obj.material.color?.set?.("#3A3A3A");
          obj.material.emissive?.set?.("#000000");
          obj.material.emissiveIntensity = 0;
        }
        for (const child of obj.children || []) {
          if (child.material) {
            child.material.color?.set?.("#3A3A3A");
            child.material.emissive?.set?.("#000000");
            child.material.emissiveIntensity = 0;
          }
        }
      }
    } catch {}
    highlightedRef.current.clear();

    // Apply new highlights
    for (const z of zoneOverrides) {
      applyZoneColor(z.zone, z.color, z.intensity, true);
    }
  }, [zoneOverrides, loaded, applyZoneColor]);

  useEffect(() => {
    if (!loaded || !selectedZone) return;

    const app = splineAppRef.current;
    if (!app) return;

    try {
      const onMouseDown = (e: any) => {
        if (e?.target?.name && onZoneClick) {
          onZoneClick(e.target.name);
        }
      };
      app.addEventListener?.("mouseDown", onMouseDown);

      const onMouseHover = (e: any) => {
        if (e?.target?.name && onZoneHover) {
          onZoneHover(e.target.name);
        } else {
          onZoneHover?.(null);
        }
      };
      app.addEventListener?.("mouseHover", onMouseHover);

      return () => {
        app.removeEventListener?.("mouseDown", onMouseDown);
        app.removeEventListener?.("mouseHover", onMouseHover);
      };
    } catch {
      // Event system unavailable
    }
  }, [loaded, selectedZone, onZoneClick, onZoneHover]);

  const handleLoad = useCallback((splineApp: any) => {
    splineAppRef.current = splineApp;
    setLoaded(true);
  }, []);

  return (
    <Spline
      scene={SCENE_URL}
      onLoad={handleLoad}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default function SplineRobotViewer({
  className = "",
  zoneOverrides = [],
  selectedZone = null,
  onZoneClick,
  onZoneHover,
}: SplineRobotViewerProps) {
  return (
    <div className={`relative ${className}`}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted animate-pulse">
              Loading 3D Robot...
            </span>
          </div>
        }
      >
        <SplineInner
          zoneOverrides={zoneOverrides}
          selectedZone={selectedZone}
          onZoneClick={onZoneClick}
          onZoneHover={onZoneHover}
        />
      </Suspense>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted text-center pointer-events-none">
        Drag to rotate &bull; Scroll to zoom &bull; Click parts to inspect
      </div>
    </div>
  );
}
