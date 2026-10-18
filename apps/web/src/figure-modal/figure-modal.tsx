// Adapted from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/figure-modal/* @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.
//
// ColTex: one component drawn with ColTex's dialog, tabs and inputs. Sources
// are uploading from the computer (also a pasted or dropped image) and the
// project's own files; Overleaf's "from URL" and "from another project" need
// its linked files, which ColTex doesn't have. The caption and label are typed
// here instead of inserting placeholders. Inserting and updating are in
// @coltex/latex-language (figure-commands.ts).

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { EditorView } from '@codemirror/view'
import { FileImage, X } from 'lucide-react'
import {
  deleteFigure,
  editFigureData,
  editFigureDataEffect,
  figureTexts,
  FIGURE_MODAL_OPEN_EVENT,
  FIGURE_MODAL_PASTE_EVENT,
  insertFigureWith,
  labelForPath,
  uniqueLabel,
  updateFigure,
  type FigureData,
  type PastedImageData,
} from '@coltex/latex-language'
import type { FileEntry } from '@coltex/shared'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBytes } from '@/lib/format'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export type FigureSource = 'upload' | 'project'

const FIGURE_MODAL_INSERT_EVENT = 'figure-modal:open'

/** Open the modal to insert a figure (the toolbar's figure menu). */
export function openFigureModal(source: FigureSource) {
  window.dispatchEvent(new CustomEvent<{ source: FigureSource }>(FIGURE_MODAL_INSERT_EVENT, { detail: { source } }))
}

/** What pdfLaTeX, XeLaTeX and LuaLaTeX can include (svg through the svg package). */
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|pdf|eps|svg)$/i
const PREVIEWABLE = /\.(png|jpe?g|gif|svg|webp)$/i
const ACCEPT = 'image/png,image/jpeg,image/gif,application/pdf,.eps,.svg'
const ROOT = '__root__' // Radix Select has no empty value
const WIDTHS = [
  { value: '0.25', label: '1/4' },
  { value: '0.5', label: '1/2' },
  { value: '0.75', label: '3/4' },
  { value: '1', label: '' },
] as const

const joinPath = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

/** Pasted screenshots all arrive as image.png: give them a name of their own. */
function nameForPasted(name: string, type: string) {
  if (!/^image\.\w+$/.test(name)) return name
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'application/pdf' ? 'pdf' : 'png'
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  return `pasted-${stamp}.${ext}`
}

type Upload = { data: Blob; size: number; type: string }

