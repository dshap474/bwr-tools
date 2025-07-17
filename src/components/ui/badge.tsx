import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-500/80",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-500/80",
        gradient:
          "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
        shimmer:
          "border-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white shimmer bg-size-200 animate-shimmer",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

// Status Badge Component
const StatusBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    status: "online" | "offline" | "away" | "busy"
    showDot?: boolean
  }
>(({ className, status, showDot = true, children, ...props }, ref) => {
  const statusConfig = {
    online: { variant: "success" as const, label: "Online" },
    offline: { variant: "secondary" as const, label: "Offline" },
    away: { variant: "warning" as const, label: "Away" },
    busy: { variant: "destructive" as const, label: "Busy" },
  }

  const config = statusConfig[status]

  return (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant: config.variant }), "gap-1.5", className)}
      {...props}
    >
      {showDot && (
        <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children || config.label}
    </div>
  )
})
StatusBadge.displayName = "StatusBadge"

// Feature Badge Component
const FeatureBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode
    pulse?: boolean
  }
>(({ className, icon, pulse = false, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      badgeVariants({ variant: "gradient" }),
      "gap-1.5",
      pulse && "animate-pulse-slow",
      className
    )}
    {...props}
  >
    {icon && <span className="h-3 w-3">{icon}</span>}
    {children}
  </div>
))
FeatureBadge.displayName = "FeatureBadge"

// Animated Counter Badge
const CounterBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    count: number
    maxCount?: number
    showZero?: boolean
  }
>(({ className, count, maxCount = 99, showZero = false, ...props }, ref) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()
  
  if (count === 0 && !showZero) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        badgeVariants({ variant: "destructive", size: "sm" }),
        "min-w-[1.25rem] h-5 px-1 justify-center animate-scale-in",
        className
      )}
      {...props}
    >
      {displayCount}
    </div>
  )
})
CounterBadge.displayName = "CounterBadge"

// Version Badge Component
const VersionBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    version: string
    type?: "stable" | "beta" | "alpha" | "deprecated"
  }
>(({ className, version, type = "stable", ...props }, ref) => {
  const typeConfig = {
    stable: { variant: "default" as const, prefix: "v" },
    beta: { variant: "warning" as const, prefix: "β" },
    alpha: { variant: "destructive" as const, prefix: "α" },
    deprecated: { variant: "secondary" as const, prefix: "⚠" },
  }

  const config = typeConfig[type]

  return (
    <div
      ref={ref}
      className={cn(
        badgeVariants({ variant: config.variant, size: "sm" }),
        "font-mono",
        className
      )}
      {...props}
    >
      {config.prefix}{version}
    </div>
  )
})
VersionBadge.displayName = "VersionBadge"

export {
  Badge,
  badgeVariants,
  StatusBadge,
  FeatureBadge,
  CounterBadge,
  VersionBadge,
}