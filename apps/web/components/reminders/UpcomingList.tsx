"use client";

import { useEffect, useState } from "react";
import { globalReminderStore } from "../../lib/reminders/store";
import { nextOccurrences } from "@cyberskill/amlich-core";

export function UpcomingList() {
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    const sync = () => {
      const all = globalReminderStore.all.filter(r => r.enabled);
      
      const now = new Date();
      let occs: any[] = [];
      for (const r of all) {
        const next = nextOccurrences(r, { fromYear: now.getFullYear(), count: 1, engineVersion: "1.0.0" });
        if (next.length > 0) {
          occs.push({ reminder: r, next: next[0] });
        }
      }

      // Sort by soonest
      occs.sort((a, b) => {
        if (a.next.fireAtLocal < b.next.fireAtLocal) return -1;
        if (a.next.fireAtLocal > b.next.fireAtLocal) return 1;
        return 0;
      });

      setUpcoming(occs.slice(0, 10)); // Top 10
    };
    sync();
    return globalReminderStore.subscribe(sync);
  }, []);

  if (upcoming.length === 0) {
    return <p className="text-gray-500 italic">Không có sự kiện nào sắp tới.</p>;
  }

  return (
    <div className="space-y-3">
      {upcoming.map((item, idx) => (
        <div key={idx} className="p-3 bg-white rounded-lg border border-purple-50 flex justify-between items-center shadow-sm">
          <div>
            <div className="font-medium text-purple-900">{item.reminder.title}</div>
            <div className="text-sm text-gray-500">Sắp tới: {item.next.solarDate}</div>
          </div>
          <button 
            className="text-red-500 hover:bg-red-50 p-2 rounded-full"
            onClick={() => globalReminderStore.delete(item.reminder.id).catch(console.error)}
          >
            Xóa
          </button>
        </div>
      ))}
    </div>
  );
}
