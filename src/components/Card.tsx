import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
    className?: string
    onClick?: () => void
}

export default function Card({ children, className = '', onClick }: Props) {
    return <div className={`card ${className}`} onClick={onClick}>{children}</div>
}
