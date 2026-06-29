interface Props {
  value: number   // 0~100
  color?: string
  height?: number
}

export default function ProgressBar({ value, color = 'var(--accent)', height = 6 }: Props) {
  return (
    <div className="progress-track" style={{ height }}>
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color, height }}
      />
    </div>
  )
}
