import * as React from 'react'
import { cn } from '../../lib/utils' // 使用相对路径

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'primary'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, children, variant = 'default', ...props }, ref) => {
        return (
            <button
                className={cn(
                    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'h-10 px-4 py-2',
                    variant === 'default' && [
                        'bg-black text-white hover:bg-black/90',
                        'dark:bg-white dark:text-black dark:hover:bg-white/90',
                    ],
                    variant === 'outline' && [
                        'border border-current',
                        'hover:bg-black/10 dark:hover:bg-white/10',
                    ],
                    variant === 'primary' && [
                        'bg-primary text-primary-foreground hover:bg-primary/90', // 确保你的 Tailwind 配置包含 primary 颜色
                    ],
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </button>
        )
    }
)
Button.displayName = 'Button'

export { Button }
