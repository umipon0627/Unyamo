import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-0.5 text-xs font-heading font-bold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-unyamo-green text-unyamo-cream shadow-sm [a]:hover:bg-unyamo-green/90",
        secondary:
          "bg-unyamo-cream text-unyamo-ink border border-unyamo-border [a]:hover:bg-unyamo-border/50",
        destructive:
          "bg-unyamo-red/10 text-unyamo-red border border-unyamo-red/20 focus-visible:ring-unyamo-red/20 dark:bg-unyamo-red/20 dark:focus-visible:ring-unyamo-red/40 [a]:hover:bg-unyamo-red/20",
        outline:
          "border-2 border-unyamo-border text-unyamo-ink [a]:hover:bg-unyamo-cream",
        ghost:
          "hover:bg-unyamo-cream hover:text-unyamo-ink dark:hover:bg-muted/50",
        link: "text-unyamo-green underline-offset-4 hover:underline",
        gold:
          "bg-unyamo-gold text-unyamo-ink shadow-sm [a]:hover:bg-unyamo-gold/90",
        navy:
          "bg-unyamo-navy text-white shadow-sm [a]:hover:bg-unyamo-navy/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
