import React, { useMemo } from "react";
import { buildMonthGrid } from "../lib/calendarData";
import { DayCell } from "./DayCell";
import type { Reminder } from "../lib/storage";
import type { DayCellData } from "../lib/calendarData";
import { Typography } from "@cyberskill/genie-ui";

interface CalendarGridProps {
  year: number;
  month: number;
  reminders: Reminder[];
  festivalDates: Set<string>;
  reminderDates: Set<string>;
  onMonthChange: (year: number, month: number) => void;
  onDayTap: (data: DayCellData) => void;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function CalendarGrid({ 
  year, 
  month, 
  festivalDates, 
  reminderDates, 
  onMonthChange,
  onDayTap 
}: CalendarGridProps) {
  
  const today = useMemo(() => new Date(), []);
  
  const gridData = useMemo(() => {
    return buildMonthGrid(year, month, reminderDates, festivalDates, today);
  }, [year, month, reminderDates, festivalDates, today]);

  const handlePrev = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };
  
  const handleNext = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const [touchStart, setTouchStart] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // Swipe left (next month)
    if (diff > 50) handleNext();
    // Swipe right (prev month)
    if (diff < -50) handlePrev();
    
    setTouchStart(null);
  };

  return (
    <div 
      className="w-full max-w-md mx-auto bg-white shadow-sm rounded-xl overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between p-4 bg-primary text-white">
        <button onClick={handlePrev} className="p-2 -ml-2 text-white/80 hover:text-white">&lt;</button>
        <div className="text-center">
          <Typography variant="heading-3" as="h1" className="font-bold text-white mb-0.5">
            Tháng {month}/{year}
          </Typography>
          <div className="text-xs text-white/80">{gridData.lunarMonthLabel}</div>
        </div>
        <button onClick={handleNext} className="p-2 -mr-2 text-white/80 hover:text-white">&gt;</button>
      </div>
      
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 border-l border-t border-gray-100">
        {gridData.cells.map((cell, i) => (
          <DayCell key={`${year}-${month}-${i}`} data={cell} onTap={onDayTap} />
        ))}
      </div>
    </div>
  );
}
