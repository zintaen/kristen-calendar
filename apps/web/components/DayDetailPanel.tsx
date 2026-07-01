import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DayCellData } from "../lib/calendarData";
import { Typography, Button } from "@cyberskill/genie-ui";
import { ShareCardSheet } from "./ShareCardSheet";
import { getDayQuality } from "@cyberskill/amlich-core";
import type { CardData } from "../lib/card-renderer";

interface DayDetailPanelProps {
  data: DayCellData | null;
  onClose: () => void;
}

export function DayDetailPanel({ data, onClose }: DayDetailPanelProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    if (data) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [data]);

  if (!mounted || !data) return null;

  const date = new Date(data.solarYear, data.solarMonth - 1, data.solarDay);
  const dq = getDayQuality(date);

  const cardData: CardData = {
    lunarLabel: `Mùng ${data.lunarDate.day} tháng ${data.lunarDate.month}`,
    solarLabel: `${String(data.solarDay).padStart(2, '0')}/${String(data.solarMonth).padStart(2, '0')}/${data.solarYear}`,
    canChiLabel: `${dq.canChiNgay} - ${dq.label}`,
    eventType: "custom",
    watermark: "Genie Âm Lịch · CyberSkill",
  };

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white w-full rounded-t-2xl p-4 md:p-6 pb-8 z-10 shadow-xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-200">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
        
        <Typography variant="heading-3" as="h2" className="text-center text-primary mb-1">
          Ngày {data.solarDay} tháng {data.solarMonth} năm {data.solarYear}
        </Typography>
        
        <Typography variant="body" className="text-center text-gray-700 mb-6 font-medium">
          Mùng {data.lunarDate.day} tháng {data.lunarDate.month} năm {data.lunarDate.canChiYear}
          {data.lunarDate.isLeap && " (Nhuận)"}
        </Typography>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-500 mb-1">Can Chi</div>
            <div className="text-sm font-semibold">{data.lunarDate.canChiDay}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-500 mb-1">Tiết Khí</div>
            <div className="text-sm font-semibold">{data.tietKhi || "---"}</div>
          </div>
        </div>
        
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-sm font-semibold text-center mb-2">{dq.label}</div>
          <div className="text-sm text-gray-600 text-center">
            Trực: {dq.truc.name} • Sao: {dq.sao28.name}
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <ShareCardSheet data={cardData} />
          <Button onClick={onClose} variant="primary" className="flex-1">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
