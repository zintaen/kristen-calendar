import { Purchases, PurchasesOfferings, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// Mock for Web fallback if needed
const isNative = Capacitor.isNativePlatform();

export class IAPService {
  static async init() {
    if (!isNative) {
      console.log('[IAPService] Not running on native, skipping RevenueCat init.');
      return;
    }

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      // Mock user ID for local dev until real auth is wired up
      const userId = "local-dev-user";

      if (Capacitor.getPlatform() === 'ios') {
        await Purchases.configure({ 
          apiKey: "appl_XXXXX", 
          appUserID: userId || undefined 
        });
      } else if (Capacitor.getPlatform() === 'android') {
        await Purchases.configure({ 
          apiKey: "goog_XXXXX", 
          appUserID: userId || undefined 
        });
      }
    } catch (e) {
      console.error("[IAPService] Initialization failed", e);
    }
  }

  static async getOfferings(): Promise<PurchasesOfferings | null> {
    if (!isNative) return null;
    try {
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (e) {
      console.error("[IAPService] Failed to get offerings", e);
      return null;
    }
  }

  static async purchasePackage(pkg: any) {
    if (!isNative) return { error: "Not native" };
    try {
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      return { success: true, result };
    } catch (e: any) {
      console.error("[IAPService] Purchase failed", e);
      return { success: false, error: e };
    }
  }

  static async restorePurchases() {
    if (!isNative) return { error: "Not native" };
    try {
      const customerInfo = await Purchases.restorePurchases();
      return { success: true, customerInfo };
    } catch (e: any) {
      console.error("[IAPService] Restore failed", e);
      return { success: false, error: e };
    }
  }

  static async hasEntitlement(entitlementId: string): Promise<boolean> {
    if (!isNative) return false;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return !!customerInfo.customerInfo.entitlements.active[entitlementId];
    } catch (e) {
      console.error("[IAPService] Check entitlement failed", e);
      return false;
    }
  }
}
