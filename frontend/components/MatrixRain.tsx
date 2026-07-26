"use client";
import { useEffect, useRef } from "react";

/**
 * Cosmetic "matrix rain" overlay for CLASSIFIED mode. Pure decoration — canvas
 * only, pauses when the tab is hidden, and never touches anything real.
 */
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let cols = 0;
    let drops: number[] = [];
    const glyphs = "アイウエオカキクケコサシスセソ0123456789ABCDEF<>/\\{}[]#$%".split("");
    const fontSize = 14;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = Array(cols).fill(1);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;
    const draw = (t: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || t - last < 55) return; // throttle ~18fps
      last = t;

      ctx.fillStyle = "rgba(0, 8, 0, 0.09)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillStyle = Math.random() > 0.975 ? "#c8ffc8" : "#39ff14";
        ctx.fillText(ch, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[44] opacity-[0.10]"
    />
  );
}
