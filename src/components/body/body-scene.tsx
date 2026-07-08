"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { Html, OrbitControls, ContactShadows } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { MathUtils } from "three";
import type { BiomarkerCategory, ResultStatus } from "@/lib/domain";
import { BODY_REGIONS, type RegionData, type OrganShape } from "@/lib/body-map";
import { cn } from "@/lib/utils";

/*
  Front-facing procedural skeleton — an ivory anatomical figure built from bone
  primitives: skull, a vertebral spine, rib arcs with a sternum, a pelvis, and
  long limb bones with knobbed joint ends. Each biomarker group's coloured organ
  glows in its anatomical place (the heart and lungs read inside the ribcage),
  carrying the group's worst status as colour + glow; hovering lifts one,
  selecting pins it. The figure sways gently and grounds on a soft contact
  shadow. Fully procedural — no external model file.
*/

// Hex equivalents of the light-theme design tokens (materials cannot read CSS variables).
const BONE = "#e7dfcc"; // warm ivory bone, pops on the cool clinical ground
const BONE_LIGHT = "#f1ecdc"; // joint caps / sternum, a touch lighter
const SOCKET = "#40505a"; // recessed eye sockets
const SHADOW = "#31424d";
const STATUS_HEX: Record<ResultStatus, string> = {
  IN_RANGE: "#16a34a",
  BORDERLINE_LOW: "#ca8a04",
  BORDERLINE_HIGH: "#ca8a04",
  LOW: "#e11d48",
  HIGH: "#e11d48",
  NO_RANGE: "#64748b",
};
const isOut = (s: ResultStatus) => s === "HIGH" || s === "LOW";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

// Matte bone material. `light` tints joint caps / sternum a shade brighter so
// the epiphyses read as distinct from the shafts.
function BoneMat({ light = false }: { light?: boolean }) {
  return (
    <meshStandardMaterial
      color={light ? BONE_LIGHT : BONE}
      roughness={0.74}
      metalness={0.02}
    />
  );
}

type Vec3 = [number, number, number];

// A long bone: a tapered shaft between two points, capped with a rounded joint
// knob (epiphysis) at each end — the detail that makes a capsule read as bone.
function Bone({
  from,
  to,
  radius,
  knob,
}: {
  from: Vec3;
  to: Vec3;
  radius: number;
  knob?: number;
}) {
  const { position, rotation, length } = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
    const rotZ = -Math.atan2(dx, dy);
    const rotX = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy));
    return { position: mid, rotation: [rotX, 0, rotZ] as Vec3, length: len };
  }, [from, to]);
  const k = knob ?? radius * 1.7;

  return (
    <group>
      <mesh position={position} rotation={rotation} castShadow>
        <capsuleGeometry args={[radius, Math.max(0.02, length - k * 1.1), 6, 14]} />
        <BoneMat />
      </mesh>
      <mesh position={from} castShadow>
        <sphereGeometry args={[k, 16, 12]} />
        <BoneMat light />
      </mesh>
      <mesh position={to} castShadow>
        <sphereGeometry args={[k, 16, 12]} />
        <BoneMat light />
      </mesh>
    </group>
  );
}

function Skull() {
  return (
    <group position={[0, 1.5, 0]}>
      {/* cranium */}
      <mesh scale={[1, 1.14, 1.06]} castShadow>
        <sphereGeometry args={[0.2, 30, 24]} />
        <BoneMat />
      </mesh>
      {/* cheekbones / maxilla */}
      <mesh position={[0, -0.16, 0.04]} scale={[0.82, 0.72, 0.82]} castShadow>
        <sphereGeometry args={[0.16, 24, 18]} />
        <BoneMat />
      </mesh>
      {/* jaw */}
      <mesh position={[0, -0.23, 0.05]} castShadow>
        <boxGeometry args={[0.17, 0.07, 0.15]} />
        <BoneMat light />
      </mesh>
      {/* eye sockets */}
      <mesh position={[-0.08, -0.02, 0.16]}>
        <sphereGeometry args={[0.052, 16, 12]} />
        <meshStandardMaterial color={SOCKET} roughness={0.9} />
      </mesh>
      <mesh position={[0.08, -0.02, 0.16]}>
        <sphereGeometry args={[0.052, 16, 12]} />
        <meshStandardMaterial color={SOCKET} roughness={0.9} />
      </mesh>
      {/* nasal cavity */}
      <mesh position={[0, -0.11, 0.18]}>
        <coneGeometry args={[0.028, 0.07, 4]} />
        <meshStandardMaterial color={SOCKET} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Pelvis() {
  return (
    <group position={[0, -0.16, 0]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[0.16 * s, 0.04, 0.02]}
          rotation={[0.22, 0, -0.5 * s]}
          scale={[0.68, 1, 0.42]}
          castShadow
        >
          <sphereGeometry args={[0.18, 22, 16]} />
          <BoneMat />
        </mesh>
      ))}
      {/* pubic bar */}
      <mesh position={[0, -0.15, 0.08]} castShadow>
        <boxGeometry args={[0.22, 0.05, 0.05]} />
        <BoneMat light />
      </mesh>
    </group>
  );
}

