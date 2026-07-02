"use client";

import React from "react";
import { Typography } from "@cyberskill/genie-ui";
import { jdFromDate, convertSolar2Lunar, canChiDay, canChiMonth, canChiYear, zodiacOf, todayInHCM, VN_TZ } from "@cyberskill/amlich-core";
import { UpcomingList } from "../components/reminders/UpcomingList";

export default function HomePage() {
  // VN-locked today (DEC-LUNAR-043): device TZ must not shift the displayed lunar date.
  const [d, m, y] = todayInHCM();
  const weekdayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  
  const [lDay, lMonth, lYear, lLeap] = convertSolar2Lunar(d, m, y, VN_TZ);
  const jdn = jdFromDate(d, m, y);
  
  const solarDateStr = `Thứ ${weekdayIdx === 0 ? "Chủ Nhật" : weekdayIdx + 1}, ${d} tháng ${m} năm ${y}`;
  const lunarDateStr = `Mùng ${lDay} tháng ${lMonth} năm ${canChiYear(lYear).label}${lLeap === 1 ? " (Nhuận)" : ""}`;
  const canChiDayStr = canChiDay(jdn).label;
  
  return (
    <div className="min-h-screen bg-purple-50 p-6 pb-24 flex flex-col items-center">
      <Typography variant="heading-2" as="h1" className="text-primary mt-12 mb-2">
        {solarDateStr}
      </Typography>
      
      <div className="bg-white rounded-3xl p-8 shadow-sm text-center w-full max-w-sm mt-4 border border-purple-100">
        <Typography variant="body-small" className="text-gray-500 uppercase tracking-widest mb-2 font-semibold">
          Âm Lịch
        </Typography>
        <Typography variant="heading-1" className="text-5xl font-bold text-primary mb-2">
          {lDay} / {lMonth}
        </Typography>
        <Typography variant="body" className="text-gray-800 font-medium mb-1">
          {lunarDateStr}
        </Typography>
        <Typography variant="body-small" className="text-gray-500">
          Ngày {canChiDayStr}
        </Typography>
      </div>
      
      {/* Reminders section placeholder */}
      <div className="w-full max-w-sm mt-8">
        <Typography variant="heading-3" className="text-gray-800 mb-4">Sự kiện sắp tới</Typography>
        <UpcomingList />
      </div>
      
      {/* Good Day Picker Link */}
      <div className="w-full max-w-sm mt-6">
        <a 
          href="/good-day-picker" 
          className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md text-center transition-colors"
        >
          ✨ Chọn Ngày Tốt
        </a>
      </div>
    </div>
  );
}
