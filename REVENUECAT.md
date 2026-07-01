# Tích hợp RevenueCat (Payment Gateway)

Tài liệu này hướng dẫn cách thay thế mock API keys bằng real API keys để tính năng thanh toán in-app purchases qua Apple App Store và Google Play hoạt động thật.

## 1. Tạo tài khoản & Project trên RevenueCat
1. Truy cập [RevenueCat](https://www.revenuecat.com/) và đăng ký tài khoản.
2. Tạo một Project mới.
3. Trong Project, tạo 2 App:
   - **App Store** (cho iOS)
   - **Play Store** (cho Android)
4. Lấy API Keys:
   - Vào Project Settings > API Keys.
   - Bạn sẽ thấy Public app-specific API keys dạng `appl_XXXXXXXXXXXXXXXXXXXX` và `goog_XXXXXXXXXXXXXXXXXXXX`.

## 2. Cấu hình In-App Purchases (IAP) trên Store
Bạn cần cấu hình sản phẩm trên Apple App Store Connect và Google Play Console.
1. Tạo Auto-Renewable Subscription.
2. Thiết lập giá cả và ID sản phẩm (ví dụ: `genie_premium_monthly`, `genie_premium_yearly`).
3. Cấp quyền truy cập cho RevenueCat thông qua Service Credentials / App-Specific Shared Secret.

## 3. Tạo Offerings & Entitlements trong RevenueCat
1. **Entitlements**: Tạo một entitlement tên là `premium` hoặc `family`.
2. **Products**: Liên kết các Product IDs bạn tạo trên Apple/Google vào RevenueCat.
3. **Offerings**: Tạo một offering mới (thường tên là `default`), đính kèm các Products vào Packages (như Monthly, Annual).

## 4. Thay mã Key vào Code (Cuối cùng)
Mở file `apps/web/lib/monetization/IAPService.ts` và thay đoạn sau bằng Key thật của bạn:

```typescript
      if (Capacitor.getPlatform() === 'ios') {
        await Purchases.configure({ 
          apiKey: "appl_YOUR_REAL_KEY_HERE", 
          appUserID: userId || undefined 
        });
      } else if (Capacitor.getPlatform() === 'android') {
        await Purchases.configure({ 
          apiKey: "goog_YOUR_REAL_KEY_HERE", 
          appUserID: userId || undefined 
        });
      }
```

Sau khi cấu hình xong, màn hình Khóa Tính Năng (UpgradePrompt) sẽ tự động fetch Offerings từ RevenueCat, hiển thị giá tiền, và xử lý thanh toán qua Capacitor SDK!
