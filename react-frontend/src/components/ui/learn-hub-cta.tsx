"use client";

import { PulseBeams, BeamPath } from "@/components/ui/pulse-beams";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

// NyayAI-themed beam paths — adapted from the Aceternity demo
const beams: BeamPath[] = [
  {
    path: "M269 220.5H16.5C10.9772 220.5 6.5 224.977 6.5 230.5V398.5",
    gradientConfig: {
      initial:  { x1: "0%",   x2: "0%",   y1: "80%",  y2: "100%" },
      animate:  { x1: ["0%",  "0%",  "200%"], x2: ["0%",  "0%",  "180%"], y1: ["80%", "0%",  "0%"],  y2: ["100%", "20%", "20%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0 },
    },
    connectionPoints: [{ cx: 6.5, cy: 398.5, r: 6 }, { cx: 269, cy: 220.5, r: 6 }],
  },
  {
    path: "M568 200H841C846.523 200 851 195.523 851 190V40",
    gradientConfig: {
      initial:  { x1: "0%",   x2: "0%",   y1: "80%",  y2: "100%" },
      animate:  { x1: ["20%", "100%", "100%"], x2: ["0%", "90%", "90%"], y1: ["80%", "80%", "-20%"], y2: ["100%", "100%", "0%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0.4 },
    },
    connectionPoints: [{ cx: 851, cy: 34, r: 6.5 }, { cx: 568, cy: 200, r: 6 }],
  },
  {
    path: "M425.5 274V333C425.5 338.523 421.023 343 415.5 343H152C146.477 343 142 347.477 142 353V426.5",
    gradientConfig: {
      initial:  { x1: "0%",   x2: "0%",   y1: "80%",  y2: "100%" },
      animate:  { x1: ["20%", "100%", "100%"], x2: ["0%", "90%", "90%"], y1: ["80%", "80%", "-20%"], y2: ["100%", "100%", "0%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0.8 },
    },
    connectionPoints: [{ cx: 142, cy: 427, r: 6.5 }, { cx: 425.5, cy: 274, r: 6 }],
  },
  {
    path: "M493 274V333.226C493 338.749 497.477 343.226 503 343.226H760C765.523 343.226 770 347.703 770 353.226V427",
    gradientConfig: {
      initial:  { x1: "40%",  x2: "50%",  y1: "160%", y2: "180%" },
      animate:  { x1: "0%",   x2: "10%",  y1: "-40%", y2: "-20%" },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 1.2 },
    },
    connectionPoints: [{ cx: 770, cy: 427, r: 6.5 }, { cx: 493, cy: 274, r: 6 }],
  },
  {
    path: "M380 168V17C380 11.4772 384.477 7 390 7H414",
    gradientConfig: {
      initial:  { x1: "-40%", x2: "-10%", y1: "0%",   y2: "20%"  },
      animate:  { x1: ["40%", "0%", "0%"], x2: ["10%", "0%", "0%"], y1: ["0%", "0%", "180%"], y2: ["20%", "20%", "200%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 1.6 },
    },
    connectionPoints: [{ cx: 420.5, cy: 6.5, r: 6 }, { cx: 380, cy: 168, r: 6 }],
  },
];

// NyayAI indigo-amber gradient instead of the default cyan-purple
const gradientColors = {
  start: "#818cf8",   // indigo-400
  middle: "#a78bfa",  // violet-400
  end: "#f59e0b",     // amber-400
};

export function LearnHubCTA() {
  return (
    <PulseBeams
      beams={beams}
      gradientColors={gradientColors}
      baseColor="#1e2035"
      accentColor="#3730a3"
      width={858}
      height={434}
      className="min-h-[360px] rounded-2xl bg-[#09090f] border border-white/10"
    >
      <div className="flex flex-col items-center text-center gap-6 px-8 py-14 max-w-xl">
        {/* Label */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 rounded-full">
          <BookOpen className="w-3.5 h-3.5" />
          Free Learning Resource
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
          New to AI Bias?{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-400 bg-clip-text text-transparent">
            Start Here.
          </span>
        </h2>

        {/* Body */}
        <p className="text-white/60 text-base leading-relaxed">
          We&apos;ve built a free learning resource explaining how algorithmic bias works,
          why it matters in India, and how to fix it —{" "}
          <span className="text-white/80">no technical background needed.</span>
        </p>

        {/* CTA */}
        <Link
          href="http://localhost:8002/learn.html"
          className="
            inline-flex items-center gap-2 font-bold text-sm px-7 py-3.5
            bg-amber-400 hover:bg-amber-300 text-black rounded-xl
            transition-all duration-200 hover:-translate-y-0.5
            shadow-lg shadow-amber-500/25 group
          "
        >
          Explore the Learn Hub
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </PulseBeams>
  );
}
