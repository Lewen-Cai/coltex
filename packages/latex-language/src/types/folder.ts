// ColTex: the subset of Overleaf's file-tree `Folder` type used by include completions.

export type FileItem = { name: string }

export type Folder = {
  name: string
  docs: FileItem[]
  fileRefs: FileItem[]
  folders: Folder[]
}
