"use client";

import { useEffect, useState } from "react";
import { PurchasesOfferings, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { IAPService } from "../../lib/monetization/IAPService";
import { ChevronLeft, Star } from "lucide-react";
import Link from "next/link";

export default function StorePage() {
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    async function loadOfferings() {
      const data = await IAPService.getOfferings();
      setOfferings(data);
      setLoading(false);
    }
    loadOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    const result = await IAPService.purchasePackage(pkg);
    setPurchasing(false);

    if (result.success) {
      alert("Purchase successful! Thank you for supporting Genie Am Lich.");
    } else {
      alert("Purchase failed or was cancelled.");
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const result = await IAPService.restorePurchases();
    setPurchasing(false);

    if (result.success) {
      alert("Purchases restored successfully.");
    } else {
      alert("Failed to restore purchases.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-[#3D1266] text-white p-4 sticky top-0 z-10 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </Link>
          <h1 className="text-xl font-bold">Premium Store</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <div className="text-center mb-8 mt-4">
          <div className="bg-yellow-100 text-yellow-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Premium</h2>
          <p className="text-gray-600">
            Unlock exclusive widgets, premium themes, and unlimited daily horoscope readings.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D1266]"></div>
          </div>
        ) : offerings?.current ? (
          <div className="space-y-4">
            {offerings.current.availablePackages.map((pkg) => (
              <div 
                key={pkg.identifier} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.product.title}</h3>
                  <p className="text-sm text-gray-500">{pkg.product.description}</p>
                </div>
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing}
                  className="bg-[#3D1266] text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-[#2A0D47] transition-colors disabled:opacity-50"
                >
                  {pkg.product.priceString}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 mb-2">No offerings available right now.</p>
            <p className="text-sm text-gray-400">Please check back later or ensure you are on a native device.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button 
            onClick={handleRestore}
            disabled={purchasing}
            className="text-sm text-[#3D1266] font-medium hover:underline disabled:opacity-50"
          >
            Restore Purchases
          </button>
          <p className="text-xs text-gray-400 mt-4 px-4">
            Payment will be charged to your Apple/Google account at confirmation of purchase. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
          </p>
        </div>
      </main>
    </div>
  );
}
