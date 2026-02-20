import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        secondary:
          "border-transparent bg-[#1e293b] text-cyan-400 border border-cyan-500/20",
        destructive:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        outline: "text-cyan-400 border-cyan-500/30",
        success: "border-transparent bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        warning: "border-transparent bg-amber-500/15 text-amber-400 border border-amber-500/20",
        info: "border-transparent bg-blue-500/15 text-blue-400 border border-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
