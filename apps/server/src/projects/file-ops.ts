import type { Deps } from '../deps.ts'
import type { ReferenceService } from '../references/service.ts'
import type { LinkedFileService } from './linked-files.ts'
import type { ProjectService } from './service.ts'

/**
 * Deleting and moving files on someone's behalf (AI agents with full access),
 * the way the file routes do it: inside `collab.mutate`, with everything that
 * follows a path (main document, Zotero links, linked files) kept in step.
 * Callers record the change (`history.noteChange`) and take the checkpoint.
 */
export type FileOpsDeps = Pick<Deps, 'store' | 'collab'> & {
  projects: Pick<ProjectService, 'followMove' | 'touch'>
  references: Pick<ReferenceService, 'followMove'>
  linkedFiles: Pick<LinkedFileService, 'followMove' | 'forget'>
}

/** Delete a file or a folder with everything in it; NotFound for neither. */
export async function deletePath(d: FileOpsDeps, projectId: string, path: string): Promise<{ folder: boolean }> {
  const { folders } = await d.store.listTree(projectId)
  const folder = folders.includes(path)
  await d.collab.mutate(projectId, async () => {
    if (folder) await d.store.deleteFolder(projectId, path)
    else {
      await d.store.readFile(projectId, path) // NotFound rather than rm -f
      await d.store.deleteFile(projectId, path)
    }
    await d.linkedFiles.forget(projectId, path)
    await d.collab.afterDelete(projectId, path)
  })
  await d.projects.touch(projectId)
  return { folder }
}

/** Move or rename a file or folder; never overwrites. */
export async function movePath(d: FileOpsDeps, projectId: string, from: string, to: string): Promise<void> {
  await d.collab.mutate(projectId, async () => {
    await d.store.move(projectId, from, to)
    await d.projects.followMove(projectId, from, to)
    await d.references.followMove(projectId, from, to)
    await d.linkedFiles.followMove(projectId, from, to)
    await d.collab.afterMove(projectId, from, to)
  })
  await d.projects.touch(projectId)
}
