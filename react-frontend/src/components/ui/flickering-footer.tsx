"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import { ClassValue, clsx } from "clsx";
import * as Color from "color-bits";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to convert any CSS color to rgba
export const getRGBA = (
  cssColor: React.CSSProperties["color"],
  fallback: string = "rgba(129, 140, 248)",
): string => {
  if (typeof window === "undefined") return fallback;
  if (!cssColor) return fallback;
  try {
    if (typeof cssColor === "string" && cssColor.startsWith("var(")) {
      const element = document.createElement("div");
      element.style.color = cssColor;
      document.body.appendChild(element);
      const computedColor = window.getComputedStyle(element).color;
      document.body.removeChild(element);
      return Color.formatRGBA(Color.parse(computedColor));
    }
    return Color.formatRGBA(Color.parse(cssColor));
  } catch (e) {
    console.error("Color parsing failed:", e);
    return fallback;
  }
};

export const colorWithOpacity = (color: string, opacity: number): string => {
  if (!color.startsWith("rgb")) return color;
  return Color.formatRGBA(Color.alpha(Color.parse(color), opacity));
};

// NyayAI Scale / Justice Icon
const NyayAILogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-6", className)}
  >
    <path
      d="M12 3L12 21M3 9L12 3L21 9M5 12L3 18H9L7 12H5ZM19 12L17 18H23L21 12H19Z"
      stroke="#818cf8"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number | string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 3,
  gridGap = 3,
  flickerChance = 0.2,
  color = "#818cf8",
  width,
  height,
  className,
  maxOpacity = 0.15,
  text = "",
  fontSize = 140,
  fontWeight = 600,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = useMemo(() => getRGBA(color), [color]);

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ) => {
      ctx.clearRect(0, 0, width, height);
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      if (!maskCtx) return;
      if (text) {
        maskCtx.save();
        maskCtx.scale(dpr, dpr);
        maskCtx.fillStyle = "white";
        maskCtx.font = `${fontWeight} ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
        maskCtx.textAlign = "center";
        maskCtx.textBaseline = "middle";
        maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr));
        maskCtx.restore();
      }
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * (squareSize + gridGap) * dpr;
          const y = j * (squareSize + gridGap) * dpr;
          const squareWidth = squareSize * dpr;
          const squareHeight = squareSize * dpr;
          const maskData = maskCtx.getImageData(x, y, squareWidth, squareHeight).data;
          const hasText = maskData.some((value, index) => index % 4 === 0 && value > 0);
          const opacity = squares[i * rows + j];
          const finalOpacity = hasText ? Math.min(1, opacity * 3 + 0.4) : opacity;
          ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity);
          ctx.fillRect(x, y, squareWidth, squareHeight);
        }
      }
    },
    [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight],
  );

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const cols = Math.ceil(width / (squareSize + gridGap));
      const rows = Math.ceil(height / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }
      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity],
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      updateSquares(gridParams.squares, deltaTime);
      drawGrid(ctx, canvas.width, canvas.height, gridParams.cols, gridParams.rows, gridParams.squares, gridParams.dpr);
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div ref={containerRef} className={cn(`h-full w-full ${className}`)} {...props}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      />
    </div>
  );
};

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);
  useEffect(() => {
    function checkQuery() {
      setValue(window.matchMedia(query).matches);
    }
    checkQuery();
    window.addEventListener("resize", checkQuery);
    const mq = window.matchMedia(query);
    mq.addEventListener("change", checkQuery);
    return () => {
      window.removeEventListener("resize", checkQuery);
      mq.removeEventListener("change", checkQuery);
    };
  }, [query]);
  return value;
}

// ── NyayAI site config ──────────────────────────────────────────────────
export const nyayAIConfig = {
  description:
    "India's first AI-powered bias audit tool. Upload your datasets, uncover bias, and build fairer AI systems — for a more just future.",
  footerLinks: [
    {
      title: "Product",
      links: [
        { id: 1, title: "Upload Dataset", url: "http://localhost:8002/upload.html" },
        { id: 2, title: "Dashboard", url: "http://localhost:8002/dashboard.html" },
        { id: 3, title: "Audit Report", url: "http://localhost:8002/report.html" },
        { id: 4, title: "Learn More", url: "http://localhost:8002/learn.html" },
      ],
    },
    {
      title: "Account",
      links: [
        { id: 5, title: "Sign In", url: "/" },
        { id: 6, title: "Create Account", url: "/signup" },
        { id: 7, title: "Dashboard", url: "http://localhost:8002/dashboard.html" },
        { id: 8, title: "Contact", url: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { id: 9, title: "About NyayAI", url: "http://localhost:8002/index.html#about-us" },
        { id: 10, title: "How It Works", url: "http://localhost:8002/index.html#how-it-works" },
        { id: 11, title: "Features", url: "http://localhost:8002/index.html#features" },
        { id: 12, title: "GitHub", url: "#" },
      ],
    },
  ],
};

// ── NyayAI Footer Component ─────────────────────────────────────────────
export const NyayAIFooter = () => {
  const tablet = useMediaQuery("(max-width: 1024px)");

  return (
    <footer id="footer" className="w-full bg-black border-t border-white/10 pb-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between p-10">
        {/* Brand Column */}
        <div className="flex flex-col items-start justify-start gap-y-4 max-w-xs mx-0 mb-8 md:mb-0">
          <Link href="http://localhost:8002/index.html" className="flex items-center gap-2">
            <NyayAILogo className="size-8" />
            <p className="text-xl font-bold tracking-tight text-white">
              Nyay<span className="text-[#f59e0b]">AI</span>
            </p>
          </Link>
          <p className="text-sm tracking-tight text-gray-400 leading-relaxed">
            {nyayAIConfig.description}
          </p>
          {/* Tagline badge */}
          <span className="text-xs px-3 py-1 rounded-full bg-[#818cf8]/10 border border-[#818cf8]/20 text-[#818cf8] font-medium">
            Justice through Data ⚖️
          </span>
        </div>

        {/* Links Columns */}
        <div className="pt-0 md:w-1/2">
          <div className="flex flex-col items-start justify-start md:flex-row md:items-start md:justify-between gap-y-8 lg:pl-10">
            {nyayAIConfig.footerLinks.map((column, columnIndex) => (
              <ul key={columnIndex} className="flex flex-col gap-y-2">
                <li className="mb-2 text-sm font-semibold text-white">
                  {column.title}
                </li>
                {column.links.map((link) => (
                  <li
                    key={link.id}
                    className="group inline-flex cursor-pointer items-center justify-start gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Link href={link.url}>{link.title}</Link>
                    <div className="flex size-4 items-center justify-center border border-white/20 rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                      <ChevronRightIcon className="h-3 w-3 text-[#818cf8]" />
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      {/* Flickering Grid Banner */}
      <div className="w-full h-48 md:h-64 relative mt-12 z-0">
        {/* Gradient fade at top */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-black z-10 from-40%" />
        {/* Bottom legal strip */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} NyayAI. Built for Code for Her Hackathon 🇮🇳
          </p>
          <p className="text-xs text-gray-600">
            Powered by Gemini AI · Supabase · Flask
          </p>
        </div>
        {/* Flickering text grid */}
        <div className="absolute inset-0 mx-6">
          <FlickeringGrid
            text={tablet ? "NyayAI" : "Justice through Data"}
            fontSize={tablet ? 60 : 85}
            fontWeight={700}
            className="h-full w-full"
            squareSize={2}
            gridGap={tablet ? 2 : 3}
            color="#818cf8"
            maxOpacity={0.25}
            flickerChance={0.08}
          />
        </div>
      </div>
    </footer>
  );
};

export default NyayAIFooter;
