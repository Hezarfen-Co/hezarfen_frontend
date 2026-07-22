/**
 * Ultra-lightweight zero-dependency confetti particle burst utility.
 * Renders celebratory particle effects on an overlay canvas with auto-cleanup.
 */
export function triggerConfetti(options?: {
  particleCount?: number;
  durationMs?: number;
  colors?: string[];
}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const count = options?.particleCount ?? 60;
  const duration = options?.durationMs ?? 2500;
  const colors = options?.colors ?? [
    "#3b82f6", // blue
    "#ec4899", // pink
    "#8b5cf6", // purple
    "#10b981", // green
    "#f59e0b", // amber
    "#6366f1", // indigo
  ];

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    vRot: number;
    opacity: number;
    shape: "square" | "circle";
  };

  const particles: Particle[] = [];
  const startX = width / 2;
  const startY = height * 0.4;

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 6;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      opacity: 1,
      shape: Math.random() > 0.4 ? "square" : "circle",
    });
  }

  let animationId: number;
  const startTime = performance.now();

  const render = (now: number) => {
    const elapsed = now - startTime;
    if (elapsed >= duration) {
      cancelAnimationFrame(animationId);
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const progress = elapsed / duration;
    const fadeOut = progress > 0.7 ? (1 - progress) / 0.3 : 1;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.vx *= 0.98; // drag
      p.vy *= 0.98;
      p.rotation += p.vRot;

      ctx.save();
      ctx.globalAlpha = p.opacity * fadeOut;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      }

      ctx.restore();
    }

    animationId = requestAnimationFrame(render);
  };

  animationId = requestAnimationFrame(render);
}
