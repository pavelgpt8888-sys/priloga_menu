import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "soft" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  default: "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(63,125,82,0.22)] hover:bg-[#326a43]",
  soft: "border border-[#cfe0cf] bg-[#edf7ed] text-[#285f3b] hover:bg-[#deedde]",
  outline: "border border-[#dccdb8] bg-[#fffdf6] text-foreground shadow-sm hover:bg-[#fff2cf]",
  ghost: "text-[#326a43] hover:bg-[#edf7ed]",
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
