import React from "react";
import { COMPONENT } from "../theme/tokens";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, style, ...props }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: COMPONENT["card-bg"],
        border: `1px solid ${COMPONENT["card-border"]}`,
        boxShadow: COMPONENT["card-shadow"],
        borderRadius: "0.75rem",
        padding: "1.25rem",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
