import { describe, it, expect } from 'vitest';
import { AffiliateResolverImpl } from '../../src/commerce/affiliate-resolver';

describe('AffiliateResolver', () => {
  it('MUST return offers for mung_1 and append UTM params to click_url', () => {
    const resolver = new AffiliateResolverImpl();
    const offers = resolver.getOffersForEvent('mung_1');
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0].click_url).toContain('utm_source=genie_lunar');
    expect(offers[0].click_url).toContain('utm_campaign=mung_1');
  });

  it('MUST support normalized event IDs with spaces and accents', () => {
    const resolver = new AffiliateResolverImpl();
    const offers = resolver.getOffersForEvent('Mùng 1');
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0].click_url).toContain('utm_campaign=m%C3%B9ng_1');
  });

  it('MUST return empty array for unknown events', () => {
    const resolver = new AffiliateResolverImpl();
    const offers = resolver.getOffersForEvent('unknown_event');
    expect(offers.length).toBe(0);
  });
});
