"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode, CSSProperties } from "react";

type ButtonProps = {
  variant?: "contained" | "outlined" | "text" | "ai";
  size?: "sm" | "md" | "lg";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
};

export function Button({
  variant = "contained",
  size = "md",
  startIcon,
  endIcon,
  children,
  onClick,
  disabled,
  style,
}: ButtonProps) {
  const cls =
    `hcp-btn hcp-btn--${variant}` +
    (size === "sm" ? " hcp-btn--sm" : size === "lg" ? " hcp-btn--lg" : "");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={style}>
      {startIcon}
      <span>{children}</span>
      {endIcon}
    </button>
  );
}

type ChipProps = {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "ai";
  icon?: ReactNode;
};

export function Chip({ children, variant = "default", icon }: ChipProps) {
  return (
    <span
      className={
        "hcp-chip" + (variant !== "default" ? ` hcp-chip--${variant}` : "")
      }
    >
      {icon}
      {children}
    </span>
  );
}

type AvatarProps = {
  initials: string;
  size?: number;
  color?: string;
};

export function Avatar({ initials, size = 32, color = "#0E6FBE" }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

type IconProps = {
  icon: LucideIcon;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
};

export function Icon({ icon: I, size = 20, color, style, className }: IconProps) {
  return <I size={size} color={color} style={style} className={className} />;
}
