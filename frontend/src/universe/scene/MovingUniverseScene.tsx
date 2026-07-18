import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";

export type UniverseFocus = "orb" | "oldHome" | "newHome" | "truck" | "provider" | null;

type ProviderNode = {
  id: string;
  name: string;
  status: "calling" | "done" | "waiting";
  x: number;
};

/**
 * Large Earth mostly below the camera — slight curvature only.
 * Oriented toward Central Europe (Munich → Berlin).
 */
const EARTH_R = 28;
const EARTH_CENTER: [number, number, number] = [0, -EARTH_R + 0.02, 0];

function EarthHorizon() {
  const globe = useRef<THREE.Group>(null);
  const map = useTexture(
    "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
  );
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  useFrame((_, delta) => {
    if (globe.current) globe.current.rotation.y += delta * 0.006;
  });

  return (
    <group position={EARTH_CENTER}>
      <group ref={globe} rotation={[0.55, -2.05, 0.12]}>
        <mesh receiveShadow>
          <sphereGeometry args={[EARTH_R, 64, 64]} />
          <meshStandardMaterial
            map={map}
            roughness={0.92}
            metalness={0.02}
            emissive="#0c4a6e"
            emissiveIntensity={0.06}
          />
        </mesh>
      </group>
      <mesh scale={1.002}>
        <sphereGeometry args={[EARTH_R, 48, 48]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/** Classic Google Maps teardrop pin. */
function LocationPin({
  position,
  color,
  onSelect,
}: {
  position: [number, number, number];
  color: string;
  onSelect: () => void;
}) {
  const pinGeo = useMemo(() => {
    // Profile (x = radius, y = height) — iconic Maps drop shape
    const pts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.1, 0.22),
      new THREE.Vector2(0.22, 0.48),
      new THREE.Vector2(0.3, 0.72),
      new THREE.Vector2(0.32, 0.9),
      new THREE.Vector2(0.26, 1.05),
      new THREE.Vector2(0.12, 1.14),
      new THREE.Vector2(0.001, 1.18),
    ];
    return new THREE.LatheGeometry(pts, 48);
  }, []);

  const shadow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (shadow.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 2.2) * 0.06;
      shadow.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Soft ground contact shadow like Maps */}
      <mesh ref={shadow} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>
      <mesh geometry={pinGeo} castShadow position={[0, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.28}
          metalness={0.15}
          roughness={0.35}
        />
      </mesh>
      {/* White center disc on the pin head */}
      <mesh position={[0, 0.92, 0.2]} rotation={[0.15, 0, 0]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0} />
      </mesh>
    </group>
  );
}

