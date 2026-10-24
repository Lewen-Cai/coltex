import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAvatarHues } from '@/lib/avatar-colors'
import { userColor } from '@/lib/collab'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/** A person's initials on their collaboration colour (the same colour as their cursor). */
export function UserAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  useAvatarHues()
  return (
    // The initials scale with the avatar (40% of its width, through a container query), so a
    // large one doesn't show small letters; never below what can be read.
    <Avatar className={cn('@container size-8', className)} title={name}>
      <AvatarFallback className="text-[max(10px,40cqw)] leading-none font-semibold text-white" style={{ background: userColor(id) }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
