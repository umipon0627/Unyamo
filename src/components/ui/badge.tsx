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
          "bg-unyam-green text-unyam-cream shadow-sm [a]:hover:bg-unyam-green/90",
        secondary:
          "bg-unyam-cream text-unyam-ink border border-unyam-border [a]:hover:bg-unyam-border/50",
        destructive:
          "bg-unyam-red/10 text-unyam-red border border-unyam-red/20 focus-visible:ring-unyam-red/20 dark:bg-unyam-red/20 dark:focus-visible:ring-unyam-red/40 [a]:hover:bg-unyam-red/20",
        outline:
          "border-2 border-unyam-border text-unyam-ink [a]:hover:bg-unyam-cream",
        ghost:
          "hover:bg-unyam-cream hover:text-unyam-ink dark:hover:bg-muted/50",
        link: "text-unyam-green underline-offset-4 hover:underline",
        gold:
          "bg-unyam-gold text-unyam-ink shadow-sm [a]:hover:bg-unyam-gold/90",
        navy:
          "bg-unyam-navy text-white shadow-sm [a]:hover:bg-unyam-navy/90",
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
