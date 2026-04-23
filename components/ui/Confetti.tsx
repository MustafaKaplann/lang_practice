"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  dx: number;
  color: string;
  duration: number;
  delay: number;
  rotation: number;
}

const COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    dx: (Math.random() - 0.5) * 200,
    color: COLORS[i % COLORS.length],
    duration: 1.8 + Math.random() * 0.8,
    delay: Math.random() * 0.4,
    rotation: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180),
  }));
}

export default function Confetti({ onDone }: { onDone?: () => void }) {
  const [particles] = useState<Particle[]>(() => makeParticles(35));

  useEffect(() => {
    const max = Math.max(...particles.map((p) => p.duration + p.delay));
    const t = setTimeout(() => onDone?.(), (max + 0.3) * 1000);
    return () => clearTimeout(t);
  }, [particles, onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ left: `${p.x}%`, top: "-12px", backgroundColor: p.color }}
          animate={{
            y: "110vh",
            x: p.dx,
            rotate: p.rotation,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
            opacity: { times: [0, 0.7, 1] },
          }}
        />
      ))}
    </div>
  );
}
