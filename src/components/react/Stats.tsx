import React from 'react'
import type { ComponentType } from 'react'
import { Badge } from './Badge' // Assuming Badge is in the same react directory
import { MoveUpRight, MoveDownLeft } from './Icons' // Assuming Icons are in the same react directory

// Define the type for a single stat item
type StatIconProps = { className?: string }
type StatIconType = ComponentType<StatIconProps>

type StatItem = {
    icon: StatIconType
    value: string
    change: string
    changeType: 'increase' | 'decrease'
    label: string
}

// Define the props for the Stats component
export interface StatsProps {
    badgeText?: string
    title?: string
    description?: string
    stats?: StatItem[]
}

const defaultStats: StatItem[] = [
    {
        icon: MoveUpRight,
        value: '125,000',
        change: '+15.3%',
        changeType: 'increase',
        label: 'Monthly page views',
    },
    {
        icon: MoveUpRight,
        value: '45,230',
        change: '+8.7%',
        changeType: 'increase',
        label: 'Unique visitors',
    },
    {
        icon: MoveDownLeft,
        value: '1:45',
        change: '-0.5%',
        changeType: 'decrease',
        label: 'Avg. time on page',
    },
    {
        icon: MoveUpRight,
        value: '3,250',
        change: '+22.4%',
        changeType: 'increase',
        label: 'Newsletter subscribers',
    },
]

const StatsReact: React.FC<StatsProps> = ({
    badgeText = 'Traffic Stats',
    title = 'Our Blog Performance',
    description = "Track our blog's growth and engagement metrics. We're proud of our increasing readership and the vibrant community we're building together.",
    stats = defaultStats,
}) => {
    return (
        <div className="w-full py-16">
            <div className="container mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="flex gap-4 flex-col items-start">
                        <div>
                            {/* Ensure Badge component is compatible with client:visible */}
                            <Badge>{badgeText}</Badge>
                        </div>
                        <div className="flex gap-2 flex-col">
                            <h2 className="text-xl md:text-3xl md:text-4xl tracking-tighter lg:max-w-xl font-regular text-left">
                                {title}
                            </h2>
                            <p className="text-lg lg:max-w-sm leading-relaxed tracking-tight text-muted-foreground text-left">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-center items-center">
                        <div className="grid text-left grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 w-full gap-2">
                            {stats.map((stat: StatItem, index: number) => {
                                const IconComponent = stat.icon
                                const iconColorClass =
                                    stat.changeType === 'increase'
                                        ? 'text-primary'
                                        : 'text-destructive'
                                return (
                                    <div
                                        key={index}
                                        className="flex gap-0 flex-col justify-between p-6 border rounded-md"
                                    >
                                        <IconComponent
                                            className={`w-4 h-4 mb-10 ${iconColorClass}`}
                                        />
                                        <h2 className="text-4xl tracking-tighter max-w-xl text-left font-regular flex flex-row gap-4 items-end">
                                            {stat.value}
                                            <span className="text-muted-foreground text-sm tracking-normal">
                                                {stat.change}
                                            </span>
                                        </h2>
                                        <p className="text-base leading-relaxed tracking-tight text-muted-foreground max-w-xl text-left">
                                            {stat.label}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StatsReact
