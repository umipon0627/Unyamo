import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[14px] border-2 border-unyam-border bg-unyam-surface px-4 py-2 text-base text-unyam-ink transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-unyam-ink placeholder:text-unyam-ink-muted/60 focus-visible:border-unyam-green-base focus-visible:ring-3 focus-visible:ring-unyam-green-base/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-unyam-cream/50 disabled:opacity-50 aria-invalid:border-unyam-red aria-invalid:ring-3 aria-invalid:ring-unyam-red/20 dark:bg-card dark:border-border dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring dark:focus-visible:ring-ring/50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
