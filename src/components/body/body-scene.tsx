"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import type { BiomarkerCategory, ResultStatus } from "@/lib/domain";
import { BODY_REGIONS, type RegionData } from "@/lib/body-map";
import { cn } from "@/lib/utils";

/*
  Procedural mannequin: capsules and spheres only, no external model file.
  Ink-colored figure on the paper background, one status mark per body region.
*/

// Hex equivalents of the design tokens (materials cannot read CSS variables).
const INK = "#26332e";
const PAPER = "#f7f5ec";
const STATUS_HEX: Record<ResultStatus, string> = {
  IN_RANGE: "#3e8a5f",
  BORDERLINE_LOW: "#b17b1e",
  BORDERLINE_HIGH: "#b17b1e",
  LOW: "#a2402a",
  HIGH: "#a2402a",
  NO_RANGE: "#8b948e",
};

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

function Limb({
  from,
  to,
  radius,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
}) {
  // A capsule stretched and rotated to join two points.
  const { position, rotation, length } = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const mid: [number, number, number] = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ];
    // CapsuleGeometry is y-aligned; rotate y axis onto the segment direction.
    const rotZ = -Math.atan2(dx, dy);
    const rotX = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy));
    return { position: mid, rotation: [rotX, 0, rotZ] as [number, number, number], length: len };
  }, [from, to]);

  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={[radius, length, 6, 14]} />
      <meshLambertMaterial color={INK} />
    </mesh>
  );
}

function Mannequin() {
  return (
    <group>
      {/* head + neck */}
      <mesh position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.3, 28, 20]} />
        <meshLambertMaterial color={INK} />
      </mesh>
      <Limb from={[0, 1.3, 0]} to={[0, 1.1, 0]} radius={0.11} />
      {/* torso and pelvis */}
      <Limb from={[0, 1.0, 0]} to={[0, 0.25, 0]} radius={0.4} />
      <Limb from={[0, 0.15, 0]} to={[0, -0.25, 0]} radius={0.34} />
      {/* arms, slight A-pose */}
      <Limb from={[-0.46, 0.92, 0]} to={[-0.66, 0.1, 0.08]} radius={0.11} />
      <Limb from={[0.46, 0.92, 0]} to={[0.66, 0.1, 0.08]} radius={0.11} />
      {/* hands */}
      <mesh position={[-0.68, -0.05, 0.1]}>
        <sphereGeometry args={[0.12, 18, 14]} />
        <meshLambertMaterial color={INK} />
      </mesh>
      <mesh position={[0.68, -0.05, 0.1]}>
        <sphereGeometry args={[0.12, 18, 14]} />
        <meshLambertMaterial color={INK} />
      </mesh>
      {/* legs */}
      <Limb from={[-0.2, -0.4, 0]} to={[-0.24, -1.55, 0]} radius={0.15} />
      <Limb from={[0.2, -0.4, 0]} to={[0.24, -1.55, 0]} radius={0.15} />
      {/* feet */}
      <mesh position={[-0.25, -1.68, 0.08]}>
        <capsuleGeometry args={[0.09, 0.16, 6, 12]} />
        <meshLambertMaterial color={INK} />
      </mesh>
      <mesh position={[0.25, -1.68, 0.08]}>
        <capsuleGeometry args={[0.09, 0.16, 6, 12]} />
        <meshLambertMaterial color={INK} />
      </mesh>
    </group>
  );
}

function RegionMark({
  position,
  side,
  label,
  status,
  count,
  selected,
  onSelect,
}: {
  position: [number, number, number];
  side: "left" | "right";
  label: string;
  status: ResultStatus;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = STATUS_HEX[status];
  return (
    <group position={position}>
      <mesh onClick={onSelect}>
        <sphereGeometry args={[selected ? 0.075 : 0.055, 16, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* thin halo ring to lift the mark off the ink figure */}
      <mesh>
        <ringGeometry args={[0.09, 0.1, 24]} />
        <meshBasicMaterial color={PAPER} />
      </mesh>
      <Html
        position={[side === "left" ? -0.16 : 0.16, 0, 0]}
        style={{ pointerEvents: "auto" }}
        zIndexRange={[10, 0]}
      >
        <button
          onClick={onSelect}
          className={cn(
            "cursor-pointer whitespace-nowrap border bg-paper px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase transition-colors",
            side === "left" ? "-translate-x-full" : "",
            selected
              ? "border-ink text-ink"
              : "border-line-strong text-ink-2 hover:border-ink hover:text-ink",
          )}
        >
          {label}
          <span className="ml-1 tnum" style={{ color }}>
            {count}
          </span>
        </button>
      </Html>
    </group>
  );
}

function TurnTable({
  paused,
  children,
}: {
  paused: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!paused && ref.current) ref.current.rotation.y += delta * 0.2;
  });
  return <group ref={ref}>{children}</group>;
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
  const byCategory = useMemo(
    () => new Map(regions.map((r) => [r.category, r])),
    [regions],
  );

  return (
    <Canvas
      camera={{ position: [0, 0.35, 4.6], fov: 34 }}
      fallback={
        <p className="p-6 text-sm text-ink-2">
          This view needs WebGL, which is unavailable in this browser. The All
          Biomarkers list shows the same data.
        </p>
      }
      onPointerDown={() => setInteracted(true)}
    >
      <color attach="background" args={[PAPER]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />

      <TurnTable paused={reducedMotion || interacted || selected != null}>
        <Mannequin />
        {BODY_REGIONS.map((region) => {
          const data = byCategory.get(region.category);
          if (!data || data.markers.length === 0) return null;
          return (
            <RegionMark
              key={region.category}
              position={region.position}
              side={region.side}
              label={region.label}
              status={data.worst}
              count={data.markers.length}
              selected={selected === region.category}
              onSelect={() => onSelect(region.category)}
            />
          );
        })}
      </TurnTable>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}
