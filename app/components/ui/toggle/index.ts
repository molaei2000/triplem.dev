import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Toggle } from "./Toggle.vue"

// Synced to the triplem.dev brand: "on" is gold, everything else is hairline + subtle text.
export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:ring-ring/50 focus-visible:ring-3 outline-none transition-[color,background-color,border-color] duration-300 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-subtle hover:text-foreground data-[state=on]:text-foreground",
        outline:
          "border border-hairline-strong text-subtle hover:border-gold-line hover:text-foreground data-[state=on]:border-gold data-[state=on]:bg-gold data-[state=on]:text-on-gold",
        // Graph node: `data-related` marks neighbours of the selected node.
        node:
          "rounded-md border border-hairline-strong bg-background text-subtle hover:text-foreground data-[related]:border-gold-line data-[related]:text-foreground data-[state=on]:border-gold data-[state=on]:bg-gold data-[state=on]:text-on-gold",
        chip:
          "rounded-full border border-hairline-strong text-subtle hover:text-foreground data-[state=on]:border-gold-line data-[state=on]:bg-gold-soft data-[state=on]:text-gold",
      },
      size: {
        default: "h-10 min-w-10 px-3 text-sm font-medium",
        sm: "h-8 min-w-8 px-2 text-sm font-medium",
        lg: "h-11 min-w-11 px-3.5 text-[15px]",
        label: "eyebrow h-11 px-4 md:h-10",
        chip: "eyebrow px-3.5 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>
