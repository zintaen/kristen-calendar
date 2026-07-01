import React from "react";
import { COMPONENT } from "../theme/tokens";

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
