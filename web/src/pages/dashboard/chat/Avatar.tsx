import { useProfileViewer } from '@/components/ProfileViewer'

interface AvatarProps {
  name: string
  avatarUrl: string | null
  size?: number
  /** When set, the avatar becomes a button that opens this user's profile card. */
  userId?: string
}

export function Avatar({ name, avatarUrl, size = 38, userId }: AvatarProps) {
  const { openProfile } = useProfileViewer()
  const style = { width: size, height: size, fontSize: size * 0.4 }

  const inner = avatarUrl ? (
    <img src={avatarUrl} alt={name} style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#dfe3e9] font-semibold text-[#8b93a0] grayscale"
    >
      {name.trim().charAt(0) || '?'}
    </div>
  )

  if (!userId) return inner

  return (
    <button
      type="button"
      onClick={() => openProfile(userId)}
      className="shrink-0 rounded-full transition-opacity hover:opacity-80"
      title={name}
    >
      {inner}
    </button>
  )
}
