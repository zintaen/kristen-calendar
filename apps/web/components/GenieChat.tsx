"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchGenie, GenieContext } from "../lib/genie-client";
import { UpgradePrompt } from "./UpgradePrompt";
import { convertSolar2Lunar } from "@cyberskill/amlich-core";
import { entitlementClient, EntitlementResponse } from "../lib/entitlement-client";
import { useMutation } from "@tanstack/react-query";

interface Message {
  id: string;
  role: "user" | "genie";
  text: string;
  isError?: boolean;
}

export function GenieChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "genie",
      text: "Chào bạn, tôi là Genie Âm Lịch. Bạn muốn hỏi về phong tục, mâm cúng, hay ý nghĩa ngày lễ nào hôm nay?"
    }
  ]);
  const [input, setInput] = useState("");
  const [ttsSupported, setTtsSupported] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setTtsSupported(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { mutate: sendMessage, isPending: isLoading } = useMutation({
    mutationFn: async ({ text, userMsgId }: { text: string; userMsgId: string }) => {
      const now = new Date();
      const lunar = convertSolar2Lunar(now.getDate(), now.getMonth() + 1, now.getFullYear(), 7);
      const context: GenieContext = {
        lunarDate: `${lunar[0]}/${lunar[1]}/${lunar[2]}`,
        questionType: "phong_tuc_hoi_dap"
      };

      return await fetchGenie({
        question: text,
        context,
        ttsRequested: false // client will do TTS locally
      });
    },
    onSuccess: (response) => {
      setMessages(prev => [
        ...prev,
        { id: response.requestId, role: "genie", text: response.answer }
      ]);
    },
    onError: async (error: any) => {
      if (error.code === "FEATURE_NOT_ALLOWED" || error.code === "QUOTA_EXCEEDED") {
        const ent = await entitlementClient.get();
        setEntitlement(ent);
        setShowUpgrade(true);
      } else {
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: "genie", text: error.message || "Lỗi không xác định.", isError: true }
        ]);
      }
    }
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", text: userText }]);

    sendMessage({ text: userText, userMsgId });
  };

  const handleTTS = (text: string) => {
    if (!ttsSupported) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-[600px] max-h-screen bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100">
      <div className="bg-purple-700 text-white p-4 font-semibold text-lg flex items-center justify-between">
        <span>Genie Âm Lịch ✨</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === "user" 
                  ? "bg-purple-600 text-white rounded-tr-sm" 
                  : msg.isError
                    ? "bg-red-50 text-red-700 border border-red-200 rounded-tl-sm"
                    : "bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm"
              }`}
            >
              <div className="text-sm prose prose-sm prose-purple max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
              
              {msg.role === "genie" && !msg.isError && ttsSupported && (
                <button 
                  onClick={() => handleTTS(msg.text)}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center"
                >
                  🔊 Đọc câu trả lời
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-2xl bg-white border border-gray-200 shadow-sm rounded-tl-sm">
              <div className="flex space-x-1 items-center h-5">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Hỏi về mâm cúng, kiêng kỵ..."
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition-shadow text-gray-800 text-sm"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-purple-600 text-white rounded-xl px-4 font-medium disabled:opacity-50 hover:bg-purple-700 transition-colors"
          >
            Gửi
          </button>
        </div>
      </div>

      {showUpgrade && entitlement && (
        <UpgradePrompt 
          featureName="AI Genie"
          benefits={[
            "Hỏi đáp không giới hạn về phong tục tập quán",
            "Gợi ý mâm cúng đầy đủ, chi tiết",
            "Giải thích ý nghĩa ngày lễ, tiết khí",
            "Hỗ trợ 24/7 với dữ liệu chuẩn xác"
          ]}
          entitlement={entitlement}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
