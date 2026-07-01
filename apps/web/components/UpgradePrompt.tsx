import React, { useState } from "react";
import { entitlementClient, EntitlementResponse } from "../lib/entitlement-client";
import { Preferences } from '@capacitor/preferences';

interface UpgradePromptProps {
  featureName: string;
  benefits: string[];
  entitlement: EntitlementResponse;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ 
  featureName, 
  benefits, 
  entitlement,
  onClose,
  onUpgradeSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartTrial = async () => {
    setLoading(true);
    setError("");
    try {
      const { value } = await Preferences.get({ key: 'token' });
      const token = value || "";
      const res = await fetch("/api/entitlement/trial", {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start trial");
      }

      entitlementClient.invalidateCache();
      if (onUpgradeSuccess) onUpgradeSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-2">Mở khóa {featureName}</h2>
        
        <div className="mb-6">
          <h3 className="text-gray-700 font-medium mb-2">Lợi ích:</h3>
          <ul className="space-y-2">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col space-y-3">
          {entitlement.trialAvailable ? (
            <button 
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Đang xử lý..." : "Dùng thử 7 ngày miễn phí"}
            </button>
          ) : (
            <button 
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
              onClick={() => {
                // TODO: Redirect to payment flow in Phase 4
                alert("Payment flow will be integrated here");
              }}
            >
              Nâng cấp Premium
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700 font-medium py-2"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};