function AtlasOrb({
  busy,
  onSelect,
}: {
  busy: boolean;
  onSelect: () => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (core.current) {
      const s = 1 + Math.sin(t * (busy ? 4 : 1.6)) * (busy ? 0.08 : 0.04);
      core.current.scale.setScalar(s);
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.55;
      ring.current.rotation.x = Math.sin(t * 0.35) * 0.25;
    }
  });

  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.35}>
      <group position={[0, 1.55, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <mesh ref={core}>
          <sphereGeometry args={[0.32, 32, 32]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#2563EB"
            emissiveIntensity={busy ? 2 : 1.25}
            roughness={0.2}
            metalness={0.55}
          />
        </mesh>
        <mesh ref={ring}>
          <torusGeometry args={[0.52, 0.025, 16, 64]} />
          <meshStandardMaterial color="#93c5fd" emissive="#3b82f6" emissiveIntensity={1.1} />
        </mesh>
        <pointLight color="#60a5fa" intensity={busy ? 2.6 : 1.6} distance={6} />
      </group>
    </Float>
  );
}

/**
 * Google Maps–style navigation vehicle (top-down).
 * Blue body + lighter cabin — the familiar Maps “you are here” car.
 */
const MAPS_BLUE = "#4285F4";

function TransitCraft({
  progress,
  onSelect,
}: {
  progress: number;
  onSelect: () => void;
}) {
  const t = Math.min(1, Math.max(0, progress / 100));
  const x = THREE.MathUtils.lerp(-2.55, 2.55, t);
  const y = 0.12 + (x * x) / (2 * EARTH_R);
  // Face destination (+X)
  const yaw = 0;

  return (
    <group
      position={[x, y, 0]}
      rotation={[-Math.PI / 2, 0, yaw]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Soft Maps-style halo under the car */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.42, 28]} />
        <meshBasicMaterial color={MAPS_BLUE} transparent opacity={0.22} />
      </mesh>

      {/* Main body (rounded sedan silhouette) */}
      <mesh castShadow position={[0.02, 0, 0.04]}>
        <boxGeometry args={[0.72, 0.38, 0.14]} />
        <meshStandardMaterial
          color={MAPS_BLUE}
          emissive={MAPS_BLUE}
          emissiveIntensity={0.35}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>
      {/* Rounded nose */}
      <mesh position={[0.38, 0, 0.04]}>
        <cylinderGeometry args={[0.19, 0.19, 0.14, 20]} />
        <meshStandardMaterial
          color={MAPS_BLUE}
          emissive={MAPS_BLUE}
          emissiveIntensity={0.35}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>
      {/* Rounded tail */}
      <mesh position={[-0.34, 0, 0.04]}>
        <cylinderGeometry args={[0.17, 0.17, 0.14, 20]} />
        <meshStandardMaterial
          color={MAPS_BLUE}
          emissive={MAPS_BLUE}
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>

      {/* Cabin / glass */}
      <mesh position={[0.06, 0, 0.12]}>
        <boxGeometry args={[0.36, 0.26, 0.1]} />
        <meshStandardMaterial
          color="#E8F0FE"
          emissive="#AECBFA"
          emissiveIntensity={0.45}
          metalness={0.4}
          roughness={0.15}
        />
      </mesh>
      {/* Windshield hint (front) */}
      <mesh position={[0.28, 0, 0.11]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.12, 0.24, 0.02]} />
        <meshStandardMaterial color="#F8FBFF" emissive="#D2E3FC" emissiveIntensity={0.5} />
      </mesh>

      {/* Direction chevron — Google nav arrow vibe on the nose */}
      <mesh position={[0.52, 0, 0.06]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.18, 3]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.15}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function RoutePath() {
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = THREE.MathUtils.lerp(-2.6, 2.6, i / 40);
      const y = 0.06 + (x * x) / (2 * EARTH_R);
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.028, 6, false), [curve]);
  const halo = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.06, 6, false), [curve]);

  return (
    <group>
      <mesh geometry={halo}>
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh geometry={tube}>
        <meshStandardMaterial
          color="#e0f2fe"
          emissive="#38bdf8"
          emissiveIntensity={0.75}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function ProviderBeacons({
  nodes,
  onSelect,
}: {
  nodes: ProviderNode[];
  onSelect: (id: string) => void;
}) {
  return (
    <group position={[0, 1.15, -1.55]}>
      {nodes.map((n) => {
        const color =
          n.status === "done" ? "#22c55e" : n.status === "calling" ? "#f59e0b" : "#64748b";
        return (
          <group
            key={n.id}
            position={[n.x, 0, 0]}
            onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
          >
            <mesh>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={n.status === "calling" ? 1.2 : 0.5}
              />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.16, 0.22, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function InventoryMotes({ count }: { count: number }) {
  const positions = useMemo(() => {
    const n = Math.min(16, Math.max(5, Math.round(count / 8)));
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [
        -2.55 + Math.cos(a) * 0.35,
        0.55 + (i % 3) * 0.12,
        Math.sin(a) * 0.3,
      ] as [number, number, number];
    });
  }, [count]);

  return (
    <group>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#93c5fd" emissive="#3b82f6" emissiveIntensity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({
  progress,
  itemCount,
  busy,
  providers,
  onFocus,
}: {
  progress: number;
  itemCount: number;
  busy: boolean;
  providers: ProviderNode[];
  onFocus: (f: UniverseFocus, meta?: string) => void;
}) {
  void itemCount;
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <fog attach="fog" args={["#030712", 18, 38]} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[4, 7, 3]} intensity={1.05} castShadow color="#f8fafc" />
      <Stars radius={45} depth={28} count={1400} factor={2.2} saturation={0} fade speed={0.35} />

      <Suspense fallback={null}>
        <EarthHorizon />
      </Suspense>

      <RoutePath />
      <LocationPin
        position={[-2.6, 0.02, 0]}
        color="#EA4335"
        onSelect={() => onFocus("oldHome")}
      />
      <LocationPin
        position={[2.6, 0.02, 0]}
        color="#34A853"
        onSelect={() => onFocus("newHome")}
      />
      <InventoryMotes count={itemCount} />
      <TransitCraft progress={progress} onSelect={() => onFocus("truck")} />
      <AtlasOrb busy={busy} onSelect={() => onFocus("orb")} />
      {providers.length > 0 && (
        <ProviderBeacons nodes={providers} onSelect={(id) => onFocus("provider", id)} />
      )}

      <OrbitControls
        enablePan={false}
        minDistance={6.8}
        maxDistance={11}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 3.3}
        target={[0, 0.45, 0]}
      />
    </>
  );
}

export default function MovingUniverseScene({
  progress,
  itemCount,
  busy,
  providers,
  onFocus,
}: {
  progress: number;
  itemCount: number;
  busy: boolean;
  providers: ProviderNode[];
  onFocus: (f: UniverseFocus, meta?: string) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 3.1, 8.5], fov: 38 }}
      dpr={[1, 1.5]}
      className="!absolute inset-0 !h-full !w-full"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <SceneContent
        progress={progress}
        itemCount={itemCount}
        busy={busy}
        providers={providers}
        onFocus={onFocus}
      />
    </Canvas>
  );
}

export type { ProviderNode };
