import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "soft" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  default: "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(232,93,63,0.24)] hover:bg-[#d64f35]",
  soft: "border border-[#ffd9b8] bg-[#fff0dc] text-[#9c3e28] hover:bg-[#ffe2c2]",
  outline: "border border-[#ead7bd] bg-[#fffaf2] text-foreground shadow-sm hover:bg-[#fff0dc]",
  ghost: "text-[#b9472f] hover:bg-[#fff0dc]",
  danger: "bg-destructive text-destructive-foreground hover:bg-[#a95036]",
};

const sizes = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />;
}
