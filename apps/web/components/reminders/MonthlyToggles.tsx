"use client";

import { useEffect, useState } from "react";
import { globalReminderStore } from "../../lib/reminders/store";

export function MonthlyToggles() {
  const [mung1, setMung1] = useState(false);
  const [ram, setRam] = useState(false);

  useEffect(() => {
    const sync = () => {
      const all = globalReminderStore.all;
      setMung1(all.some(r => r.type === "MUNG_MOT" && r.enabled));
      setRam(all.some(r => r.type === "RAM" && r.enabled));
    };
    sync();
    return globalReminderStore.subscribe(sync);
  }, []);

  const handleToggleMung1 = () => {
    globalReminderStore.toggleMonthly("MUNG_MOT", !mung1).catch(console.error);
  };

  const handleToggleRam = () => {
    globalReminderStore.toggleMonthly("RAM", !ram).catch(console.error);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-purple-100">
        <div>
          <h3 className="font-semibold text-purple-900">Nhắc Mùng 1</h3>
          <p className="text-sm text-gray-500">Tự động nhắc ngày mùng 1 âm lịch hàng tháng</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={mung1} onChange={handleToggleMung1} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-purple-100">
        <div>
          <h3 className="font-semibold text-purple-900">Nhắc Rằm</h3>
          <p className="text-sm text-gray-500">Tự động nhắc ngày rằm (15) âm lịch hàng tháng</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={ram} onChange={handleToggleRam} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>
    </div>
  );
}
