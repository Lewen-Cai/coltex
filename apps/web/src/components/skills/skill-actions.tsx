import { useRef, type ChangeEvent } from 'react'
import { FileUp, FolderUp, Plus, Upload } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import type { SkillsHandle } from './use-skills'

/** Import (files or a folder) and New skill. */
export function SkillActions({ skills, onNew, align = 'start' }: { skills: SkillsHandle; onNew: () => void; align?: 'start' | 'end' }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) void skills.importFiles(files)
  }

  const importMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={skills.importing}>
          {skills.importing ? <Spinner /> : <Upload />} {t('Import')}
        </Button>
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
  )
  const newButton = (
    <Button size="sm" onClick={onNew}>
      <Plus /> {t('New skill')}
    </Button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {align === 'end' ? (
        <>
          {importMenu}
          {newButton}
        </>
      ) : (
        <>
          {newButton}
          {importMenu}
        </>
      )}
      {/* A SKILL.md with its reference files, a zip, or a folder of one or more skills. */}
      <input ref={fileInput} type="file" multiple className="hidden" onChange={pick} />
      <input ref={folderInput} type="file" className="hidden" onChange={pick} {...{ webkitdirectory: '' }} />
    </div>
  )
}
