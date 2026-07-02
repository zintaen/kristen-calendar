"use client";

import { useEffect, useState } from "react";
import { getSettings, saveSettings, type UserSettings } from "../../lib/storage";
import { entitlementClient, EntitlementResponse } from "../../lib/entitlement-client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    entitlementClient.get().then(setEntitlement).catch(console.error);
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
      
      {entitlement && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100 space-y-3">
          <h2 className="font-semibold text-gray-800">Tài Khoản & Gói Cước</h2>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Gói hiện tại:</span>
            <span className="font-medium text-purple-700 uppercase">{entitlement.tier}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Hạn sử dụng:</span>
            <span className="font-medium text-gray-900">
              {entitlement.validUntil 
                ? new Date(entitlement.validUntil).toLocaleDateString('vi-VN') 
                : (entitlement.tier === 'free' ? 'Vô hạn' : 'Vĩnh viễn')}
            </span>
          </div>
          {entitlement.tier === 'free' && (
            <button 
              onClick={() => router.push('/store')} // Thay bằng router hoặc trigger popup
              className="w-full mt-2 bg-purple-100 text-purple-700 py-2 rounded font-medium hover:bg-purple-200 transition"
            >
              Nâng cấp Premium
            </button>
          )}
        </div>
      )}

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
