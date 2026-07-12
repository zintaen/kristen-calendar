---
id: FR-LUNAR-009
title: "Purple style pack - purple sub-brand extending the CyberSkill design system (override color tokens, keep structure), Be Vietnam Pro, APCA contrast gate Lc >= 75"
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
  - DEC-LUNAR-090 (the purple style pack is a sub-brand extension, does NOT replace the base CyberSkill brand Umber #45210E / Ochre #F4BA17; it only overrides color tokens, keeping the spacing/typography/component token structure intact)
  - DEC-LUNAR-091 (every text/background color pair must reach APCA Lc >= 75 measured by apca-w3 before ship; prefer Lc 90 for body text >= 18px/400 weight; WCAG 2.x AA 4.5:1 runs in parallel as a legal-safety net)
  - DEC-LUNAR-092 (the sole typography is Be Vietnam Pro, imported from Google Fonts or bundled locally; it is the CyberSkill typeface, with full Vietnamese diacritic support)
  - DEC-LUNAR-093 (a warm background (warm cream bg, ~#FDF6EC or equivalent) is chosen as the default background instead of pure white #FFFFFF to harmonize with the CyberSkill "warm earth" DNA; deep purple on cream reaches a better APCA than light purple on white)
  - "DEC-LUNAR-094 (the purple pack color tokens are organized in 3 layers: primitive (raw hex), semantic (UI role: text, bg, border, accent), component (button-primary-bg etc.); the semantic and component layers override the CyberSkill base primitive layer)"
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
  - "replacing Umber #45210E or Ochre #F4BA17 in the base brand tokens (violates DEC-LUNAR-090)"
  - "using light purple (Lc < 75) as the main text color on the cream background (violates DEC-LUNAR-091 / NFR-Accessibility)"
  - "importing a font other than Be Vietnam Pro as the main typography (violates DEC-LUNAR-092)"
effort_hours: 8
sub_tasks:
  - "1.5h: tokens.ts - define the 3 token layers (primitive, semantic, component) with full values"
  - "1.0h: apca.ts - the checkApca(fg, bg) function including apca-w3, assert Lc >= 75; checkWcag(fg, bg) WCAG AA"
  - "1.0h: apca.test.ts - check each text/background pair in the palette, assert both APCA and WCAG"
  - "1.0h: Typography.tsx - standard text component with Be Vietnam Pro, Dynamic Type scale"
  - "1.0h: Button.tsx - primary/secondary/ghost with purple tokens, APCA-safe"
  - "1.0h: Card.tsx - a card with a purple border, padding, light shadow on the cream background"
  - "1.0h: CSS variables / Tailwind config extension for the purple tokens"
  - "0.5h: index.ts - centralized export, check the build"
risk_if_skipped: "Without design tokens, every component of FR-010 (app shell), FR-007 (grid), FR-014 (cards) picks its own colors, leading to inconsistency. Without the APCA gate, the UI can ship with low contrast, violating NFR-Accessibility."
---

## §1 - Description (BCP-14 normative)

This module **MUST** build the purple style pack as a sub-brand extension of the CyberSkill design system, sufficient for the entire "Genie Am Lich" UI to use unified tokens and meet the APCA contrast standard.

1. **MUST** organize tokens in 3 layers: primitive (raw hex values), semantic (UI role: text, background, border, accent, error), component (per-component such as button-primary-bg, card-border) - this structure is kept from the CyberSkill design system, overriding only the color values (DEC-LUNAR-094).
2. **MUST NOT** replace or override the base CyberSkill brand tokens `--color-brand-umber: #45210E` and `--color-brand-ochre: #F4BA17`; these two tokens are kept intact and may be used in the footer or logo (DEC-LUNAR-090).
3. **MUST** define the purple palette with at least: `purple-900` (the darkest purple, for main text), `purple-700` (mid purple, for secondary text and buttons), `purple-500` (mid-light purple, accent), `purple-200` (light purple, subtle border), `purple-50` (very light purple, hover state) as CSS variables and TypeScript constants.
4. **MUST** define `--color-bg-default: #FDF6EC` (warm cream) as the default background instead of `#FFFFFF`, to harmonize with the CyberSkill "warm earth" DNA and improve APCA on cream over white (DEC-LUNAR-093).
5. **MUST** provide the function `checkApca(fgHex: string, bgHex: string): number` returning the (signed) APCA Lc value using the `apca-w3` library; and the function `assertApca(fgHex, bgHex, minLc: number)` throwing an Error if `|Lc| < minLc` (DEC-LUNAR-091).
6. **MUST** provide the function `checkWcag(fgHex: string, bgHex: string): number` returning the WCAG 2.x contrast ratio; and the function `assertWcag21AA(fgHex, bgHex)` throwing an Error if ratio < 4.5 (DEC-LUNAR-091).
7. **MUST** have an automated test suite checking each text/background color pair in the palette, ensuring APCA Lc >= 75 for body text and WCAG AA >= 4.5:1 (DEC-LUNAR-091, NFR-Accessibility).
8. **MUST** use only **Be Vietnam Pro** as the main typeface; import from the Google Fonts CDN in production or bundle locally for the offline PWA; define the font scale: `font-size-xs` (12px), `font-size-sm` (14px), `font-size-base` (16px), `font-size-lg` (18px), `font-size-xl` (20px), `font-size-2xl` (24px), `font-size-3xl` (30px) (DEC-LUNAR-092).
9. **MUST** support Dynamic Type on iOS by using `rem` or `em` instead of `px` for font-size in the components; and test that the `Typography` component does not use hardcoded `px` for font-size (NFR-Accessibility).
10. **MUST** provide a `Typography` component with variants: `heading-1`, `heading-2`, `heading-3`, `body`, `body-small`, `caption`; each variant uses the correct font-size and font-weight token.
11. **MUST** provide a `Button` component with variants: `primary` (deep purple background, cream text), `secondary` (purple border, cream background), `ghost` (no border, purple text); each variant **MUST** reach APCA Lc >= 75 between the text and background.
12. **MUST** provide a `Card` component with a soft purple style (faint purple border, cream background, light shadow), suitable for wrapping occasion and reminder content.
13. **MUST** export all tokens as the TypeScript object `PURPLE_TOKENS` for Tailwind config, CSS-in-JS, or a `style` prop to use directly; and also export them as CSS custom properties in a `.css` file for use with Tailwind.
14. **MUST NOT** use `!important` to override; the CSS cascade order must be enough for the purple tokens to win without `!important`.
15. **SHOULD** ensure long body text (`body` variant, >= 18px/400 weight) reaches APCA Lc >= 90 per NFR-Accessibility "prefer Lc 90 for long passages".
16. **SHOULD** provide the color `--color-error: #B91C1C` (deep red) reaching APCA Lc >= 75 on the cream background, for use in form validation.

---

## §2 - Why this design (rationale for humans)

**Why a sub-brand extension, not a separate theme (DEC-LUNAR-090)?** If we create a wholly separate design system for "Genie Am Lich", then later when CyberSkill updates spacing, component APIs, or the typography scale, we would have to sync two systems in parallel. Keeping the token structure intact and overriding only the color values lets "Genie Am Lich" inherit every spacing and component update from the base design system automatically.

**Why keep Umber #45210E and Ochre #F4BA17 (DEC-LUNAR-090)?** These two colors are the CyberSkill brand identity - used in the logo and official brand materials. Removing them from the tokens would break the ability to render the CyberSkill logo in the correct color in the footer or about screen. The purple pack is the sub-brand of a specific product, not a replacement for the whole brand.

**Why APCA Lc >= 75 instead of just WCAG AA (DEC-LUNAR-091)?** WCAG 2.x uses a non-linear contrast formula and gives poor results with mid-tone purple. PRD §5 and §13 specify APCA Lc >= 75 because APCA reflects real readability more accurately. WCAG AA (4.5:1) still runs in parallel to meet the legal requirement (many organizations still require WCAG 2.x).

**Why the cream background `#FDF6EC` instead of white (DEC-LUNAR-093)?** Deep purple on cream reaches a higher APCA than deep purple on pure white because cream has a lower luminance than white, increasing the contrast. More importantly, warm cream fits the CyberSkill "warm earth" DNA and creates a warm, intimate feeling close to the tone of rituals - fitting the persona of Chi Linh.

**Why 3 token layers (DEC-LUNAR-094)?** The primitive layer is the raw value (hex). The semantic layer is meaning (text-primary, bg-default). The component layer is a specific binding (button-primary-bg = semantic text-primary, card-border = semantic border-subtle). The semantic layer is the most important - when the button color needs to change, only one semantic token changes and every component using that token updates automatically.

**Why Be Vietnam Pro (DEC-LUNAR-092)?** This is the official CyberSkill typeface, with full Unicode support for Vietnamese (including the hoi/nga/huyen/sac/nang tone marks on both uppercase and lowercase). Using Be Vietnam Pro ensures lunar dates such as "Mung Mot thang Gieng" display with correct diacritics on every device, independent of the system font.

**Why `apca-w3` instead of computing by hand?** The APCA formula is not simple - it uses gamma correction and an S-curve nonlinearity. The `apca-w3` library is the official implementation from W3C/APCA, reducing the risk of miscomputation. An automated gate in CI blocks shipping low-contrast colors.

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

1. `PURPLE_TOKENS` exports an object with all 3 layers: primitive (at least 9 purple values, 2 cream), semantic (at least text-primary, bg-default, border-default, accent-primary, brand-umber, brand-ochre), component (at least button-primary-bg, card-border, day-cell-today-ring).
2. `PRIMITIVE["brand-umber"]` === `"#45210E"` and `PRIMITIVE["brand-ochre"]` === `"#F4BA17"` - these two values MUST NOT be changed (DEC-LUNAR-090).
3. `SEMANTIC["bg-default"]` returns a warm cream value (not `"#FFFFFF"`); specifically `PRIMITIVE["cream-50"]` = `"#FDF6EC"` or equivalent (DEC-LUNAR-093).
4. `checkApca(SEMANTIC["text-primary"], SEMANTIC["bg-default"])` returns |Lc| >= 75 (deep purple body text on the cream background).
5. `checkApca(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"])` returns |Lc| >= 75 (cream text on the deep purple button).
6. `checkWcag(SEMANTIC["text-primary"], SEMANTIC["bg-default"])` returns ratio >= 4.5 (WCAG AA).
7. `checkWcag(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"])` returns ratio >= 4.5.
8. `assertApca(PRIMITIVE["purple-400"], SEMANTIC["bg-default"], 75)` **MUST** throw an Error (light purple does not have enough contrast on cream - confirming the gate works correctly).
9. `TYPOGRAPHY.fontFamily` contains `"Be Vietnam Pro"` as the first family in the font stack.
10. The `Typography` component with the "body" variant does not use the `px` unit for `fontSize` in the style output (checked by inspecting the style object).
11. The `Button` component "primary" variant renders with `backgroundColor` = `COMPONENT["button-primary-bg"]` and `color` = `COMPONENT["button-primary-text"]`.
12. All text/background color pairs in the SEMANTIC layer are checked in `apca.test.ts` and all pass Lc >= 75 (except text-disabled by design).
13. `SEMANTIC["text-primary"]` on `SEMANTIC["bg-default"]` reaches |Lc| >= 90 (NFR-Accessibility prefers Lc 90 for body text).
14. Building `packages/ui` has no TypeScript error and does not use `!important` in the CSS output.
15. The package has only one external dependency, `apca-w3`; does not import React Native or Capacitor-specific code in `tokens.ts` and `apca.ts`.

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

The API contract in §3 is a full skeleton. One point to pin down: `sRGBtoY` in `apca-w3` takes an `[r, g, b]` array as a `Uint8ClampedArray` or `number[]` (0-255), not a hex string. The `hexToRgbArray` function in `apca.ts` must convert correctly before passing it in.

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

Upstream: FR-LUNAR-009 has no depends_on - it is a foundation layer, buildable independently. The only external dependency is `apca-w3` (npm package, MIT license).

Downstream: `FR-LUNAR-010` (app shell) imports tokens and components from `packages/ui` to apply the theme globally; `FR-LUNAR-014` (shareable cards) uses `COMPONENT["day-cell-festival-dot"]` and the purple palette to render exported cards; `FR-LUNAR-016` (Zalo Mini App) uses `PURPLE_TOKENS` as design tokens.

Cross-cutting: `FR-LUNAR-007` (CalendarGrid) uses `COMPONENT["day-cell-today-ring"]`, `"day-cell-festival-dot"`, `"day-cell-reminder-dot"` to color the day cells. Every UI component across the whole project must import tokens from this package instead of hardcoding hex.

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

Resolved:
- How to organize the 3 token layers: primitive / semantic / component (DEC-LUNAR-094).
- Background value: `#FDF6EC` warm cream (DEC-LUNAR-093).
- APCA gate: use `apca-w3`, threshold Lc >= 75 / 90 (DEC-LUNAR-091).

Still deferred:
- Dark mode: PRD §13 does not require it explicitly but FR-LUNAR-007 §4 AC #15 mentions it. Deferred - a separate dark purple palette needs designing; does not block Phase 1.
- CSS custom properties file: a `purple-tokens.css` generated from the `PURPLE_TOKENS` object is needed for use with Tailwind v4 or vanilla CSS. Deferred - implemented when wiring into FR-LUNAR-010.
- Be Vietnam Pro offline bundle: in the offline PWA, the font needs bundling into `public/fonts/`. Deferred to FR-LUNAR-010 (the app shell handles the service worker and font caching).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Light purple (purple-400) used as main text, low contrast | `assertApca` gate in CI | APCA fail throws | Switch to purple-700 or purple-900 |
| brand-umber/ochre overwritten | Unit test on the primitive brand values | Brand violates DEC-LUNAR-090 | Revert the token, add a lint rule forbidding the overwrite |
| Be Vietnam Pro does not load (CDN error) | Fallback font-stack | Shows system-ui, still readable | Bundle the font locally in the PWA (FR-010) |
| sRGBtoY gets the wrong type, checkApca returns NaN | Test asserting typeof === number | Gate does not work | Fix hexToRgbArray, add a type assertion |
| The Button component uses !important | CSS output lint | Cascade break | Remove !important, increase selector specificity |
| px font-size in Typography | Unit test regex /rem$/ | Dynamic Type does not work on iOS | Switch to rem/em |
| PURPLE_TOKENS cannot be exported due to a circular import | Build error | The app shell cannot import it | Split primitives, semantics, components into 3 files |
| A new apca-w3 version changes the API | pnpm audit / type error | checkApca errors at runtime | Pin the version, test after each update |
| The cream background does not match the "warm earth" DNA after design | Real design review | Wrong sub-brand vibe | Adjust the hex in cream-50 after an A/B test |
| Text-disabled reaches APCA >= 75 (too clear) | Visual review | Disabled looks like enabled | Allow text-disabled below 75 (per the APCA spec: disabled need not meet the threshold) |

---

## §11 - Implementation notes

- The value `#FDF6EC` for the cream background is a starting point; it should be reviewed on a real screen (OLED vs LCD display cream differently). If the cream is too yellow, adjust the L (lightness) up a little with a color picker, then rerun the APCA test.
- `APCAcontrast` from `apca-w3` returns a negative value when text is dark on a light background (dark-on-light) and positive when text is light on a dark background. So the code must use `Math.abs(lc)` when comparing against the 75/90 threshold.
- The 3 token layers (primitive / semantic / component) should live in 3 separate consts (not 1 flat object) so TypeScript infers the type accurately and IDE autocomplete works well.
- `apca-w3` must be both a devDependency and a runtime dependency of `packages/ui`; it need not be a direct dependency of `apps/web` - import from `@cyberskill/genie-ui`.
- When Tailwind v4 is used (instead of v3), the config extension follows the `@theme` block, not `theme.extend`. FR-010 chooses the Tailwind version; FR-009 only exports tokens, without coupling to a specific Tailwind version.
- The `Button` component in §3 uses an inline `style` prop for the demo; in real production, use a Tailwind class or CSS module so that CSS purge works better. This is a decision for FR-010 to make.

*End of FR-LUNAR-009.*
