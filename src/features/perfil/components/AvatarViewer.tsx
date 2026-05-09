import React, { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { User, Loader2 } from "lucide-react";

// ── Bola ──────────────────────────────────────────────────
function SoccerBall({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(128, 128, 40, 0, Math.PI * 2); ctx.fill();
    [[64,64],[192,64],[64,192],[192,192]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    });
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    const time = state.clock.elapsedTime;
    meshRef.current.position.y = 0.1 + Math.sin(time * 2) * 0.008;
    meshRef.current.position.x = 0.35;
    meshRef.current.position.z = 0.1;
    meshRef.current.rotation.y = time * 0.3;
  });

  if (!visible) return null;
  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial map={texture} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

// ── Avatar — SEM ANIMAÇÃO DE POSE ─────────────────────────
function Model({ url, showBall = true }: { url: string; showBall?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene: avatarScene } = useGLTF(url);

  useEffect(() => {
    // Apenas configura materiais e sombras — sem animação
    avatarScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mesh = child as THREE.Mesh;
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).map) {
          (mesh.material as THREE.MeshStandardMaterial).roughness = 0.6;
          (mesh.material as THREE.MeshStandardMaterial).envMapIntensity = 0.8;
        }
      }
    });
  }, [avatarScene]);

  return (
    <group ref={group} dispose={null} position={[0, -0.25, 0]}>
      <primitive object={avatarScene} />
      <SoccerBall visible={showBall} />
    </group>
  );
}

// ── Error Boundary ────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error("Erro 3D:", error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ── Cena principal ────────────────────────────────────────
export default function AvatarViewer({
  url,
  showBall = true,
  className = "",
}: {
  url: string | null;
  showBall?: boolean;
  className?: string;
}) {
  const [isReady, setIsReady] = useState(false);

  if (!url) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-white/5 ${className}`}>
        <User size={48} className="text-white/20" />
      </div>
    );
  }

  // URL é imagem (JPG/PNG) — renderiza como foto estilizada
  const isGlb = url.toLowerCase().includes('.glb');
  if (!isGlb) {
    return (
      <div className={`w-full h-full relative overflow-hidden ${className}`}>
        <img
          src={url}
          alt="avatar"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85), transparent)" }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
      <Canvas
        shadows
        camera={{ position: [0, 1.35, 3.4], fov: 30 }}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 2]}
        onCreated={() => setIsReady(true)}
      >
        <ambientLight intensity={0.7} color="#ffffff" />
        <spotLight position={[2, 4, 3]} angle={0.4} penumbra={0.5} intensity={1.8} castShadow color="#fffbeb" shadow-bias={-0.0001} />
        <spotLight position={[-2, 3, -3]} intensity={2.5} color="#a855f7" angle={0.6} />
        <pointLight position={[-1, 1, 2]} intensity={0.8} color="#e0f2fe" />

        <Suspense fallback={null}>
          <ErrorBoundary fallback={null}>
            <Model url={url} showBall={showBall} />
          </ErrorBoundary>
        </Suspense>

        <ContactShadows resolution={1024} scale={10} blur={2.5} opacity={0.5} far={10} color="#000000" position={[0, -0.25, 0]} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          target={[0, 1.3, 0]}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 2.5}
        />
      </Canvas>

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      )}
    </div>
  );
}