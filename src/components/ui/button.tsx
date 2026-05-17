import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-heading text-sm font-bold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-95 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-unyamo-green text-unyamo-cream shadow-[0_4px_14px_-4px_rgba(30,107,77,0.45)] hover:bg-unyamo-green/90 hover:shadow-[0_6px_18px_-4px_rgba(30,107,77,0.55)] hover:scale-[1.03]",
        outline:
          "border-2 border-unyamo-border bg-unyamo-surface text-unyamo-ink shadow-[0_3px_10px_-4px_rgba(40,30,20,0.15)] hover:bg-unyamo-cream hover:border-unyamo-ink-muted hover:scale-[1.03]",
        secondary:
          "bg-unyamo-navy text-white shadow-[0_4px_14px_-4px_rgba(42,66,99,0.45)] hover:bg-unyamo-navy/90 hover:scale-[1.03]",
        ghost:
          "text-unyamo-ink-muted hover:bg-unyamo-cream hover:text-unyamo-ink aria-expanded:bg-unyamo-cream aria-expanded:text-unyamo-ink",
        destructive:
          "bg-unyamo-red/10 text-unyamo-red border border-unyamo-red/20 hover:bg-unyamo-red/20 hover:scale-[1.03] focus-visible:border-unyamo-red/40 focus-visible:ring-unyamo-red/20 dark:bg-unyamo-red/20 dark:hover:bg-unyamo-red/30",
        link: "rounded-none text-unyamo-green underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-6 gap-1 rounded-full px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-full px-4 text-[0.8rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-7 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 rounded-full",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
