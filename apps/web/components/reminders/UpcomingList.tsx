"use client";

import React, { useEffect, useState } from "react";
import { globalReminderStore, UpcomingItem } from "../../lib/reminders/store";

export function UpcomingList() {
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    const sync = () => {
      setUpcoming(globalReminderStore.upcoming(Date.now(), 10));
    };
    sync();
    return globalReminderStore.subscribe(sync);
  }, []);

  if (upcoming.length === 0) {
    return <p className="text-gray-500 italic p-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">Không có sự kiện nào sắp tới.</p>;
  }

  return (
    <div className="space-y-3">
      {upcoming.map((item, idx) => (
        <div key={`${item.reminderId}-${idx}`} className="p-4 bg-white rounded-lg border border-purple-100 flex justify-between items-center shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
          <div>
            <div className="font-medium text-purple-900 text-lg">{item.title}</div>
            <div className="flex gap-2 items-center mt-1">
              <span className="text-sm font-semibold text-gray-700">{item.solarDate}</span>
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">{item.lunarLabel}</span>
              {item.leadDays > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Báo trước {item.leadDays} ngày
                </span>
              )}
            </div>
            {item.fellBack && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded">
                ⚠️ Chuyển sang tháng thường (Năm nay không nhuận)
              </div>
            )}
            {item.pendingUserChoice && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 inline-block px-2 py-1 rounded font-medium">
                ⚠️ Cần bạn chọn tháng cúng (Năm nay có tháng nhuận)
              </div>
            )}
          </div>
          <button 
            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-red-100"
            onClick={() => globalReminderStore.remove(item.reminderId).catch(console.error)}
          >
            Xóa
          </button>
        </div>
      ))}
    </div>
  );
}
