import * as React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variantClasses = {
        default:
            'border-transparent bg-primary text-primary-foreground hover:bg-primary/80', // 确保 Tailwind 配置中有 primary
        secondary:
            'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80', // 确保 Tailwind 配置中有 secondary
        destructive:
            'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80', // 确保 Tailwind 配置中有 destructive
        outline: 'text-foreground', // 确保 Tailwind 配置中有 foreground
    }

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', // 确保 Tailwind 配置中有 ring
                variantClasses[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
