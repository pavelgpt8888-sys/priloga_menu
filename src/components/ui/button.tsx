import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "soft" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-[#436f50]",
  soft: "bg-[#EAF4EC] text-[#2F5F3D] hover:bg-[#dcebdd]",
  outline: "border border-border bg-white text-foreground hover:bg-[#FFF3D6]",
  ghost: "text-[#4F7C5D] hover:bg-[#EAF4EC]",
  danger: "bg-destructive text-destructive-foreground hover:bg-[#ad573b]",
};

const sizes = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />;
}
