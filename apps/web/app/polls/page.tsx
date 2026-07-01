"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase-client";

interface Board {
  id: string;
  title: string;
}

interface Option {
  id: string;
  date: string;
  label: string;
  metadata: any;
}

interface Vote {
  id: string;
  option_id: string;
  voter_name: string;
}

function PollPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [board, setBoard] = useState<Board | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [voterName, setVoterName] = useState<string>("");
  const [isNameSet, setIsNameSet] = useState<boolean>(false);
  const [isVoting, setIsVoting] = useState<boolean>(false);

  useEffect(() => {
    // Check if name is already saved
    const savedName = localStorage.getItem("genie_voter_name");
    if (savedName) {
      setVoterName(savedName);
      setIsNameSet(true);
    }
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (voterName.trim()) {
      localStorage.setItem("genie_voter_name", voterName.trim());
      setIsNameSet(true);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchPoll = async () => {
      // Fetch board
      const { data: bData } = await supabase.from("decision_boards").select("*").eq("id", id).single();
      if (bData) setBoard(bData);

      // Fetch options
      const { data: optData } = await supabase.from("decision_options").select("*").eq("board_id", id).order("date", { ascending: true });
      if (optData) setOptions(optData);

      if (optData && optData.length > 0) {
        // Fetch votes
        const optionIds = optData.map(o => o.id);
        const { data: voteData } = await supabase.from("decision_votes").select("*").in("option_id", optionIds);
        if (voteData) setVotes(voteData);
      }

      setLoading(false);
    };

    fetchPoll();

    // Subscribe to realtime updates on votes
    const channel = supabase
      .channel(`realtime:poll:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "decision_votes" },
        (payload) => {
          const newVote = payload.new as Vote;
          // Only add if the vote is for an option on this board (simplified check)
          setVotes(prev => {
            if (prev.find(v => v.id === newVote.id)) return prev;
            return [...prev, newVote];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleVote = async (optionId: string) => {
    if (!isNameSet || !voterName) {
      alert("Vui lòng nhập tên trước khi bình chọn.");
      return;
    }

    setIsVoting(true);
    try {
      const { error } = await supabase
        .from("decision_votes")
        .insert([{ option_id: optionId, voter_name: voterName }]);
      
      if (error) throw error;
      // Optimistic update isn't strictly necessary since realtime will catch it,
      // but it's good UX.
    } catch (e: any) {
      console.error(e);
      alert("Lỗi: " + e.message);
    } finally {
      setIsVoting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  }

  if (!board) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Không tìm thấy bình chọn.</div>;
  }

  // Count votes per option
  const voteCounts: Record<string, Vote[]> = {};
  options.forEach(o => voteCounts[o.id] = []);
  votes.forEach(v => {
    if (voteCounts[v.option_id]) {
      voteCounts[v.option_id].push(v);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{board.title}</h1>
        <p className="text-gray-500 mb-6 text-sm">Bình chọn thời gian phù hợp nhất cho công việc của bạn. Kết quả sẽ được cập nhật trực tiếp cho mọi người.</p>

        {!isNameSet ? (
          <form onSubmit={handleSaveName} className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-100">
            <label className="block text-sm font-medium text-purple-900 mb-2">Tên của bạn là gì?</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={voterName}
                onChange={e => setVoterName(e.target.value)}
                placeholder="VD: Mẹ, Anh Hai..."
                className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:border-purple-500"
                required
              />
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700">Lưu</button>
            </div>
          </form>
        ) : (
          <div className="mb-6 flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <span className="text-sm text-gray-700">Đang bình chọn với tên: <strong>{voterName}</strong></span>
            <button onClick={() => setIsNameSet(false)} className="text-xs text-purple-600 hover:underline">Đổi tên</button>
          </div>
        )}

        <div className="space-y-4">
          {options.map(opt => {
            const optVotes = voteCounts[opt.id] || [];
            const hasVoted = optVotes.some(v => v.voter_name === voterName);

            return (
              <div key={opt.id} className="border border-gray-200 rounded-xl p-4 transition-colors hover:border-purple-300">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{opt.label}</h3>
                    {opt.metadata?.diaChiNgay && (
                      <p className="text-xs text-gray-500 mt-1">Ngày {opt.metadata.canChiNgay}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleVote(opt.id)}
                    disabled={isVoting || !isNameSet}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      hasVoted ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {hasVoted ? "Đã Chọn" : "Chọn Ngày Này"}
                  </button>
                </div>

                <div className="mt-3 bg-gray-50 p-2 rounded-lg min-h-[40px] flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-gray-500 w-16">{optVotes.length} Phiếu:</span>
                  {optVotes.map(v => (
                    <span key={v.id} className="inline-block px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-800 shadow-sm">
                      {v.voter_name}
                    </span>
                  ))}
                  {optVotes.length === 0 && <span className="text-xs text-gray-400 italic">Chưa có ai chọn</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a href="/good-day-picker" className="text-purple-600 hover:underline text-sm">
            &larr; Quay lại Tìm Ngày Tốt
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PollPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <PollPageContent />
    </Suspense>
  );
}
