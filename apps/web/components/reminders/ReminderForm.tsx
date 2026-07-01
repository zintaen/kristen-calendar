"use client";

import { useState } from "react";
import { globalReminderStore } from "../../lib/reminders/store";

export function ReminderForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("1");
  const [month, setMonth] = useState("1");
  const [isLeap, setIsLeap] = useState(false);
  const [type, setType] = useState<"CUSTOM" | "GIO">("CUSTOM");
  
  const handleSave = async () => {
    if (!title) return;
    
    await globalReminderStore.add({
      id: `usr-${Date.now()}`,
      type: type,
      title: title,
      lunarDay: parseInt(day, 10),
      lunarMonth: parseInt(month, 10),
      lunarYear: null,
      isLeapMonth: isLeap,
      leapFallback: "REGULAR",
      recurrence: "ANNUAL",
      leadTimes: [0, 1], // default 1 day advance + day-of
      notifyTime: "07:00",
      channels: ["LOCAL"],
      enabled: true,
      userId: "local-user"
    });
    
    onDone();
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-purple-100 space-y-4">
      <h3 className="font-semibold text-purple-900">Tạo Nhắc nhở mới</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tên sự kiện</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500" 
          placeholder="Ví dụ: Sinh nhật bố"
        />
      </div>

      <div className="flex space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ngày (Âm)</label>
          <input type="number" min="1" max="30" value={day} onChange={e => setDay(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tháng (Âm)</label>
          <input type="number" min="1" max="12" value={month} onChange={e => setMonth(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900" />
        </div>
      </div>
      
      <div className="flex space-x-4 pt-2">
        <button onClick={handleSave} className="flex-1 bg-purple-600 text-white font-medium py-2 px-4 rounded-md hover:bg-purple-700 transition">
          Lưu
        </button>
        <button onClick={onDone} className="flex-1 bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md hover:bg-gray-300 transition">
          Hủy
        </button>
      </div>
    </div>
  );
}
