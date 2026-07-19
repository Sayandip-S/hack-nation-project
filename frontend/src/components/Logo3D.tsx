import { useRef, useState, type PointerEvent } from "react";

type Logo3DProps = {
  size?: "sm" | "lg";
  interactive?: boolean;
};

export default function Logo3D({ size = "lg", interactive = true }: Logo3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: -18, y: 28 });
  const [spinning, setSpinning] = useState(false);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || spinning) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -18 - py * 22, y: 28 + px * 28 });
  };

  const onLeave = () => {
    if (!interactive || spinning) return;
    setTilt({ x: -18, y: 28 });
  };

  const onClick = () => {
    if (!interactive) return;
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 900);
  };

  const dim = size === "lg" ? "w-44 h-44 md:w-56 md:h-56" : "w-11 h-11";

  return (
    <div
      ref={wrapRef}
      className={`logo3d-scene ${dim} ${interactive ? "cursor-grab active:cursor-grabbing" : ""}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "Keyline logo — drag to tilt, click to spin" : "Keyline logo"}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <div
        className={`logo3d-rig ${spinning ? "logo3d-spin" : "logo3d-float"}`}
        style={spinning ? undefined : { transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Building mass */}
        <div className="logo3d-face logo3d-front">
          <span className="logo3d-window logo3d-w1" />
          <span className="logo3d-window logo3d-w2" />
          <span className="logo3d-window logo3d-w3" />
          <span className="logo3d-door" />
        </div>
        <div className="logo3d-face logo3d-right">
          <span className="logo3d-window logo3d-w4" />
          <span className="logo3d-window logo3d-w5" />
        </div>
        <div className="logo3d-face logo3d-left" />
        <div className="logo3d-face logo3d-top" />
        <div className="logo3d-face logo3d-bottom" />

        {/* Floating key mark */}
        <div className="logo3d-key">
          <span className="logo3d-key-head" />
          <span className="logo3d-key-shaft" />
          <span className="logo3d-key-tooth" />
        </div>
      </div>
      <div className="logo3d-shadow" aria-hidden />
    </div>
  );
}
