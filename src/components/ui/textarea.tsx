import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-24 w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground", className)} {...props} />;
}
