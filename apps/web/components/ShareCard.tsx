"use client";

import { useEffect, useRef, useState } from "react";
import { drawCard, loadCardFont, type CardData, type CardTheme } from "../lib/card-renderer";

interface ShareCardProps {
  data: CardData;
  theme: CardTheme;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export function ShareCard({ data, theme, onCanvasReady }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await loadCardFont();
      
      if (!mounted || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      await drawCard(canvas, data, theme);
      setIsReady(true);
      onCanvasReady(canvas);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [data, theme, onCanvasReady]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square rounded-xl overflow-hidden shadow-lg border border-purple-100">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-purple-50">
          <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
