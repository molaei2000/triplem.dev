import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

// Synced to the triplem.dev brand: ink/gold/hairline roles from main.css.
// Typography lives in `size` (not the base) so the `label` size can use `.eyebrow`.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg transition-[color,background-color,border-color,opacity] duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 [&_.iconify]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        ink:
          "bg-foreground text-background hover:opacity-90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-hairline-strong text-subtle hover:border-gold-line hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-subtle hover:text-foreground",
        quiet:
          "text-subtle hover:text-gold",
        link: "gold-link rounded-none text-foreground",
      },
      size: {
        "default": "h-10 px-4 text-sm font-medium",
        "sm": "h-8 gap-1.5 px-3 text-sm font-medium",
        "lg": "h-11 px-5 text-base font-medium",
        "label": "eyebrow h-11 px-4 md:h-10",
        "inline": "h-auto gap-1.5 px-0 text-[15px]",
        "icon": "size-10 [&_.iconify]:size-4.5",
        "icon-lg": "size-11 [&_.iconify]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
