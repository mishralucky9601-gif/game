"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function GlassButton({
  children,
  onClick,
  variant = "default",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const variantClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-chaos-accent to-chaos-accent2 border-transparent text-white"
      : variant === "danger"
      ? "border-chaos-danger/50 text-chaos-danger hover:bg-chaos-danger/10"
      : "border-white/10 text-white hover:bg-white/5";

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className={`glass rounded-2xl px-5 py-3 font-semibold tracking-wide shadow-glass transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses} ${className}`}
    >
      {children}
    </motion.button>
  );
}
