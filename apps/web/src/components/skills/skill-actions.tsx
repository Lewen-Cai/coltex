import { useRef, type ChangeEvent, type ReactNode } from 'react'
import { FileUp, FolderUp, Upload } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import type { SkillsHandle } from './use-skills'

/**
 * Import skills (files or a folder). There is no "New skill": people write
 * skills with the AI agent or bring ones they have (user's decision
 * 2026-10-23). `trigger` replaces the default Import button.
 */
export function SkillActions({ skills, trigger, align = 'start' }: { skills: SkillsHandle; trigger?: ReactNode; align?: 'start' | 'end' }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) void skills.importFiles(files)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={skills.importing}>
          {trigger ?? (
            <Button size="sm" variant="outline">
              {skills.importing ? <Spinner /> : <Upload />} {t('Import')}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <FileUp /> {t('Upload files')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => folderInput.current?.click()}>
            <FolderUp /> {t('Upload folder')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* A SKILL.md with its reference files, a zip, or a folder of one or more skills. */}
      <input ref={fileInput} type="file" multiple className="hidden" onChange={pick} />
      <input ref={folderInput} type="file" className="hidden" onChange={pick} {...{ webkitdirectory: '' }} />
    </>
  )
}
