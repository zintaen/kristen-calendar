"use client";

import React, { useState } from "react";
import type { Reminder, LeapFallback, NotificationStyle } from "@cyberskill/amlich-core";
import { NotificationStylePicker } from "./NotificationStylePicker";
import { LEAD_TIME_OPTIONS, DEFAULT_NOTIFY_TIME } from "../../lib/reminders/store"; // We'll move these constants to store.ts

export interface ReminderFormProps {
  initial?: Partial<Reminder>;
  onSubmit: (r: Reminder) => void;
  solarPreview: (lunarDay: number, lunarMonth: number, isLeap: boolean) => string;
  onLeapFallbackChange?: (policy: LeapFallback) => void;
  onCancel?: () => void;
  previewTemplate: (s: NotificationStyle) => string; // For NotificationStylePicker
}

export function ReminderForm({
  initial,
  onSubmit,
  solarPreview,
  onLeapFallbackChange,
  onCancel,
  previewTemplate,
}: ReminderFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [day, setDay] = useState(initial?.lunarDay?.toString() || "1");
  const [month, setMonth] = useState(initial?.lunarMonth?.toString() || "1");
  const [isLeap, setIsLeap] = useState(initial?.isLeapMonth || false);
  const [type, setType] = useState<"CUSTOM" | "GIO">(initial?.type === "GIO" ? "GIO" : "CUSTOM");
  const [leapFallback, setLeapFallback] = useState<LeapFallback>(initial?.leapFallback || "REGULAR");
  
  const [leadTimes, setLeadTimes] = useState<number[]>(initial?.leadTimes ? [...initial.leadTimes] : [0, 1]);
  const [notifyTime, setNotifyTime] = useState(initial?.notifyTime || DEFAULT_NOTIFY_TIME);
  const [notificationStyle, setNotificationStyle] = useState<NotificationStyle>(initial?.notificationStyle || { tone: "neutral", emoji: "" });

  const toggleLeadTime = (val: number) => {
    setLeadTimes(prev => 
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    if (!title) return;
    
    onSubmit({
      id: initial?.id || `usr-${Date.now()}`,
      userId: initial?.userId || "local",
      type: type,
      title: title,
      lunarDay: parseInt(day, 10),
      lunarMonth: parseInt(month, 10),
      lunarYear: null,
      isLeapMonth: isLeap,
      leapFallback: leapFallback,
      recurrence: "ANNUAL",
      leadTimes: leadTimes,
      notifyTime: notifyTime,
      channels: ["LOCAL"],
      enabled: initial?.enabled ?? true,
      notificationStyle: notificationStyle,
      sharedWith: initial?.sharedWith || [],
    });
  };

  const currentSolarPreview = solarPreview(parseInt(day, 10), parseInt(month, 10), isLeap);

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-purple-100 space-y-4">
      <h3 className="font-semibold text-purple-900">{initial?.id ? "Sửa Nhắc nhở" : "Tạo Nhắc nhở mới"}</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Loại sự kiện</label>
        <div className="flex gap-2 mb-3">
          <button 
            onClick={() => setType("CUSTOM")}
            className={`flex-1 py-1.5 px-3 rounded text-sm border ${type === "CUSTOM" ? "bg-purple-100 border-purple-500 text-purple-800" : "bg-gray-50 border-gray-200 text-gray-600"}`}
          >Sự kiện (Custom)</button>
          <button 
            onClick={() => setType("GIO")}
            className={`flex-1 py-1.5 px-3 rounded text-sm border ${type === "GIO" ? "bg-purple-100 border-purple-500 text-purple-800" : "bg-gray-50 border-gray-200 text-gray-600"}`}
          >Đám Giỗ</button>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">Tên sự kiện</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500" 
          placeholder={type === "GIO" ? "Ví dụ: Giỗ ông nội" : "Ví dụ: Sinh nhật mẹ (âm lịch)"}
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

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isLeap" checked={isLeap} onChange={e => setIsLeap(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
        <label htmlFor="isLeap" className="text-sm font-medium text-gray-700">Đây là tháng nhuận</label>
      </div>

      {isLeap && (
        <div className="bg-orange-50 p-3 rounded-md border border-orange-100">
          <label className="block text-xs font-medium text-orange-800 mb-2">Chính sách năm không nhuận (Leap Fallback)</label>
          <select 
            value={leapFallback} 
            onChange={e => {
              const val = e.target.value as LeapFallback;
              setLeapFallback(val);
              onLeapFallbackChange?.(val);
            }} 
            className="w-full border-orange-300 rounded-md shadow-sm p-2 text-sm text-gray-900"
          >
            <option value="REGULAR">Chuyển sang tháng thường (REGULAR)</option>
            <option value="SKIP">Bỏ qua năm đó (SKIP)</option>
            <option value="ASK">Hỏi tôi mỗi năm (ASK)</option>
          </select>
        </div>
      )}

      <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 flex items-center justify-between border border-blue-100">
        <span className="font-medium">Ngày dương năm nay:</span>
        <span>{currentSolarPreview}</span>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Báo trước (Lead time)</label>
        <div className="flex flex-wrap gap-2">
          {LEAD_TIME_OPTIONS.map(opt => (
            <button 
              key={opt.value}
              onClick={() => toggleLeadTime(opt.value)}
              className={`py-1.5 px-3 rounded-full text-xs font-medium border transition-colors ${leadTimes.includes(opt.value) ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Giờ thông báo (Notify time)</label>
        <input 
          type="time" 
          value={notifyTime} 
          onChange={e => setNotifyTime(e.target.value)} 
          className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900" 
        />
      </div>

      <NotificationStylePicker 
        value={notificationStyle} 
        onChange={setNotificationStyle} 
        preview={previewTemplate}
      />
      
      <div className="flex space-x-4 pt-4 border-t mt-4">
        <button onClick={handleSave} className="flex-1 bg-purple-600 text-white font-medium py-2 px-4 rounded-md hover:bg-purple-700 transition" disabled={!title}>
          {initial?.id ? "Cập nhật" : "Tạo mới"}
        </button>
        <button onClick={onCancel} className="flex-1 bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md hover:bg-gray-300 transition">
          Hủy
        </button>
      </div>
    </div>
  );
}
