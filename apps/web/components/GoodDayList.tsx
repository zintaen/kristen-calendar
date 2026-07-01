import React from "react";
import type { GoodDayResult } from "../lib/good-day";

export function GoodDayList({ results, totalGoodDays }: { results: GoodDayResult[], totalGoodDays: number }) {
  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100 mt-4">
        Không có ngày Hoàng đạo nào phù hợp trong khoảng thời gian này.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="text-sm font-medium text-purple-800 bg-purple-50 p-3 rounded-md border border-purple-100">
        Tìm thấy {totalGoodDays} ngày Hoàng đạo trong khoảng này.
      </div>
      
      {results.map((r, i) => (
        <div 
          key={i} 
          className="border border-gray-200 p-4 rounded-xl shadow-sm bg-white cursor-pointer hover:border-purple-300 transition-colors" 
          onClick={() => {
            navigator.clipboard.writeText(`${r.date} - Hoàng đạo - Trực ${r.truc.name} - ${r.canChiNgay}`);
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-gray-900">{r.date}</h4>
              <p className="text-sm text-gray-500">{r.canChiNgay}</p>
            </div>
            {r.isHoangDao && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                Hoàng Đạo
              </span>
            )}
          </div>
          
          <div className="mt-3 text-sm text-gray-700 grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 block text-xs">Trực</span>
              <span className="font-medium">{r.truc.name}</span>
              {r.trucMatchesWorkType && (
                <span className="ml-2 inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold uppercase tracking-wider">
                  Phù hợp
                </span>
              )}
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 block text-xs">Sao</span>
              <span className="font-medium">{r.sao28.name}</span>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Giờ Tốt</p>
            <div className="flex flex-wrap gap-1.5">
              {r.topHoangGio.map(g => (
                <span key={g.canh} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-medium border border-purple-100">
                  {g.canh.split(' ')[0]} ({g.tuGio}-{g.denGio})
                </span>
              ))}
            </div>
          </div>
          
          {r.hasCalendarConflict && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-md flex items-center gap-1.5 font-medium border border-red-100">
              <span>⚠️</span> Đã có sự kiện trên lịch
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
