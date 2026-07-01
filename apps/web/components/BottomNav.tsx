"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  
  const TABS = [
    { name: "Hôm nay", href: "/", icon: "🏠" },
    { name: "Lịch", href: "/calendar", icon: "📅" },
    { name: "Nhắc", href: "/reminders", icon: "🔔" },
    { name: "Cài đặt", href: "/settings", icon: "⚙️" },
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto flex justify-between">
        {TABS.map(tab => {
          const isActive = pathname === tab.href;
          return (
            <Link 
              key={tab.href}
              href={tab.href} 
              className={`flex flex-col items-center p-2 min-w-[64px] ${isActive ? "text-primary" : "text-gray-400"}`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
