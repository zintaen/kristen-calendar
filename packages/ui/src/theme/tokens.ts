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
  "card-shadow":             "0 1px 4px rgba(91, 33, 182, 0.08)",  // purple-700 #5B21B6 = rgb(91,33,182)

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
