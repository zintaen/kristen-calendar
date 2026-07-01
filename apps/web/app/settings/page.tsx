"use client";

import { useEffect, useState } from "react";
import { getSettings, saveSettings, type UserSettings } from "../../lib/storage";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  if (!settings) return null;

  const update = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated).catch(console.error);
  };

  return (
    <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-screen space-y-6">
      <h1 className="text-2xl font-bold text-purple-900 pt-6">Cài Đặt</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Giờ thông báo mặc định</label>
          <input 
            type="time" 
            value={settings.notifyTime}
            onChange={(e) => update({ notifyTime: e.target.value })}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900" 
          />
          <p className="text-xs text-gray-500 mt-1">Giờ máy tính/điện thoại sẽ tự động nhắc nhở (nếu áp dụng).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Giọng văn (Tone)</label>
          <select 
            value={settings.theme} // Reuse theme or add tone to settings
            onChange={(e) => update({ theme: e.target.value as any })}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
          >
            <option value="warm">Gần gũi (Warm)</option>
            <option value="neutral">Tiêu chuẩn (Neutral)</option>
            <option value="formal">Trang trọng (Formal)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