function Hand({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      {/* metacarpals / palm */}
      <mesh scale={[1, 1.3, 0.5]} castShadow>
        <sphereGeometry args={[0.055, 16, 12]} />
        <BoneMat />
      </mesh>
      {/* fingers */}
      {[-1.5, -0.5, 0.5, 1.5].map((i) => (
        <mesh
          key={i}
          position={[i * 0.022, -0.1, 0.01]}
          rotation={[0, 0, i * 0.12]}
        >
          <capsuleGeometry args={[0.011, 0.08, 4, 8]} />
          <BoneMat light />
        </mesh>
      ))}
    </group>
  );
}

function Body({ breathRef }: { breathRef: React.RefObject<Group | null> }) {
  // Stacked vertebrae from the base of the skull to the sacrum.
  const spine = useMemo(() => {
    const rows: { y: number; r: number }[] = [];
    const n = 16;
    const yTop = 1.28;
    const yBot = -0.1;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      rows.push({ y: yTop + (yBot - yTop) * t, r: 0.036 + 0.02 * t });
    }
    return rows;
  }, []);

  // Rib arcs: horseshoe half-tori that wrap from the spine around the front.
  const ribs = useMemo(
    () => [
      { y: 0.9, r: 0.24, tilt: 0.05 },
      { y: 0.81, r: 0.29, tilt: 0.08 },
      { y: 0.71, r: 0.32, tilt: 0.11 },
      { y: 0.61, r: 0.33, tilt: 0.14 },
      { y: 0.52, r: 0.31, tilt: 0.17 },
      { y: 0.44, r: 0.27, tilt: 0.2 },
    ],
    [],
  );
  const backZ = -0.16;
  const gamma = 0.28; // how far each rib wraps past the sides toward the spine

  return (
    <group>
      <Skull />

      {/* spine */}
      {spine.map((v, i) => (
        <group key={i} position={[0, v.y, backZ]}>
          <mesh castShadow={i % 2 === 0}>
            <cylinderGeometry args={[v.r, v.r, 0.05, 12]} />
            <BoneMat />
          </mesh>
          <mesh position={[0, 0, -0.045]}>
            <boxGeometry args={[0.03, 0.05, 0.05]} />
            <BoneMat light />
          </mesh>
        </group>
      ))}

      {/* clavicles */}
      <Bone from={[0, 1.05, 0.12]} to={[-0.4, 0.98, 0.08]} radius={0.02} knob={0.03} />
      <Bone from={[0, 1.05, 0.12]} to={[0.4, 0.98, 0.08]} radius={0.02} knob={0.03} />

      {/* ribcage + sternum (breathing group) */}
      <group ref={breathRef}>
        {ribs.map((rb, i) => (
          <mesh
            key={i}
            position={[0, rb.y, rb.r + backZ]}
            rotation={[Math.PI / 2 + rb.tilt, 0, -gamma]}
            castShadow
          >
            <torusGeometry args={[rb.r, 0.016, 8, 30, Math.PI + 2 * gamma]} />
            <BoneMat />
          </mesh>
        ))}
        <mesh position={[0, 0.66, 0.45]} castShadow>
          <boxGeometry args={[0.055, 0.42, 0.03]} />
          <BoneMat light />
        </mesh>
      </group>

      <Pelvis />

      {/* arms: humerus + forearm (radius & ulna) + hand */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bone from={[0.4 * s, 0.97, 0.06]} to={[0.54 * s, 0.5, 0.04]} radius={0.03} />
          <Bone from={[0.54 * s, 0.5, 0.02]} to={[0.6 * s, 0.06, 0.07]} radius={0.02} />
          <Bone from={[0.545 * s, 0.5, 0.07]} to={[0.565 * s, 0.06, 0.11]} radius={0.017} knob={0.024} />
          <Hand position={[0.6 * s, -0.02, 0.09]} />
        </group>
      ))}

      {/* legs: femur + tibia & fibula + foot */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bone from={[0.17 * s, -0.2, 0.03]} to={[0.2 * s, -0.9, 0.04]} radius={0.045} />
          <Bone from={[0.2 * s, -0.9, 0.04]} to={[0.21 * s, -1.5, 0.05]} radius={0.036} />
          <Bone from={[0.235 * s, -0.9, 0.03]} to={[0.245 * s, -1.48, 0.04]} radius={0.02} knob={0.028} />
          <mesh position={[0.21 * s, -1.55, 0.02]} castShadow>
            <sphereGeometry args={[0.055, 16, 12]} />
            <BoneMat light />
          </mesh>
          <mesh position={[0.21 * s, -1.58, 0.12]} castShadow>
            <boxGeometry args={[0.1, 0.05, 0.28]} />
            <BoneMat />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---- organ silhouettes; each returns meshes coloured via the shared material ---- */
function OrganGeometry({ shape, matProps }: { shape: OrganShape; matProps: ThreeElements["meshStandardMaterial"] }) {
  const mat = <meshStandardMaterial {...matProps} />;
  switch (shape) {
    case "thyroid":
      return (
        <group>
          <mesh position={[-0.07, 0, 0]} scale={[0.6, 1, 0.5]}>
            <sphereGeometry args={[0.075, 20, 16]} />
            {mat}
          </mesh>
          <mesh position={[0.07, 0, 0]} scale={[0.6, 1, 0.5]}>
            <sphereGeometry args={[0.075, 20, 16]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      );
    case "heart":
      return (
        <group rotation={[0, 0, 0.3]}>
          <mesh scale={[1, 1.05, 0.9]}>
            <sphereGeometry args={[0.12, 24, 18]} />
            {mat}
          </mesh>
          <mesh position={[0, -0.11, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.14, 20]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      );
    case "liver":
      return (
        <mesh rotation={[0, 0, -0.35]} scale={[1.7, 0.85, 1]}>
          <sphereGeometry args={[0.13, 24, 18]} />
          {mat}
        </mesh>
      );
    case "pancreas":
      return (
        <mesh rotation={[0, 0, 0.5]} scale={[2.1, 0.5, 0.5]}>
          <capsuleGeometry args={[0.06, 0.14, 8, 16]} />
          {mat}
        </mesh>
      );
    case "kidneys":
      return (
        <group>
          <mesh position={[-0.11, 0, 0]} scale={[0.7, 1.1, 0.7]} rotation={[0, 0, 0.1]}>
            <sphereGeometry args={[0.085, 20, 16]} />
            {mat}
          </mesh>
          <mesh position={[0.11, 0, 0]} scale={[0.7, 1.1, 0.7]} rotation={[0, 0, -0.1]}>
            <sphereGeometry args={[0.085, 20, 16]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      );
    case "droplet":
      return (
        <group>
          <mesh position={[0, -0.03, 0]}>
            <sphereGeometry args={[0.08, 22, 16]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.06, 0.12, 18]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      );
    case "glow":
      return (
        <mesh>
          <icosahedronGeometry args={[0.1, 1]} />
          {mat}
        </mesh>
      );
    case "node":
    default:
      return (
        <mesh>
          <sphereGeometry args={[0.09, 24, 18]} />
          {mat}
        </mesh>
      );
  }
}

function Organ({
  position,
  shape,
  side,
  label,
  status,
  count,
  selected,
  paused,
  onSelect,
  onHover,
}: {
  position: [number, number, number];
  shape: OrganShape;
  side: "left" | "right";
  label: string;
  status: ResultStatus;
  count: number;
  selected: boolean;
  paused: boolean;
  onSelect: () => void;
  onHover: (v: boolean) => void;
}) {
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = STATUS_HEX[status];
  const out = isOut(status);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const target = selected ? 1.32 : hovered ? 1.22 : 1;
    if (groupRef.current) {
      const s = MathUtils.lerp(groupRef.current.scale.x, target, 0.15);
      groupRef.current.scale.setScalar(s);
    }
    if (glowRef.current) {
      // attention pulse for out-of-range groups; steady soft glow otherwise
      // (kept faint — on the light surface a strong halo reads as a smudge)
      const base = selected ? 0.26 : hovered ? 0.2 : 0.12;
      const pulse = out && !paused ? 0.08 * (0.5 + 0.5 * Math.sin(t * 3.2)) : 0;
      const m = glowRef.current.material as { opacity: number };
      m.opacity = base + pulse;
    }
  });

  const emissiveIntensity = selected ? 0.4 : hovered ? 0.32 : out ? 0.26 : 0.18;
  // Keep the figure legible: a label is always shown for problem groups and for
  // the organ under the pointer or currently pinned; the rest reveal on hover.
  const showLabel = out || hovered || selected;

  return (
    <group position={position}>
      <group
        ref={groupRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <OrganGeometry
          shape={shape}
          matProps={{
            color,
            emissive: color,
            emissiveIntensity,
            roughness: 0.3,
            metalness: 0.1,
          }}
        />
        {/* soft aura */}
        <mesh ref={glowRef} scale={1.5}>
          <sphereGeometry args={[0.11, 20, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.24} depthWrite={false} />
        </mesh>
      </group>

      {showLabel && (
        <Html
          position={[side === "left" ? -0.13 : 0.13, 0.02, 0]}
          style={{ pointerEvents: "auto" }}
          zIndexRange={[20, 0]}
        >
          <button
            onClick={onSelect}
            onPointerOver={() => onHover(true)}
            onPointerOut={() => onHover(false)}
            className={cn(
              "flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-sm border bg-paper/95 px-1.5 py-0.5 text-[0.55rem] font-semibold tracking-wide uppercase shadow-sm backdrop-blur-sm transition-colors sm:text-[0.65rem]",
              side === "left" ? "-translate-x-full flex-row-reverse" : "",
              selected
                ? "border-ink text-ink"
                : "border-line-strong text-ink-2 hover:border-ink hover:text-ink",
            )}
          >
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {label}
            <span className="tnum" style={{ color }}>
              {count}
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}

function Figure({
  regions,
  selected,
  onSelect,
  onHover,
  paused,
}: {
  regions: RegionData[];
  selected: BiomarkerCategory | null;
  onSelect: (c: BiomarkerCategory) => void;
  onHover: (v: boolean) => void;
  paused: boolean;
}) {
  const swayRef = useRef<Group>(null);
  const breathRef = useRef<Group>(null);
  const byCategory = useMemo(
    () => new Map(regions.map((r) => [r.category, r])),
    [regions],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (swayRef.current && !paused) {
      swayRef.current.rotation.y = Math.sin(t * 0.35) * 0.12;
      swayRef.current.position.y = Math.sin(t * 0.6) * 0.015;
    }
    if (breathRef.current && !paused) {
      const b = 1 + Math.sin(t * 1.1) * 0.012;
      breathRef.current.scale.set(b, b, b);
    }
  });

  return (
    <group ref={swayRef}>
      <Body breathRef={breathRef} />
      {BODY_REGIONS.map((region) => {
        const data = byCategory.get(region.category);
        if (!data || data.markers.length === 0) return null;
        return (
          <Organ
            key={region.category}
            position={region.position}
            shape={region.shape}
            side={region.side}
            label={region.label}
            status={data.worst}
            count={data.markers.length}
            selected={selected === region.category}
            paused={paused}
            onSelect={() => onSelect(region.category)}
            onHover={onHover}
          />
        );
      })}
    </group>
  );
}

export default function BodyScene({
  regions,
  selected,
  onSelect,
}: {
  regions: RegionData[];
  selected: BiomarkerCategory | null;
  onSelect: (c: BiomarkerCategory) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [interacted, setInteracted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const paused = reducedMotion || interacted || hovering || selected != null;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 0, 7.6], fov: 30 }}
      fallback={
        <p className="p-6 text-sm text-ink-2">
          This view needs WebGL, which is unavailable in this browser. The
          Biomarkers list shows the same data.
        </p>
      }
      onPointerDown={() => setInteracted(true)}
    >
      <hemisphereLight args={["#ffffff", "#d8e2e7", 0.85]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.1} color="#fff4e2" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 1.5, 2]} intensity={0.35} color="#bcd6e8" />
      <directionalLight position={[0, 2, -4]} intensity={0.4} color="#8fc4e8" />

      <Figure
        regions={regions}
        selected={selected}
        onSelect={onSelect}
        onHover={setHovering}
        paused={paused}
      />

      <ContactShadows
        position={[0, -1.78, 0]}
        opacity={0.3}
        blur={2.8}
        scale={6}
        far={3}
        color={SHADOW}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        target={[0, -0.05, 0]}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
