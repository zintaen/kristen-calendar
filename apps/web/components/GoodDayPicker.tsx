"use client";

import React, { useState, useEffect, useMemo } from "react";
import { computeGoodDays, WORK_TYPE_OPTIONS, type WorkType } from "../lib/good-day";
import { getCalendarEvents, requestCalendarPermission } from "./EventKitBridge";
import { GoodDayList } from "./GoodDayList";
import { entitlementClient, EntitlementResponse } from "../lib/entitlement-client";
import { UpgradePrompt } from "./UpgradePrompt";

interface GoodDayPickerProps {
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

export function GoodDayPicker({ defaultStartDate, defaultEndDate }: GoodDayPickerProps) {
  const [startDateStr, setStartDateStr] = useState<string>(
    (defaultStartDate || new Date()).toISOString().split("T")[0]
  );
  
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    const defaultEnd = defaultEndDate || new Date();
    if (!defaultEndDate) {
      defaultEnd.setDate(defaultEnd.getDate() + 30);
    }
    return defaultEnd.toISOString().split("T")[0];
  });

  const [workType, setWorkType] = useState<WorkType>("ky-hop-dong");
  const [calendarConnected, setCalendarConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [showUpgrade, setShowUpgrade] = useState<boolean>(false);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);

  useEffect(() => {
    entitlementClient.get().then(ent => {
      setEntitlement(ent);
      if (ent.features.goodDayPicker) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
        setShowUpgrade(true);
      }
    });
  }, []);

  // Compute base results synchronously so it updates immediately on input change
  const computedState = useMemo(() => {
    const start = new Date(startDateStr + "T00:00:00Z");
    const end = new Date(endDateStr + "T00:00:00Z");
    // Handle invalid dates fallback
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return null;
    }
    return computeGoodDays(start, end, workType);
  }, [startDateStr, endDateStr, workType]);

  // Enrich results with Calendar data if connected
  const enrichedResults = useMemo(() => {
    if (!computedState) return [];
    if (!calendarConnected || events.length === 0) return computedState.results;

    return computedState.results.map(r => {
      // Very basic conflict check: Any event that overlaps with the whole day (simplified)
      const dayStr = r.date; // YYYY-MM-DD
      const hasConflict = events.some(e => {
        // Just checking if event falls on the same date string for simplicity
        const eventDayStr = e.startDate.toISOString().split("T")[0];
        return eventDayStr === dayStr;
      });
      return { ...r, hasCalendarConflict: hasConflict };
    });
  }, [computedState, calendarConnected, events]);

  const handleConnectCalendar = async () => {
    const status = await requestCalendarPermission();
    if (status === "granted") {
      setCalendarConnected(true);
      if (computedState) {
        const evs = await getCalendarEvents(computedState.startDate, computedState.endDate);
        setEvents(evs);
      }
    } else {
      alert("Không thể kết nối lịch (từ chối hoặc không hỗ trợ).");
    }
  };

  // When date range changes, refetch events if connected
  useEffect(() => {
    if (calendarConnected && computedState) {
      getCalendarEvents(computedState.startDate, computedState.endDate).then(evs => setEvents(evs));
    }
  }, [computedState?.startDate, computedState?.endDate, calendarConnected]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 bg-gray-50 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Tìm Ngày Tốt</h2>
      
      <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input 
              type="date" 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input 
              type="date" 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow"
              value={endDateStr}
              onChange={e => setEndDateStr(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
          <select 
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow bg-white"
            value={workType}
            onChange={e => setWorkType(e.target.value as WorkType)}
          >
            {WORK_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {!calendarConnected && (
          <button 
            onClick={handleConnectCalendar}
            className="w-full mt-2 flex justify-center items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
          >
            🗓️ Kết nối lịch để tránh ngày bận
          </button>
        )}
      </div>

      {computedState && computedState.isClamped && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 flex items-start gap-2">
          <span>ℹ️</span> Đã giới hạn khoảng thời gian xuống tối đa 90 ngày để đảm bảo tốc độ và trải nghiệm tốt nhất.
        </div>
      )}

      {computedState ? (
        <GoodDayList 
          results={enrichedResults} 
          totalGoodDays={computedState.totalGoodDays} 
        />
      ) : (
        <div className="mt-4 p-4 text-center text-red-500 bg-red-50 rounded-lg">
          Vui lòng chọn khoảng ngày hợp lệ (Từ ngày phải nhỏ hơn hoặc bằng Đến ngày).
        </div>
      )}

      {showUpgrade && entitlement && !hasAccess && (
        <UpgradePrompt
          featureName="Tìm Ngày Tốt"
          benefits={[
            "Tự động tính toán ngày lành tháng tốt",
            "Kết nối với lịch cá nhân để tránh ngày bận",
            "Gợi ý giờ hoàng đạo cho từng loại công việc",
            "Tiết kiệm thời gian tra cứu thủ công"
          ]}
          entitlement={entitlement}
          onClose={() => {
            setShowUpgrade(false);
            // Optional: redirect to home if they close and don't have access
          }}
          onUpgradeSuccess={() => setHasAccess(true)}
        />
      )}
    </div>
  );
}
