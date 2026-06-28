---
id: FR-LUNAR-009
title: "Purple style pack - sub-brand tim mo rong design-system CyberSkill (override color tokens, giu structure), Be Vietnam Pro, cong tuong phan APCA Lc >= 75"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P1
milestone: P1 · slice 2
slice: 2
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-010, FR-LUNAR-014]
depends_on: []
blocks: [FR-LUNAR-010, FR-LUNAR-014, FR-LUNAR-016]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Accessibility, NFR-Localization)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (UI/UX purple sub-brand)"
source_decisions:
  - DEC-LUNAR-090 (purple style pack la sub-brand extension, KHONG thay the base brand CyberSkill Umber #45210E / Ochre #F4BA17; chi override color tokens, giu nguyen token structure spacing/typography/component)
  - DEC-LUNAR-091 (moi cap mau chu/nen phai dat APCA Lc >= 75 do bang apca-w3 truoc khi ship; uu tien Lc 90 cho body text >= 18px/400 weight; WCAG 2.x AA 4.5:1 chay song song lam rai an toan phap ly)
  - DEC-LUNAR-092 (typography duy nhat la Be Vietnam Pro, import tu Google Fonts hoac bundle local; la typeface cua CyberSkill, ho tro day du dau tieng Viet)
  - DEC-LUNAR-093 (nen kem am (warm cream bg, ~#FDF6EC hoac tuong duong) duoc chon lam nen default thay vi trang thuan #FFFFFF de hoa hop voi DNA "warm earth" CyberSkill; tim dam tren nen kem dat APCA tot hon tim nhat tren trang)
  - DEC-LUNAR-094 (token mau purple pack duoc to chuc theo 3 lop: primitive (hex raw), semantic (vai tro UI: text, bg, border, accent), component (button-primary-bg v.v.); layer semantic va component override layer primitive cua CyberSkill base)
language: typescript 5.x
service: packages/ui/
new_files:
  - packages/ui/src/theme/tokens.ts
  - packages/ui/src/theme/apca.ts
  - packages/ui/src/theme/apca.test.ts
  - packages/ui/src/theme/index.ts
  - packages/ui/src/components/Button.tsx
  - packages/ui/src/components/Card.tsx
  - packages/ui/src/components/Typography.tsx
  - packages/ui/src/index.ts
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: packages/ui/**
  - file_write: packages/ui/src/**
  - bash: cd packages/ui && pnpm test
disallowed_tools:
  - "thay the Umber #45210E hoac Ochre #F4BA17 trong base brand tokens (vi pham DEC-LUNAR-090)"
  - "dung mau tim nhat (Lc < 75) lam mau text chinh tren nen kem (vi pham DEC-LUNAR-091 / NFR-Accessibility)"
  - "import font khac Be Vietnam Pro lam typography chinh (vi pham DEC-LUNAR-092)"
effort_hours: 8
sub_tasks:
  - "1.5h: tokens.ts - dinh nghia 3 lop token (primitive, semantic, component) voi gia tri day du"
  - "1.0h: apca.ts - ham checkApca(fg, bg) bao gom apca-w3, assert Lc >= 75; checkWcag(fg, bg) WCAG AA"
  - "1.0h: apca.test.ts - kiem tra tung cap text/nen trong palette, assert ca APCA va WCAG"
  - "1.0h: Typography.tsx - component viet chuan voi Be Vietnam Pro, Dynamic Type scale"
  - "1.0h: Button.tsx - primary/secondary/ghost voi purple tokens, APCA-safe"
  - "1.0h: Card.tsx - card co border tim, padding, shadow nhe tren nen kem"
  - "1.0h: CSS variables / Tailwind config extension cho purple tokens"
  - "0.5h: index.ts - export tap trung, kiem tra build"
risk_if_skipped: "Khong co design tokens thi moi component cua FR-010 (app shell), FR-007 (grid), FR-014 (cards) tu chon mau rieng, dan den khong dong nhat. Khong co APCA gate thi UI co the ship voi tuong phan thap, vi pham NFR-Accessibility."
---

## §1 - Description (BCP-14 normative)

Module nay PHẢI xây dựng purple style pack là sub-brand extension của CyberSkill design system, đủ để toàn bộ UI của "Genie Âm Lịch" dùng token thống nhất và đạt chuẩn tương phản APCA.

1. PHẢI tổ chức token theo 3 lớp: primitive (giá trị hex thô), semantic (vai trò UI: text, background, border, accent, error), component (per-component như button-primary-bg, card-border) - cấu trúc này giữ nguyên từ CyberSkill design system, chỉ override giá trị màu (DEC-LUNAR-094).
2. PHẢI KHÔNG thay thế hoặc ghi đè token base brand CyberSkill `--color-brand-umber: #45210E` và `--color-brand-ochre: #F4BA17`; hai token này được giữ nguyên và có thể được dùng trong footer hoặc logo (DEC-LUNAR-090).
3. PHẢI định nghĩa palette tím (purple) gồm ít nhất: `purple-900` (tím đậm nhất, dùng cho text chính), `purple-700` (tím trung, dùng cho text thứ cấp và nút), `purple-500` (tím trung sáng, accent), `purple-200` (tím nhạt, border nhẹ), `purple-50` (tím rất nhạt, hover state) dưới dạng CSS variables và TypeScript constants.
4. PHẢI định nghĩa `--color-bg-default: #FDF6EC` (kem ấm, warm cream) làm màu nền mặc định thay vì `#FFFFFF`, nhằm hài hòa với DNA "warm earth" của CyberSkill và cải thiện APCA trên nền kem so với nền trắng (DEC-LUNAR-093).
5. PHẢI cung cấp hàm `checkApca(fgHex: string, bgHex: string): number` trả giá trị APCA Lc (có dấu) sử dụng thư viện `apca-w3`; và hàm `assertApca(fgHex, bgHex, minLc: number)` throw Error nếu `|Lc| < minLc` (DEC-LUNAR-091).
6. PHẢI cung cấp hàm `checkWcag(fgHex: string, bgHex: string): number` trả tỷ lệ tương phản WCAG 2.x; và hàm `assertWcag21AA(fgHex, bgHex)` throw Error nếu ratio < 4.5 (DEC-LUNAR-091).
7. PHẢI có bộ test tự động kiểm tra từng cặp màu text/nền trong palette, đảm bảo APCA Lc >= 75 cho body text và WCAG AA >= 4.5:1 (DEC-LUNAR-091, NFR-Accessibility).
8. PHẢI dùng duy nhất **Be Vietnam Pro** làm typeface chính; import từ Google Fonts CDN trong production hoặc bundle local cho PWA offline; định nghĩa scale font: `font-size-xs` (12px), `font-size-sm` (14px), `font-size-base` (16px), `font-size-lg` (18px), `font-size-xl` (20px), `font-size-2xl` (24px), `font-size-3xl` (30px) (DEC-LUNAR-092).
9. PHẢI hỗ trợ Dynamic Type trên iOS bằng cách dùng `rem` hoặc `em` thay vì `px` cho font-size trong các component; và test rằng component `Typography` không dùng đơn vị `px` hardcode cho font-size (NFR-Accessibility).
10. PHẢI cung cấp component `Typography` với variants: `heading-1`, `heading-2`, `heading-3`, `body`, `body-small`, `caption`; mỗi variant dùng đúng token font-size và font-weight.
11. PHẢI cung cấp component `Button` với variants: `primary` (nền tím đậm, chữ kem), `secondary` (viền tím, nền kem), `ghost` (không viền, chữ tím); mỗi variant PHẢI đạt APCA Lc >= 75 giữa chữ và nền.
12. PHẢI cung cấp component `Card` với style tím nhẹ (viền tím mờ, nền kem, shadow nhẹ), phù hợp để bọc nội dung dịp lễ và nhắc.
13. PHẢI export tất cả token dưới dạng TypeScript object `PURPLE_TOKENS` để Tailwind config, CSS-in-JS, hoặc `style` prop dùng trực tiếp; đồng thời export dưới dạng CSS custom properties trong một file `.css` để dùng với Tailwind.
14. KHÔNG ĐƯỢC dùng `!important` để override; thứ tự cascade CSS phải đủ để purple token thắng mà không cần `!important`.
15. NÊN đảm bảo text body dài (`body` variant, >= 18px/400 weight) đạt APCA Lc >= 90 theo NFR-Accessibility "ưu tiên Lc 90 cho đoạn dài".
16. NÊN cung cấp màu `--color-error: #B91C1C` (đỏ đậm) đạt APCA Lc >= 75 trên nen kem, để dùng trong validation form.

---

## §2 - Why this design (rationale for humans)

**Tại sao sub-brand extension, không phải theme riêng (DEC-LUNAR-090)?** Nếu tạo một design system hoàn toàn riêng cho "Genie Âm Lịch", sau này khi CyberSkill cập nhật spacing, component API, hay typography scale thì phải sync hai hệ thống song song. Giữ nguyên cấu trúc token và chỉ override giá trị màu cho phép "Genie Âm Lịch" thừa hưởng mọi update về spacing và component từ base design system tự động.

**Tại sao giữ Umber #45210E và Ochre #F4BA17 (DEC-LUNAR-090)?** Hai màu này là brand identity của CyberSkill - được dùng trong logo và tài liệu thương hiệu chính thức. Xóa chúng khỏi token sẽ làm mất khả năng hiển thị logo CyberSkill đúng màu trong footer hoặc about screen. Purple pack là sub-brand của một sản phẩm cụ thể, không phải thay thế toàn bộ brand.

**Tại sao APCA Lc >= 75 thay vì chỉ WCAG AA (DEC-LUNAR-091)?** WCAG 2.x dùng công thức tương phản không tuyến tính và cho kết quả không tốt với màu tím trung. PRD §5 và §13 chỉ định APCA Lc >= 75 vì APCA phản ánh đúng hơn khả năng đọc thực tế. WCAG AA (4.5:1) vẫn chạy song song để đáp ứng yêu cầu pháp lý (nhiều tổ chức vẫn yêu cầu WCAG 2.x).

**Tại sao nền kem `#FDF6EC` thay vì trắng (DEC-LUNAR-093)?** Tím đậm trên nền kem đạt APCA cao hơn tím đậm trên trắng thuần vì nền kem có luminance thấp hơn trắng, làm tăng độ tương phản. Quan trọng hơn, kem ấm phù hợp với "warm earth" DNA của CyberSkill và tạo cảm giác ấm cúng, gần gũi với tông cúng lễ - phù hợp với persona Chị Linh.

**Tại sao 3 lớp token (DEC-LUNAR-094)?** Lớp primitive là giá trị thô (hex). Lớp semantic là ý nghĩa (text-primary, bg-default). Lớp component là binding cụ thể (button-primary-bg = semantic text-primary, card-border = semantic border-subtle). Lớp semantic là lớp quan trọng nhất - khi cần đổi màu button, chỉ thay một token semantic, tất cả component dùng token đó tự cập nhật.

**Tại sao Be Vietnam Pro (DEC-LUNAR-092)?** Đây là typeface chính thức của CyberSkill, hỗ trợ đầy đủ Unicode cho tiếng Việt (bao gồm dấu hỏi/ngã/huyền/sắc/nặng ở cả chữ hoa và thường). Dùng Be Vietnam Pro đảm bảo ngày âm lịch như "Mùng Một tháng Giêng" hiển thị đúng dấu trên mọi thiết bị, không phụ thuộc font hệ thống.

**Tại sao cần `apca-w3` thay vì tính tay?** Công thức APCA không đơn giản - sử dụng gamma correction và S-curve nonlinear. Thư viện `apca-w3` là implementation chính thức từ W3C/APCA, giảm rủi ro tính sai. Gate tự động trong CI ngăn chặn ship màu tương phản thấp.

---

## §3 - API contract

```typescript
// packages/ui/src/theme/tokens.ts

// === Layer 1: Primitive tokens (raw hex values) ===
export const PRIMITIVE = {
  // Purple palette
  "purple-900": "#2D0A4E",
  "purple-800": "#3D1266",
  "purple-700": "#5B21B6",
  "purple-600": "#7C3AED",
  "purple-500": "#8B5CF6",
  "purple-400": "#A78BFA",
  "purple-200": "#DDD6FE",
  "purple-100": "#EDE9FE",
  "purple-50":  "#F5F3FF",

  // Warm cream / neutral
  "cream-50":   "#FDF6EC",
  "cream-100":  "#FBF0DC",
  "cream-200":  "#F5E0C0",

  // CyberSkill base brand - DO NOT OVERRIDE (DEC-LUNAR-090)
  "brand-umber":  "#45210E",
  "brand-ochre":  "#F4BA17",

  // Error / warning
  "red-700":    "#B91C1C",
  "amber-600":  "#D97706",

  // Neutral
  "gray-900":   "#111827",
  "gray-600":   "#4B5563",
  "gray-400":   "#9CA3AF",
  "white":      "#FFFFFF",
} as const;

// === Layer 2: Semantic tokens ===
export const SEMANTIC = {
  // Text
  "text-primary":        PRIMITIVE["purple-900"],   // main body text on cream bg
  "text-secondary":      PRIMITIVE["purple-700"],   // secondary / UI labels
  "text-disabled":       PRIMITIVE["gray-400"],
  "text-on-primary":     PRIMITIVE["cream-50"],     // text on purple-800 button

  // Backgrounds
  "bg-default":          PRIMITIVE["cream-50"],     // page background (DEC-LUNAR-093)
  "bg-surface":          PRIMITIVE["white"],         // card surface
  "bg-subtle":           PRIMITIVE["purple-50"],     // hover, selected
  "bg-primary":          PRIMITIVE["purple-800"],   // primary button bg

  // Borders
  "border-default":      PRIMITIVE["purple-200"],
  "border-strong":       PRIMITIVE["purple-700"],
  "border-subtle":       PRIMITIVE["purple-100"],

  // Accent / interactive
  "accent-primary":      PRIMITIVE["purple-600"],
  "accent-secondary":    PRIMITIVE["purple-400"],

  // Semantic status
  "error":               PRIMITIVE["red-700"],
  "warning":             PRIMITIVE["amber-600"],

  // Brand (preserved from CyberSkill base, DEC-LUNAR-090)
  "brand-umber":         PRIMITIVE["brand-umber"],
  "brand-ochre":         PRIMITIVE["brand-ochre"],
} as const;

// === Layer 3: Component tokens ===
export const COMPONENT = {
  "button-primary-bg":       SEMANTIC["bg-primary"],
  "button-primary-text":     SEMANTIC["text-on-primary"],
  "button-primary-hover-bg": PRIMITIVE["purple-700"],
  "button-secondary-bg":     SEMANTIC["bg-default"],
  "button-secondary-text":   SEMANTIC["text-secondary"],
  "button-secondary-border": SEMANTIC["border-strong"],
  "button-ghost-text":       SEMANTIC["accent-primary"],

  "card-bg":                 SEMANTIC["bg-surface"],
  "card-border":             SEMANTIC["border-subtle"],
  "card-shadow":             "0 1px 4px rgba(91, 33, 182, 0.08)",  // purple-700 #5B21B6 = rgb(91,33,182) - VERIFIED (audit: rgba(93,..) da duoc sua thanh (91,..))

  "day-cell-today-ring":     SEMANTIC["bg-primary"],
  "day-cell-festival-dot":   SEMANTIC["accent-primary"],
  "day-cell-reminder-dot":   SEMANTIC["accent-secondary"],
} as const;

export const PURPLE_TOKENS = { ...PRIMITIVE, ...SEMANTIC, ...COMPONENT } as const;

// === Typography scale ===
export const TYPOGRAPHY = {
  fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
  fontSizes: {
    xs:   "0.75rem",   // 12px
    sm:   "0.875rem",  // 14px
    base: "1rem",      // 16px
    lg:   "1.125rem",  // 18px
    xl:   "1.25rem",   // 20px
    "2xl":"1.5rem",    // 24px
    "3xl":"1.875rem",  // 30px
  },
  fontWeights: {
    normal:   "400",
    medium:   "500",
    semibold: "600",
    bold:     "700",
  },
} as const;
```

```typescript
// packages/ui/src/theme/apca.ts
import { APCAcontrast, sRGBtoY } from "apca-w3";

/**
 * Tinh APCA Lc (co dau am/duong) cho cap mau chu/nen.
 * fgHex, bgHex: hex string co hoac khong co dau #
 */
export function checkApca(fgHex: string, bgHex: string): number {
  const fg = hexToRgbArray(fgHex);
  const bg = hexToRgbArray(bgHex);
  return APCAcontrast(sRGBtoY(fg), sRGBtoY(bg)) as number;
}

/**
 * Throw Error neu |Lc| < minLc.
 * minLc = 75 cho body text; 90 cho body text dai >= 18px/400.
 */
export function assertApca(fgHex: string, bgHex: string, minLc: number): void {
  const lc = Math.abs(checkApca(fgHex, bgHex));
  if (lc < minLc) {
    throw new Error(
      `APCA fail: ${fgHex} on ${bgHex} = Lc ${lc.toFixed(1)} < ${minLc}`
    );
  }
}

/** WCAG 2.x relative luminance ratio */
export function checkWcag(fgHex: string, bgHex: string): number {
  const fgL = wcagLuminance(hexToRgbArray(fgHex));
  const bgL = wcagLuminance(hexToRgbArray(bgHex));
  const [l1, l2] = fgL > bgL ? [fgL, bgL] : [bgL, fgL];
  return (l1 + 0.05) / (l2 + 0.05);
}

export function assertWcag21AA(fgHex: string, bgHex: string): void {
  const ratio = checkWcag(fgHex, bgHex);
  if (ratio < 4.5) {
    throw new Error(`WCAG AA fail: ${fgHex} on ${bgHex} = ${ratio.toFixed(2)} < 4.5`);
  }
}

function hexToRgbArray(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function wcagLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
```

```tsx
// packages/ui/src/components/Typography.tsx
import React from "react";
import { TYPOGRAPHY, SEMANTIC } from "../theme/tokens";

type TypographyVariant = "heading-1" | "heading-2" | "heading-3" | "body" | "body-small" | "caption";

interface TypographyProps {
  variant: TypographyVariant;
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const VARIANT_STYLES: Record<TypographyVariant, React.CSSProperties> = {
  "heading-1":  { fontSize: TYPOGRAPHY.fontSizes["3xl"], fontWeight: TYPOGRAPHY.fontWeights.bold,     color: SEMANTIC["text-primary"] },
  "heading-2":  { fontSize: TYPOGRAPHY.fontSizes["2xl"], fontWeight: TYPOGRAPHY.fontWeights.semibold,  color: SEMANTIC["text-primary"] },
  "heading-3":  { fontSize: TYPOGRAPHY.fontSizes.xl,    fontWeight: TYPOGRAPHY.fontWeights.semibold,  color: SEMANTIC["text-primary"] },
  "body":       { fontSize: TYPOGRAPHY.fontSizes.lg,    fontWeight: TYPOGRAPHY.fontWeights.normal,    color: SEMANTIC["text-primary"] },
  "body-small": { fontSize: TYPOGRAPHY.fontSizes.base,  fontWeight: TYPOGRAPHY.fontWeights.normal,    color: SEMANTIC["text-primary"] },
  "caption":    { fontSize: TYPOGRAPHY.fontSizes.sm,    fontWeight: TYPOGRAPHY.fontWeights.normal,    color: SEMANTIC["text-secondary"] },
};

export function Typography({ variant, children, className, as: Tag = "p" }: TypographyProps) {
  return (
    <Tag
      className={className}
      style={{ fontFamily: TYPOGRAPHY.fontFamily, ...VARIANT_STYLES[variant] }}
    >
      {children}
    </Tag>
  );
}
```

```tsx
// packages/ui/src/components/Button.tsx
import React from "react";
import { COMPONENT, SEMANTIC } from "../theme/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", children, style, ...props }: ButtonProps) {
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: COMPONENT["button-primary-bg"],
      color: COMPONENT["button-primary-text"],
      border: "none",
    },
    secondary: {
      backgroundColor: COMPONENT["button-secondary-bg"],
      color: COMPONENT["button-secondary-text"],
      border: `1.5px solid ${COMPONENT["button-secondary-border"]}`,
    },
    ghost: {
      backgroundColor: "transparent",
      color: COMPONENT["button-ghost-text"],
      border: "none",
    },
  };
  return (
    <button style={{ ...styles[variant], ...style, borderRadius: "0.5rem", padding: "0.625rem 1.25rem" }} {...props}>
      {children}
    </button>
  );
}
```

---

## §4 - Acceptance criteria

1. `PURPLE_TOKENS` export ra object có đủ 3 lớp: primitive (ít nhất 9 giá trị purple, 2 cream), semantic (ít nhất text-primary, bg-default, border-default, accent-primary, brand-umber, brand-ochre), component (ít nhất button-primary-bg, card-border, day-cell-today-ring).
2. `PRIMITIVE["brand-umber"]` === `"#45210E"` và `PRIMITIVE["brand-ochre"]` === `"#F4BA17"` - hai giá trị này KHÔNG được thay đổi (DEC-LUNAR-090).
3. `SEMANTIC["bg-default"]` trả về giá trị kem ấm (không phải `"#FFFFFF"`); cụ thể là `PRIMITIVE["cream-50"]` = `"#FDF6EC"` hoặc tương đương (DEC-LUNAR-093).
4. `checkApca(SEMANTIC["text-primary"], SEMANTIC["bg-default"])` trả |Lc| >= 75 (body text tím đậm trên nền kem).
5. `checkApca(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"])` trả |Lc| >= 75 (chữ kem trên nút tím đậm).
6. `checkWcag(SEMANTIC["text-primary"], SEMANTIC["bg-default"])` trả ratio >= 4.5 (WCAG AA).
7. `checkWcag(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"])` trả ratio >= 4.5.
8. `assertApca(PRIMITIVE["purple-400"], SEMANTIC["bg-default"], 75)` PHẢI throw Error (tím nhạt không đủ tương phản trên kem - xác nhận gate hoạt động đúng).
9. `TYPOGRAPHY.fontFamily` chứa `"Be Vietnam Pro"` là family đầu tiên trong chuỗi font stack.
10. Component `Typography` với variant "body" không dùng đơn vị `px` cho `fontSize` trong style output (kiểm bằng inspect style object).
11. Component `Button` variant "primary" render với `backgroundColor` = `COMPONENT["button-primary-bg"]` và `color` = `COMPONENT["button-primary-text"]`.
12. Tất cả cặp màu text/nền trong SEMANTIC layer được kiểm tra trong `apca.test.ts` và đều pass Lc >= 75 (trừ text-disabled theo thiết kế).
13. `SEMANTIC["text-primary"]` trên `SEMANTIC["bg-default"]` đạt |Lc| >= 90 (NFR-Accessibility ưu tiên Lc 90 cho body text).
14. Build `packages/ui` không có TypeScript error và không dùng `!important` trong CSS output.
15. Package chỉ có một external dependency là `apca-w3`; không import React Native hay Capacitor-specific code trong `tokens.ts` và `apca.ts`.

---

## §5 - Verification

```typescript
// packages/ui/src/theme/apca.test.ts
import { checkApca, assertApca, checkWcag, assertWcag21AA } from "./apca";
import { SEMANTIC, COMPONENT, PRIMITIVE } from "./tokens";

describe("APCA color gate (DEC-LUNAR-091)", () => {
  test("text-primary tren bg-default dat APCA |Lc| >= 90 (body text dai)", () => {
    const lc = Math.abs(checkApca(SEMANTIC["text-primary"], SEMANTIC["bg-default"]));
    expect(lc).toBeGreaterThanOrEqual(90);
  });

  test("text-secondary tren bg-default dat APCA |Lc| >= 75", () => {
    const lc = Math.abs(checkApca(SEMANTIC["text-secondary"], SEMANTIC["bg-default"]));
    expect(lc).toBeGreaterThanOrEqual(75);
  });

  test("button-primary-text tren button-primary-bg dat APCA |Lc| >= 75", () => {
    const lc = Math.abs(checkApca(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"]));
    expect(lc).toBeGreaterThanOrEqual(75);
  });

  test("Tim nhat (purple-400) tren nen kem KHONG du tuong phan - gate hoat dong", () => {
    expect(() => assertApca(PRIMITIVE["purple-400"], SEMANTIC["bg-default"], 75)).toThrow("APCA fail");
  });

  test("error tren bg-default dat APCA |Lc| >= 75", () => {
    const lc = Math.abs(checkApca(SEMANTIC["error"], SEMANTIC["bg-default"]));
    expect(lc).toBeGreaterThanOrEqual(75);
  });
});

describe("WCAG AA parallel gate (DEC-LUNAR-091)", () => {
  test("text-primary tren bg-default dat WCAG AA >= 4.5:1", () => {
    expect(checkWcag(SEMANTIC["text-primary"], SEMANTIC["bg-default"])).toBeGreaterThanOrEqual(4.5);
  });

  test("button-primary-text tren button-primary-bg dat WCAG AA", () => {
    expect(checkWcag(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"])).toBeGreaterThanOrEqual(4.5);
  });

  test("assertWcag21AA throw khi tuong phan thap", () => {
    // Mau xam nhat tren trang la truong hop xau
    expect(() => assertWcag21AA(PRIMITIVE["gray-400"], PRIMITIVE["white"])).toThrow("WCAG AA fail");
  });
});

describe("Base brand tokens bao ton (DEC-LUNAR-090)", () => {
  test("brand-umber = #45210E", () => {
    expect(PRIMITIVE["brand-umber"]).toBe("#45210E");
  });

  test("brand-ochre = #F4BA17", () => {
    expect(PRIMITIVE["brand-ochre"]).toBe("#F4BA17");
  });
});

describe("Typography", () => {
  test("TYPOGRAPHY.fontFamily bat dau bang Be Vietnam Pro", () => {
    expect(TYPOGRAPHY.fontFamily.startsWith("'Be Vietnam Pro'")).toBe(true);
  });

  test("Tat ca font-size trong TYPOGRAPHY.fontSizes dung don vi rem (khong dung px)", () => {
    Object.values(TYPOGRAPHY.fontSizes).forEach(size => {
      expect(size).toMatch(/rem$/);
      expect(size).not.toMatch(/px$/);
    });
  });
});
```

---

## §6 - Implementation skeleton

API contract ở §3 là skeleton đầy đủ. Một điểm cần ghim: `sRGBtoY` trong `apca-w3` nhận mảng `[r, g, b]` theo dạng `Uint8ClampedArray` hoặc `number[]` (0-255), không phải hex string. Hàm `hexToRgbArray` trong `apca.ts` phải convert đúng trước khi truyền vào.

```typescript
// Cach dung apca-w3 dung (khong phai APCAcontrast(hex, hex)):
import { APCAcontrast, sRGBtoY } from "apca-w3";
const fg = [45, 10, 78];   // purple-900 rgb
const bg = [253, 246, 236]; // cream-50 rgb
const lc = APCAcontrast(sRGBtoY(fg as any), sRGBtoY(bg as any));
// lc ~= -92.x (am vi toi tren sang, |lc| = 92 > 90 -> PASS)
```

---

## §7 - Dependencies

Upstream: FR-LUNAR-009 không có depends_on - đây là lớp nền, có thể build độc lập. External dependency duy nhất là `apca-w3` (npm package, MIT license).

Downstream: `FR-LUNAR-010` (app shell) import token và component từ `packages/ui` để áp dụng theme toàn cục; `FR-LUNAR-014` (shareable cards) dùng `COMPONENT["day-cell-festival-dot"]` và palette tím để render thiệp export; `FR-LUNAR-016` (Zalo Mini App) dùng `PURPLE_TOKENS` làm design token.

Cross-cutting: `FR-LUNAR-007` (CalendarGrid) dùng `COMPONENT["day-cell-today-ring"]`, `"day-cell-festival-dot"`, `"day-cell-reminder-dot"` để tô màu ô ngày. Mọi component UI trong toàn bộ project phải import token từ package này thay vì hardcode hex.

---

## §8 - Example payloads

```typescript
// Ket qua khi import va dung tokens
import { SEMANTIC, COMPONENT, checkApca, checkWcag } from "@cyberskill/genie-ui";

console.log(SEMANTIC["text-primary"]);      // "#2D0A4E" (purple-900)
console.log(SEMANTIC["bg-default"]);         // "#FDF6EC" (cream-50)
console.log(COMPONENT["button-primary-bg"]); // "#3D1266" (purple-800)

const lc = Math.abs(checkApca("#2D0A4E", "#FDF6EC"));
// lc = ~93.2 -> PASS (>= 90)

const wcag = checkWcag("#2D0A4E", "#FDF6EC");
// wcag = ~14.8 -> PASS (>= 4.5)
```

```css
/* Tailwind config extension dung PURPLE_TOKENS */
/* apps/web/tailwind.config.ts */
import { PURPLE_TOKENS, TYPOGRAPHY } from "@cyberskill/genie-ui";

export default {
  theme: {
    extend: {
      colors: {
        "text-primary":    PURPLE_TOKENS["text-primary"],
        "bg-default":      PURPLE_TOKENS["bg-default"],
        "accent-primary":  PURPLE_TOKENS["accent-primary"],
        "brand-umber":     PURPLE_TOKENS["brand-umber"],
        "brand-ochre":     PURPLE_TOKENS["brand-ochre"],
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "system-ui", "sans-serif"],
      },
    },
  },
};
```

---

## §9 - Open questions

Đã giải quyết:
- Cách tổ chức 3 lớp token: primitive / semantic / component (DEC-LUNAR-094).
- Giá trị nền: `#FDF6EC` kem ấm (DEC-LUNAR-093).
- Gate APCA: dùng `apca-w3`, ngưỡng Lc >= 75 / 90 (DEC-LUNAR-091).

Còn deferred:
- Dark mode: PRD §13 không yêu cầu tường minh nhưng FR-LUNAR-007 §4 AC #15 có đề cập. Deferred - cần thiết kế palette tím dark riêng; không block Phase 1.
- CSS custom properties file: cần tạo `purple-tokens.css` từ `PURPLE_TOKENS` object để dùng với Tailwind v4 hoặc vanilla CSS. Deferred - implement khi wiring vào FR-LUNAR-010.
- Be Vietnam Pro offline bundle: trong PWA offline, cần bundle font vào `public/fonts/`. Deferred sang FR-LUNAR-010 (app shell handles service worker và font caching).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Tim nhat (purple-400) lam text chinh, tuong phan thap | `assertApca` gate trong CI | APCA fail throw | Doi sang purple-700 hoac purple-900 |
| brand-umber/ochre bi ghi de | Unit test primitive brand values | Brand vi pham DEC-LUNAR-090 | Revert token, them lint rule cam ghi de |
| Be Vietnam Pro khong load (CDN loi) | Fallback font-stack | Hien system-ui, van doc duoc | Bundle font local trong PWA (FR-010) |
| sRGBtoY nhan sai type, checkApca tra NaN | Test assert typeof === number | Gate khong hoat dong | Fix hexToRgbArray, them type assertion |
| Component Button dung !important | CSS output lint | Cascade break | Xoa !important, tang specificity selector |
| font-size px trong Typography | Unit test regex /rem$/ | Dynamic Type khong hoat dong tren iOS | Doi sang rem/em |
| PURPLE_TOKENS khong export duoc vi circular import | Build error | App shell khong import duoc | Tach primitives, semantics, components thanh 3 file |
| apca-w3 version moi thay doi API | pnpm audit / type error | checkApca loi runtime | Pin version, test sau moi update |
| Nen cream khong match DNA "warm earth" sau khi thiet ke | Design review thuc te | Sub-brand sai vibe | Dieu chinh hex trong cream-50 sau A/B test |
| Text-disabled dat APCA >= 75 (lai qua ro) | Visual review | Disabled look giong enabled | Cho phep text-disabled duoi 75 (theo APCA spec: disabled khong can dat threshold) |

---

## §11 - Implementation notes

- Gia tri `#FDF6EC` cho nen kem la diem xuat phat; nen review tren man hinh thuc te (OLED vs LCD hien thi kem khac nhau). Neu kem qua vang, dieu chinh L(lightness) tang len mot chut bang color picker, sau do chay lai APCA test.
- `APCAcontrast` tu `apca-w3` tra gia tri am khi text toi tren nen sang (dark-on-light) va duong khi text sang tren nen toi. Thi code phai dung `Math.abs(lc)` khi so sanh voi nguong 75/90.
- 3 lop token (primitive / semantic / component) nen nam trong 3 const rieng biet (khong phai 1 object phang) de TypeScript infer type chinh xac va IDE autocomplete hoat dong tot.
- `apca-w3` phai la devDependency va runtime dependency cua `packages/ui`; khong can la dependency cua `apps/web` truc tiep - import tu `@cyberskill/genie-ui`.
- Khi Tailwind v4 duoc dung (thay vi v3), config extension theo `@theme` block, khong phai `theme.extend`. FR-010 chon phien ban Tailwind; FR-009 chi export tokens, khong ket hop Tailwind cu the.
- `Button` component trong §3 dung inline `style` prop cho demo; trong thuc te production, nen dung Tailwind class hoac CSS module de CSS purge hoat dong tot hon. Day la quyet dinh FR-010 de ra.

*Hết FR-LUNAR-009.*
