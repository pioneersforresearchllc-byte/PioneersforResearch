interface AvatarProps {
  name: string
  avatarUrl: string | null
  size?: number
}

export function Avatar({ name, avatarUrl, size = 38 }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#dfe3e9] font-semibold text-[#8b93a0] grayscale"
    >
      {name.trim().charAt(0) || '?'}
    </div>
  )
}
