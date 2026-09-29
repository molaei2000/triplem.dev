import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Badge } from "./Badge.vue"

// Synced to the triplem.dev brand: square-ish hairline tags, mono/eyebrow type.
export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded border px-2.5 py-1.5 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground text-xs font-medium [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground text-xs font-medium [a&]:hover:bg-secondary/90",
        destructive:
         "border-transparent bg-destructive text-white text-xs font-medium [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "eyebrow border-hairline-strong [a&]:hover:border-gold-line",
        mono:
          "border-hairline font-mono text-[11px] tracking-[0.06em] text-subtle",
        gold:
          "eyebrow border-gold-line px-2 py-1 text-gold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
