"use client";

import React from "react";
import type { NotificationStyle } from "@cyberskill/amlich-core";
import { renderBody } from "../../lib/reminders/tone";

export interface NotificationStylePickerProps {
  value: NotificationStyle;
  onChange: (s: NotificationStyle) => void;
  preview: (s: NotificationStyle) => string;
}

export function NotificationStylePicker({
  value,
  onChange,
  preview,
}: NotificationStylePickerProps) {
  const currentTone = value?.tone || "neutral";
  const currentEmoji = value?.emoji || "";

  const previewBody = preview(value);

  return (
    <div className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-purple-100 shadow-sm mt-4">
      <h3 className="font-semibold text-purple-900 text-sm">Phong cách thông báo</h3>
      
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-700">Tông giọng (Tone)</label>
        <div className="flex gap-2">
          {(["warm", "neutral", "formal"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, tone: t })}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                currentTone === t
                  ? "bg-purple-100 border-purple-500 text-purple-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t === "warm" ? "Gần gũi" : t === "formal" ? "Trang trọng" : "Tiêu chuẩn"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <label className="text-xs font-medium text-gray-700">Emoji / Icon</label>
        <div className="flex gap-2">
          {["", "🎊", "🙏", "❤️", "🔔"].map((e, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChange({ ...value, emoji: e })}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border transition-colors ${
                currentEmoji === e
                  ? "bg-purple-100 border-purple-500"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {e === "" ? "❌" : e}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm text-purple-900 border border-purple-100">
        <div className="font-semibold text-xs text-purple-700 mb-1">Xem trước thông báo:</div>
        <div className="flex items-start gap-2">
          {currentEmoji && <span className="text-base">{currentEmoji}</span>}
          <span>{previewBody}</span>
        </div>
      </div>
    </div>
  );
}
