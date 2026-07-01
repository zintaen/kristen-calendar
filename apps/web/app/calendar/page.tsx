"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CalendarGrid } from "../../components/CalendarGrid";
import { DayDetailPanel } from "../../components/DayDetailPanel";
import { getReminders } from "../../lib/storage";
import type { Reminder } from "../../lib/storage";
import { computeReminderDatesForMonth, type DayCellData } from "../../lib/calendarData";
import { buildFestivalDateSet } from "@cyberskill/genie-content";

export default function CalendarPage() {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayCellData | null>(null);

  useEffect(() => {
    getReminders().then(setReminders);
  }, []);

  const festivalDates = useMemo(() => {
    return buildFestivalDateSet(currentYear);
  }, [currentYear]);

  const reminderDates = useMemo(() => {
    return computeReminderDatesForMonth(currentYear, currentMonth, reminders);
  }, [currentYear, currentMonth, reminders]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-4 px-2">
      <CalendarGrid
        year={currentYear}
        month={currentMonth}
        reminders={reminders}
        festivalDates={festivalDates}
        reminderDates={reminderDates}
        onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m); }}
        onDayTap={setSelectedDay}
      />
      
      <DayDetailPanel data={selectedDay} reminders={reminders} onClose={() => setSelectedDay(null)} />
    </div>
  );
}
