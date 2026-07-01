export interface AffiliateOffer {
  id: string;
  provider_name: string; // e.g. "GrabMart", "ShopeeFood"
  category: "flowers" | "offerings" | "services";
  title: string;
  image_url: string;
  click_url: string; // The URL to redirect the user to
  base_url: string;  // The base URL without UTM params
  priority: number;
}

export interface AffiliateResolver {
  getOffersForEvent(eventId: string, region?: string): AffiliateOffer[];
}

const MOCK_OFFERS: Record<string, Omit<AffiliateOffer, "click_url">[]> = {
  "mung_1": [
    {
      id: "grabmart_flowers_01",
      provider_name: "GrabMart",
      category: "flowers",
      title: "Set hoa cúng Rằm/Mùng 1",
      image_url: "https://example.com/flowers.jpg",
      base_url: "https://grb.to/mock-flowers",
      priority: 100
    },
    {
      id: "shopee_fruits_01",
      provider_name: "ShopeeFood",
      category: "offerings",
      title: "Mâm ngũ quả",
      image_url: "https://example.com/fruits.jpg",
      base_url: "https://shopee.vn/mock-fruits",
      priority: 90
    }
  ],
  "ram": [
    {
      id: "grabmart_flowers_01",
      provider_name: "GrabMart",
      category: "flowers",
      title: "Set hoa cúng Rằm",
      image_url: "https://example.com/flowers.jpg",
      base_url: "https://grb.to/mock-flowers",
      priority: 100
    },
    {
      id: "shopee_fruits_01",
      provider_name: "ShopeeFood",
      category: "offerings",
      title: "Mâm ngũ quả",
      image_url: "https://example.com/fruits.jpg",
      base_url: "https://shopee.vn/mock-fruits",
      priority: 90
    }
  ]
};

export class AffiliateResolverImpl implements AffiliateResolver {
  getOffersForEvent(eventId: string, region?: string): AffiliateOffer[] {
    // Normalise eventId
    const normalizedEventId = eventId.toLowerCase().replace(/\s+/g, '_');
    
    // Fallback: If "mùng 1" or "rằm", map to our mock data keys
    let lookupKey = normalizedEventId;
    if (lookupKey.includes('mùng_1') || lookupKey.includes('mung_1')) {
      lookupKey = 'mung_1';
    } else if (lookupKey.includes('rằm') || lookupKey.includes('ram')) {
      lookupKey = 'ram';
    }

    const offers = MOCK_OFFERS[lookupKey] || [];
    
    return offers.map(offer => {
      let urlStr = offer.base_url;
      try {
        const url = new URL(offer.base_url);
        url.searchParams.append('utm_source', 'genie_lunar');
        url.searchParams.append('utm_campaign', normalizedEventId);
        urlStr = url.toString();
      } catch (e) {
        // Fallback for malformed URLs
      }
      
      return {
        ...offer,
        click_url: urlStr
      };
    }).sort((a, b) => b.priority - a.priority);
  }
}
