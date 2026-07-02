"use client";

import React, { useState } from "react";
import { GenieChat } from "./GenieChat";

export function GlobalGenie() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="genie-fab"
        className="fixed bottom-24 right-4 md:right-8 bg-purple-600 hover:bg-purple-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition-transform hover:scale-105 active:scale-95"
        aria-label="Mở Genie Âm Lịch"
      >
        {isOpen ? "✕" : "✨"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 md:right-8 w-[calc(100vw-32px)] md:w-[400px] max-h-[70vh] flex flex-col z-[100] animate-in fade-in slide-in-from-bottom-4 duration-200 shadow-2xl rounded-2xl overflow-hidden bg-white">
          <GenieChat />
        </div>
      )}
    </>
  );
}
