import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";

const BODY_COLOR = "#3A3A3A";
const HOVER_COLOR = "#666666";
const SELECTED_COLOR = "#888888";
const WIRE_COLOR = "#555555";

interface ZoneHighlight {
  color: string;
  intensity: number;
}

interface BodyPartProps {
  position: [number, number, number];
  geometry: THREE.BufferGeometry;
  rotation?: [number, number, number];
  zoneId: string;
  highlight?: ZoneHighlight | null;
  isHovered: boolean;
  isSelected: boolean;
  onClick: (zoneId: string) => void;
  onHover: (zoneId: string | null) => void;
}

function BodyPart({
  position,
  geometry,
  rotation,
  zoneId,
  highlight,
  isHovered,
  isSelected,
  onClick,
  onHover,
}: BodyPartProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const wireRef = useRef<THREE.LineSegments>(null);

  const baseColor = highlight
    ? highlight.color
    : isSelected
      ? SELECTED_COLOR
      : isHovered
        ? HOVER_COLOR
        : BODY_COLOR;

  const wireGeo = useMemo(() => new THREE.EdgesGeometry(geometry, 15), [geometry]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;

    if (highlight) {
      const pulse = 0.3 + Math.sin(t * 2.5) * 0.15 * highlight.intensity;
      matRef.current.emissive = new THREE.Color(highlight.color).multiplyScalar(
        highlight.intensity * 0.6
      );
      matRef.current.emissiveIntensity = pulse;
    } else if (isHovered) {
      matRef.current.emissive = new THREE.Color(HOVER_COLOR);
      matRef.current.emissiveIntensity = 0.2 + Math.sin(t * 1.5) * 0.05;
    } else if (isSelected) {
      matRef.current.emissive = new THREE.Color(SELECTED_COLOR);
      matRef.current.emissiveIntensity = 0.15;
    } else {
      matRef.current.emissive = new THREE.Color(0x000000);
      matRef.current.emissiveIntensity = 0;
    }

    matRef.current.color.set(baseColor);

    if (wireRef.current && (isHovered || isSelected || highlight)) {
      wireRef.current.visible = true;
      const mat = wireRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + Math.sin(t * 2) * 0.1;
    } else if (wireRef.current) {
      wireRef.current.visible = false;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        name={zoneId}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick(zoneId);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(zoneId);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
          onHover(null);
        }}
      >
        <meshStandardMaterial
          ref={matRef}
          color={baseColor}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

      <lineSegments ref={wireRef} geometry={wireGeo} visible={false}>
        <lineBasicMaterial
          color={highlight?.color ?? WIRE_COLOR}
          transparent
          opacity={0.4}
          depthTest={true}
        />
      </lineSegments>
    </group>
  );
}

function BreathingTorso({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 0.8) * 0.008;
    groupRef.current.scale.set(breathe, breathe, breathe);
  });

  return <group ref={groupRef}>{children}</group>;
}

function FloorGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]} receiveShadow>
      <planeGeometry args={[6, 6]} />
      <shadowMaterial transparent opacity={0.15} />
    </mesh>
  );
}

function AmbientParticles() {
  const count = 40;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 1] = Math.random() * 3 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.0003;
    const t = state.clock.elapsedTime;
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      attr.array[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.001;
      if (attr.array[i * 3 + 1] > 2) attr.array[i * 3 + 1] = -1;
      if (attr.array[i * 3 + 1] < -1) attr.array[i * 3 + 1] = 2;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#888888" transparent opacity={0.4} />
    </points>
  );
}

