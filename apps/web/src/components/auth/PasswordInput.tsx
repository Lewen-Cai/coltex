import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { t } from '@/lib/i18n'

export function PasswordInput(props: ComponentProps<typeof InputGroupInput>) {
  const [shown, setShown] = useState(false)
  return (
    <InputGroup className="h-10 bg-card">
      <InputGroupInput {...props} type={shown ? 'text' : 'password'} />
      <InputGroupAddon>
        <Lock />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" onClick={() => setShown(v => !v)} aria-label={shown ? t('Hide password') : t('Show password')}>
          {shown ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
