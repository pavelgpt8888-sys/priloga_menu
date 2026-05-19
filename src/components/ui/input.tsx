import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("min-h-11 w-full rounded-xl border border-input bg-white px-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground", className)} {...props} />;
}
