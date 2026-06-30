import React from "react";
import type { DayCellData } from "../lib/calendarData";
import { Typography } from "@cyberskill/genie-ui";

interface DayCellProps {
  data: DayCellData | null;
  onTap: (data: DayCellData) => void;
}

export function DayCell({ data, onTap }: DayCellProps) {
  if (!data) return <div className="p-1 aspect-square border border-transparent" />;

  const hasDots = data.hasReminder || data.isFestival;
  
  return (
    <div 
      className={`p-1 aspect-square border-b border-r border-gray-100 flex flex-col items-center justify-start cursor-pointer active:bg-gray-50 relative ${data.isToday ? 'bg-purple-50' : ''}`}
      onClick={() => onTap(data)}
    >
      <div className={`text-sm md:text-base font-semibold ${data.isToday ? 'text-primary' : 'text-gray-900'} ${data.isToday ? 'bg-purple-200 w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
        {data.solarDay}
      </div>
      
      <div className="text-[10px] md:text-xs text-gray-500 mt-1">
        {data.lunarDate.day}/{data.lunarDate.month}
      </div>
      
      {data.tietKhi && (
        <div className="text-[8px] md:text-[10px] text-green-600 font-medium truncate w-full text-center mt-0.5">
          {data.tietKhi}
        </div>
      )}
      
      {hasDots && (
        <div className="absolute bottom-1 flex gap-0.5">
          {data.isFestival && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
          {data.hasReminder && !data.isFestival && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
      )}
    </div>
  );
}
