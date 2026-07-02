"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase-client";
import { useRouter } from "next/navigation";
import { Preferences } from '@capacitor/preferences';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Map the requested username "kristen" to the email we registered
    let email = username;
    let finalPassword = password;
    if (username.toLowerCase() === "kristen") {
      email = "kristen@master.com";
      if (password === "1991") {
        finalPassword = "1991_master_kristen";
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: finalPassword,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      if (data.session?.access_token) {
        await Preferences.set({ key: 'token', value: data.session.access_token });
      }
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pb-20">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#3D1266]">Đăng nhập</h2>
          <p className="text-gray-500 mt-2">Đăng nhập tài khoản Master của bạn</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#3D1266] focus:border-[#3D1266] outline-none transition-colors"
              placeholder="kristen"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#3D1266] focus:border-[#3D1266] outline-none transition-colors"
              placeholder="••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3D1266] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#5a1c96] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
