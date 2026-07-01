"use client";

import React, { useEffect, useState } from "react";
import { Typography } from "@cyberskill/genie-ui";
import { AffiliateResolverImpl, type AffiliateOffer } from "@cyberskill/amlich-core";

interface AffiliateWidgetProps {
  eventId: string;
}

export function AffiliateWidget({ eventId }: AffiliateWidgetProps) {
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);

  useEffect(() => {
    // Ideally this could also be fetched from an API if it needs dynamic DB queries,
    // but the spec says AffiliateResolver is in amlich-core for identical resolution across clients.
    const resolver = new AffiliateResolverImpl();
    setOffers(resolver.getOffersForEvent(eventId));
  }, [eventId]);

  const handleOfferClick = async (offer: AffiliateOffer) => {
    // Fire and forget log
    fetch("/api/commerce/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerId: offer.id,
        eventId,
      })
    }).catch(console.error);

    // Redirect to the affiliate link
    window.open(offer.click_url, "_blank");
  };

  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-100">
      <Typography variant="heading-3" className="text-blue-900 mb-3">Gợi ý mua sắm & dịch vụ</Typography>
      <div className="flex overflow-x-auto gap-4 pb-2 snap-x">
        {offers.map(offer => (
          <div 
            key={offer.id} 
            className="flex-shrink-0 w-40 bg-white rounded shadow-sm border border-gray-100 overflow-hidden cursor-pointer snap-start hover:shadow-md transition-shadow"
            onClick={() => handleOfferClick(offer)}
          >
            <div className="h-24 bg-gray-200 w-full relative">
              {/* Fallback image if needed, here just using the URL or a placeholder */}
              <img 
                src={offer.image_url} 
                alt={offer.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = "https://placehold.co/160x96?text=Image"; }}
              />
            </div>
            <div className="p-2">
              <Typography variant="body-small" className="text-gray-800 font-medium line-clamp-2 leading-tight">
                {offer.title}
              </Typography>
              <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                {offer.provider_name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
