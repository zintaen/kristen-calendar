"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@cyberskill/genie-ui";
import { ShareCard } from "./ShareCard";
import { exportCardBlob, shareCard, type CardData, CARD_THEMES, type CardThemeId } from "../lib/card-renderer";
import { Share2, Download, Check, X } from "lucide-react";

interface ShareCardSheetProps {
  data: CardData;
  trigger?: React.ReactNode;
}

export function ShareCardSheet({ data, trigger }: ShareCardSheetProps) {
  const [themeId, setThemeId] = useState<CardThemeId>("purple-cream");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [open, setOpen] = useState(false);

  const theme = CARD_THEMES[themeId];

  const handleAction = async () => {
    if (!canvas) return;
    
    setStatus("loading");
    try {
      const blob = await exportCardBlob(canvas);
      // Clean filename for the image
      const filename = `genie-am-lich-${data.solarLabel.replace(/\//g, "-")}.png`;
      
      const shareResult = await shareCard(blob, filename);
      if (shareResult !== "failed") {
         setStatus("success");
         setTimeout(() => setStatus("idle"), 2000);
      } else {
         setStatus("idle");
      }
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const isBrowserShare = typeof navigator !== "undefined" && !!navigator.canShare;

  const content = open ? (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="bg-white w-full rounded-t-2xl p-4 md:p-6 pb-8 z-10 shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-purple-900">Chia sẻ ngày đẹp</h2>
          <button onClick={() => setOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <ShareCard
            data={data}
            theme={theme}
            onCanvasReady={useCallback((c: HTMLCanvasElement) => setCanvas(c), [])}
          />
          
          <div className="flex gap-3">
            <Button
              variant={themeId === "purple-cream" ? "primary" : "secondary"}
              onClick={() => setThemeId("purple-cream")}
              className="w-24"
            >
              Sáng
            </Button>
            <Button
              variant={themeId === "purple-dark" ? "primary" : "secondary"}
              onClick={() => setThemeId("purple-dark")}
              className="w-24"
            >
              Tối
            </Button>
          </div>

          <Button 
            className="w-full gap-2" 
            variant="primary"
            onClick={handleAction}
            disabled={!canvas || status === "loading" || status === "success"}
          >
            {status === "success" ? (
              <>
                <Check className="w-5 h-5" />
                Đã lưu
              </>
            ) : isBrowserShare ? (
              <>
                <Share2 className="w-5 h-5" />
                Chia sẻ ngay
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Tải ảnh về máy
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div onClick={() => setOpen(true)} className="flex-1 flex">
        {trigger || (
          <Button variant="secondary" className="w-full gap-2 text-purple-700">
            <Share2 className="w-4 h-4" />
            Chia sẻ ngày
          </Button>
        )}
      </div>
      {typeof document !== "undefined" && createPortal(content, document.body)}
    </>
  );
}