function RobotModel({
  zoneOverrides,
  selectedZone,
  onZoneClick,
  onZoneHover,
  hoveredZone,
}: {
  zoneOverrides: ZoneOverride[];
  selectedZone: string | null;
  onZoneClick: (zoneId: string) => void;
  onZoneHover: (zoneId: string | null) => void;
  hoveredZone: string | null;
}) {
  const highlightMap = useMemo(() => {
    const map: Record<string, ZoneHighlight> = {};
    for (const z of zoneOverrides) {
      map[z.zone] = { color: z.color, intensity: z.intensity };
    }
    return map;
  }, [zoneOverrides]);

  const headGeo = useMemo(() => new THREE.SphereGeometry(0.28, 32, 32), []);
  const neckGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16), []);
  const torsoGeo = useMemo(() => new THREE.BoxGeometry(0.65, 0.75, 0.35, 4, 4, 4), []);
  const pelvisGeo = useMemo(() => new THREE.BoxGeometry(0.55, 0.25, 0.3, 4, 2, 4), []);
  const upperArmGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.08, 0.55, 16), []);
  const lowerArmGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.07, 0.5, 16), []);
  const handGeo = useMemo(() => new THREE.SphereGeometry(0.09, 16, 16), []);
  const upperLegGeo = useMemo(() => new THREE.CylinderGeometry(0.13, 0.11, 0.7, 16), []);
  const lowerLegGeo = useMemo(() => new THREE.CylinderGeometry(0.11, 0.09, 0.65, 16), []);
  const footGeo = useMemo(() => new THREE.BoxGeometry(0.15, 0.08, 0.25, 2, 1, 2), []);

  const bp = (zoneId: string) => ({
    highlight: highlightMap[zoneId] ?? null,
    isHovered: hoveredZone === zoneId,
    isSelected: selectedZone === zoneId,
    onClick: onZoneClick,
    onHover: onZoneHover,
  });

  return (
    <BreathingTorso>
      <group position={[0, -0.15, 0]}>
        <BodyPart position={[0, 1.42, 0]} geometry={headGeo} zoneId="HEAD" {...bp("HEAD")} />
        <BodyPart position={[0, 1.2, 0]} geometry={neckGeo} zoneId="NECK" {...bp("NECK")} />
        <BodyPart position={[0, 0.65, 0]} geometry={torsoGeo} zoneId="CHEST" {...bp("CHEST")} />
        <BodyPart position={[0, 0.12, 0]} geometry={pelvisGeo} zoneId="PELVIS" {...bp("PELVIS")} />

        <group position={[0.45, 1.01, 0]}>
          <BodyPart position={[0, -0.15, 0]} geometry={upperArmGeo} zoneId="LEFT_ARM" {...bp("LEFT_ARM")} />
          <BodyPart position={[0, -0.7, 0]} geometry={lowerArmGeo} zoneId="LEFT_ARM" {...bp("LEFT_ARM")} />
          <BodyPart position={[0, -1.05, 0]} geometry={handGeo} zoneId="LEFT_HAND" {...bp("LEFT_HAND")} />
        </group>

        <group position={[-0.45, 1.01, 0]}>
          <BodyPart position={[0, -0.15, 0]} geometry={upperArmGeo} zoneId="RIGHT_ARM" {...bp("RIGHT_ARM")} />
          <BodyPart position={[0, -0.7, 0]} geometry={lowerArmGeo} zoneId="RIGHT_ARM" {...bp("RIGHT_ARM")} />
          <BodyPart position={[0, -1.05, 0]} geometry={handGeo} zoneId="RIGHT_HAND" {...bp("RIGHT_HAND")} />
        </group>

        <group position={[0.18, -0.12, 0]}>
          <BodyPart position={[0, -0.4, 0]} geometry={upperLegGeo} zoneId="LEFT_LEG" {...bp("LEFT_LEG")} />
          <BodyPart position={[0, -1.1, 0]} geometry={lowerLegGeo} zoneId="LEFT_LEG" {...bp("LEFT_LEG")} />
          <BodyPart position={[0, -1.47, 0.06]} geometry={footGeo} zoneId="LEFT_FOOT" {...bp("LEFT_FOOT")} />
        </group>

        <group position={[-0.18, -0.12, 0]}>
          <BodyPart position={[0, -0.4, 0]} geometry={upperLegGeo} zoneId="RIGHT_LEG" {...bp("RIGHT_LEG")} />
          <BodyPart position={[0, -1.1, 0]} geometry={lowerLegGeo} zoneId="RIGHT_LEG" {...bp("RIGHT_LEG")} />
          <BodyPart position={[0, -1.47, 0.06]} geometry={footGeo} zoneId="RIGHT_FOOT" {...bp("RIGHT_FOOT")} />
        </group>
      </group>
    </BreathingTorso>
  );
}

export interface ZoneOverride {
  zone: string;
  color: string;
  intensity: number;
  symptomIds?: string[];
}

interface RobotViewerProps {
  className?: string;
  zoneOverrides?: ZoneOverride[];
  selectedZone?: string | null;
  onZoneClick?: (zoneId: string) => void;
  onZoneHover?: (zoneId: string | null) => void;
}

export default function RobotViewer({
  className = "",
  zoneOverrides = [],
  selectedZone = null,
  onZoneClick,
  onZoneHover,
}: RobotViewerProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const effectiveSelected = selectedZone ?? internalSelected;

  const handleZoneClick = useCallback(
    (zoneId: string) => {
      setInternalSelected(zoneId);
      onZoneClick?.(zoneId);
    },
    [onZoneClick]
  );

  const handleZoneHover = useCallback(
    (zoneId: string | null) => {
      setHoveredZone(zoneId);
      onZoneHover?.(zoneId);
    },
    [onZoneHover]
  );

  return (
    <div className={`relative ${className}`}>
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ background: "transparent" }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.4, 3.2]} fov={40} />
        <OrbitControls
          enablePan={false}
          minDistance={1.8}
          maxDistance={5}
          minPolarAngle={0.4}
          maxPolarAngle={2.2}
          target={[0, 0.25, 0]}
          enableDamping
          dampingFactor={0.08}
        />
        <ambientLight intensity={0.5} />
        <spotLight
          position={[3, 4, 3]}
          intensity={1.5}
          castShadow
          angle={0.3}
          penumbra={0.5}
          shadow-mapSize={[512, 512]}
        />
        <spotLight position={[-2, 2, -1]} intensity={0.8} />
        <pointLight position={[0, 1.5, 0]} intensity={0.3} />
        <Environment preset="city" environmentIntensity={0.3} />
        <FloorGrid />
        <AmbientParticles />
        <RobotModel
          zoneOverrides={zoneOverrides}
          selectedZone={effectiveSelected}
          onZoneClick={handleZoneClick}
          onZoneHover={handleZoneHover}
          hoveredZone={hoveredZone}
        />
      </Canvas>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted text-center">
        Drag to rotate &bull; Scroll to zoom &bull; Click to select
      </div>
    </div>
  );
}
