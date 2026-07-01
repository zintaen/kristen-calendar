"use client";

import { useEffect, useState } from "react";
import { MonthlyToggles } from "../../components/reminders/MonthlyToggles";
import { UpcomingList } from "../../components/reminders/UpcomingList";
import { ReminderForm } from "../../components/reminders/ReminderForm";
import { globalReminderStore, solarPreviewFromLunar } from "../../lib/reminders/store";
import { renderBody } from "../../lib/reminders/tone";

export default function RemindersPage() {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    globalReminderStore.load().catch(console.error);
  }, []);

  return (
    <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-screen space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-purple-900 pt-6">Nhắc Nhở</h1>
      
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Tự động (Âm lịch)</h2>
        <MonthlyToggles />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Sự kiện sắp tới</h2>
          <button 
            onClick={() => setShowForm(true)}
            className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium hover:bg-purple-200 transition-colors"
          >
            + Thêm
          </button>
        </div>
        
        {showForm && (
          <div className="mb-4">
            <ReminderForm 
              onSubmit={async (r) => {
                await globalReminderStore.upsert(r);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
              solarPreview={solarPreviewFromLunar}
              previewTemplate={(style) => renderBody(style, {
                title: "Sự kiện",
                solarLabel: "01/01",
                lunarLabel: "01/01 ÂL",
                leadDays: 1
              })}
            />
          </div>
        )}

        <UpcomingList />
      </section>
    </div>
  );
}
