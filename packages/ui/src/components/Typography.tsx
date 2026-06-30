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
