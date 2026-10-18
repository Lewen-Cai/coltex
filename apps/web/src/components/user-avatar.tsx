import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { userColor } from '@/lib/collab'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/** A person's initials on their collaboration colour (the same colour as their cursor). */
export function UserAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  return (
    <Avatar className={cn('size-8', className)} title={name}>
      <AvatarFallback className="text-xs font-semibold text-white" style={{ background: userColor(id) }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