export function FigureModal({
  getView,
  files,
  folders,
  canUpload,
  fileUrl,
  upload,
}: {
  getView: () => EditorView | null | undefined
  files: FileEntry[]
  folders: string[]
  /** Editors may upload; reviewers can still edit an existing figure (as a suggestion). */
  canUpload: boolean
  fileUrl: (path: string) => string
  upload: (path: string, data: Blob) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FigureData | null>(null)
  /** Editing: choosing another image instead of the current one. */
  const [replacing, setReplacing] = useState(false)
  const [source, setSource] = useState<FigureSource>('upload')
  const [file, setFile] = useState<Upload | null>(null)
  const [fileName, setFileName] = useState('')
  const [folder, setFolder] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [width, setWidth] = useState<number | undefined>(0.5)
  const [customSize, setCustomSize] = useState(false)
  const [withCaption, setWithCaption] = useState(true)
  const [caption, setCaption] = useState('')
  const [withLabel, setWithLabel] = useState(true)
  const [label, setLabel] = useState('')
  const [labelTouched, setLabelTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setEditing(null)
    setReplacing(false)
    setFile(null)
    setFileName('')
    setFolder('')
    setPicked(null)
    setWidth(0.5)
    setCustomSize(false)
    setWithCaption(true)
    setCaption('')
    setWithLabel(true)
    setLabel('')
    setLabelTouched(false)
    setBusy(false)
    setError(undefined)
  }, [])

  const chooseFile = useCallback((data: Blob, name: string, type: string) => {
    setFile({ data, size: data.size, type })
    setFileName(nameForPasted(name, type))
    setSource('upload')
  }, [])

  useEffect(() => {
    const onInsert = (event: Event) => {
      const { source } = (event as CustomEvent<{ source: FigureSource }>).detail
      reset()
      setSource(source === 'upload' && !canUpload ? 'project' : source)
      setOpen(true)
    }
    const onEdit = () => {
      const view = getView()
      const figure = view?.state.field(editFigureData, false)
      if (!view || !figure) return
      reset()
      const texts = figureTexts(view.state, figure)
      setEditing(figure)
      setWidth(figure.width)
      setCustomSize(Boolean(figure.unknownGraphicsArguments))
      setWithCaption(texts.caption !== null)
      setCaption(texts.caption ?? '')
      setWithLabel(texts.label !== null)
      setLabel(texts.label ?? labelForPath(figure.file.path))
      setLabelTouched(true)
      setOpen(true)
    }
    const onPaste = (event: Event) => {
      if (!canUpload) return
      const { data, name, type } = (event as CustomEvent<PastedImageData>).detail
      reset()
      chooseFile(data, name, type)
      setOpen(true)
    }
    window.addEventListener(FIGURE_MODAL_INSERT_EVENT, onInsert)
    window.addEventListener(FIGURE_MODAL_OPEN_EVENT, onEdit)
    window.addEventListener(FIGURE_MODAL_PASTE_EVENT, onPaste)
    return () => {
      window.removeEventListener(FIGURE_MODAL_INSERT_EVENT, onInsert)
      window.removeEventListener(FIGURE_MODAL_OPEN_EVENT, onEdit)
      window.removeEventListener(FIGURE_MODAL_PASTE_EVENT, onPaste)
    }
  }, [canUpload, chooseFile, getView, reset])

  const choosing = !editing || replacing
  const uploadPath = file && fileName.trim() ? joinPath(folder, fileName.trim()) : null
  /** The image the figure will show. */
  const path = !choosing ? editing!.file.path : source === 'upload' ? uploadPath : picked
  const existing = useMemo(() => new Set(files.map(f => f.path)), [files])
  const images = useMemo(() => files.filter(f => IMAGE_EXTENSIONS.test(f.path)).map(f => f.path), [files])

  // New figures get a label from the image's name until the person types one.
  useEffect(() => {
    if (labelTouched || !path) return
    const view = getView()
    setLabel(view ? uniqueLabel(view.state, labelForPath(path)) : labelForPath(path))
  }, [path, labelTouched, getView])

  // A preview of the image being uploaded.
  const [uploadPreview, setUploadPreview] = useState<string>()
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return setUploadPreview(undefined)
    const url = URL.createObjectURL(file.data)
    setUploadPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const preview =
    choosing && source === 'upload'
      ? uploadPreview
      : path && PREVIEWABLE.test(path) && existing.has(path)
        ? fileUrl(path)
        : undefined

  const close = useCallback(() => {
    const view = getView()
    if (view && view.state.field(editFigureData, false)) view.dispatch({ effects: editFigureDataEffect.of(null) })
    setOpen(false)
    window.setTimeout(() => view?.focus(), 0)
  }, [getView])

  const apply = async () => {
    const view = getView()
    if (!view || !path) return
    setBusy(true)
    setError(undefined)
    try {
      if (choosing && source === 'upload' && file) await upload(path, file.data)
      const options = {
        path,
        width: customSize ? undefined : width,
        caption: withCaption ? caption.trim() : null,
        label: withLabel && label.trim() ? label.trim() : null,
      }
      // The figure's place may have moved while the modal was open (others editing); the field follows it.
      const figure = editing ? view.state.field(editFigureData, false) : null
      if (editing && !figure) throw new Error('The figure was removed while you were editing it')
      if (figure) updateFigure(view, figure, options)
      else insertFigureWith(view, options)
      setOpen(false)
      window.setTimeout(() => view.focus(), 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    const view = getView()
    const figure = view?.state.field(editFigureData, false)
    if (view && figure) deleteFigure(view, figure)
    setOpen(false)
    window.setTimeout(() => view?.focus(), 0)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    const dropped = event.dataTransfer.files[0]
    if (dropped) chooseFile(dropped, dropped.name, dropped.type)
  }

  const title = editing ? t('Edit figure') : t('Insert figure')

  return (
    <Dialog open={open} onOpenChange={next => !next && close()}>
      <DialogContent
        className="sm:max-w-lg"
        onPaste={event => {
          // A screenshot pasted into the modal replaces the chosen file.
          const pasted = event.clipboardData.files[0]
          if (pasted && canUpload && choosing && IMAGE_EXTENSIONS.test(`.${pasted.type.split('/')[1] ?? ''}`)) {
            event.preventDefault()
            chooseFile(pasted, pasted.name, pasted.type)
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid min-w-0 gap-4">
          {!choosing ? (
            <div className="flex items-center gap-3 rounded-lg border p-2">
              {preview ? (
                <img src={preview} alt="" className="size-14 shrink-0 rounded border bg-white object-contain" />
              ) : (
                <FileImage className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{editing!.file.path}</span>
              <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>
                {t('Replace')}
              </Button>
            </div>
          ) : (
            <>
              {canUpload && (
                <Tabs value={source} onValueChange={value => setSource(value as FigureSource)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="upload">{t('Upload from computer')}</TabsTrigger>
                    <TabsTrigger value="project">{t('From project files')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              {source === 'upload' && canUpload ? (
                <div className="grid min-w-0 gap-3">
                  {file ? (
                    <div className="flex items-center gap-3 rounded-lg border p-2">
                      {preview ? (
                        <img src={preview} alt="" className="size-14 shrink-0 rounded border bg-white object-contain" />
                      ) : (
                        <FileImage className="size-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{fileName || t('Untitled')}</div>
                        <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                      </div>
                      <Button variant="ghost" size="icon-sm" aria-label={t('Remove')} onClick={() => setFile(null)}>
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="grid place-items-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted-foreground"
                      onDragOver={event => event.preventDefault()}
                      onDrop={onDrop}
                    >
                      <span>{t('Drag an image here, or paste one')}</span>
                      <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                        {t('Choose a file')}
                      </Button>
                      <span className="text-xs">{t('PNG, JPG, PDF, EPS or SVG')}</span>
                    </div>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={event => {
                      const chosen = event.target.files?.[0]
                      if (chosen) chooseFile(chosen, chosen.name, chosen.type)
                      event.target.value = ''
                    }}
                  />
                  <div className="grid grid-cols-[1fr_10rem] gap-2">
                    <div className="grid min-w-0 gap-1.5">
                      <Label htmlFor="figure-file-name">{t('File name in this project')}</Label>
                      <Input
                        id="figure-file-name"
                        value={fileName}
                        disabled={!file}
                        onChange={event => setFileName(event.target.value.replace(/\//g, ''))}
                      />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                      <Label>{t('Folder')}</Label>
                      <Select value={folder || ROOT} onValueChange={value => setFolder(value === ROOT ? '' : value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROOT}>{t('Project root')}</SelectItem>
                          {folders.map(f => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {uploadPath && existing.has(uploadPath) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t('A file with this name already exists and will be replaced.')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid min-w-0 gap-2">
                  <Command className="rounded-lg border">
                    <CommandInput placeholder={t('Search project images')} />
                    <CommandList className="max-h-48">
                      <CommandEmpty>{t('No image files in this project')}</CommandEmpty>
                      {images.map(image => (
                        <CommandItem
                          key={image}
                          value={image}
                          onSelect={() => setPicked(image)}
                          className={cn('font-mono text-xs', picked === image && 'bg-accent text-accent-foreground')}
                        >
                          <FileImage /> <span className="truncate">{image}</span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                  {preview && <img src={preview} alt="" className="max-h-32 justify-self-center rounded border bg-white object-contain" />}
                </div>
              )}
              {editing && (
                <Button variant="link" size="sm" className="justify-self-start px-0" onClick={() => setReplacing(false)}>
                  {t('Keep the current image')}
                </Button>
              )}
            </>
          )}

          <div className="grid gap-1.5">
            <Label>{t('Image width')}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={customSize || width === undefined ? '' : String(width)}
              onValueChange={value => value && setWidth(Number(value))}
              disabled={customSize}
              className="w-full"
            >
              {WIDTHS.map(w => (
                <ToggleGroupItem key={w.value} value={w.value} className="flex-1">
                  {w.label || t('Full width')}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {customSize
                ? t('The figure uses a custom size in the LaTeX code; edit it there.')
                : t('A share of the text width.')}
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={withCaption} onCheckedChange={value => setWithCaption(value === true)} />
              {t('Caption')}
            </Label>
            {withCaption && (
              <Input value={caption} placeholder={t('Describe the figure')} onChange={event => setCaption(event.target.value)} />
            )}
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={withLabel} onCheckedChange={value => setWithLabel(value === true)} />
              {t('Label')}
              <span className="text-xs text-muted-foreground">{t('for \\ref{…} elsewhere in the document')}</span>
            </Label>
            {withLabel && (
              <Input
                value={label}
                className="font-mono text-xs"
                onChange={event => {
                  setLabelTouched(true)
                  setLabel(event.target.value)
                }}
              />
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          {editing ? (
            <Button variant="ghost" className="text-destructive" onClick={remove}>
              {t('Delete figure')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              {t('Cancel')}
            </Button>
            <Button disabled={!path || busy} onClick={() => void apply()}>
              {editing ? t('Save') : t('Insert')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
