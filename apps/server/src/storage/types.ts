import type { ProjectTree } from '@coltex/shared'

/**
 * Where project source files live. Project metadata and permissions are in
 * the database; this interface only deals with files. Drivers: local disk
 * (`local.ts`, the default) and S3-compatible buckets (`s3.ts`).
 */
export interface ProjectStore {
  /** Create a project directory with initial files and (possibly empty) folders. */
  createProject(id: string, files: Map<string, string | Buffer>, folders?: Iterable<string>): Promise<void>
  deleteProject(id: string): Promise<void>

  /** All files plus all folders (including empty ones). */
  listTree(id: string): Promise<ProjectTree>
  readFile(id: string, filePath: string): Promise<Buffer>
  /** With `createOnly`, fails with ConflictError if the path already exists. */
  writeFile(id: string, filePath: string, content: Buffer | string, opts?: { createOnly?: boolean }): Promise<void>
  deleteFile(id: string, filePath: string): Promise<void>
  createFolder(id: string, folderPath: string): Promise<void>
  /** Recursive. */
  deleteFolder(id: string, folderPath: string): Promise<void>
  /** Move or rename a file or folder. Never overwrites; fails with ConflictError instead. */
  move(id: string, from: string, to: string): Promise<void>
  /**
   * Bring the copy the compiler reads (`DATA_DIR/projects/<id>`) up to date.
   * The local driver keeps the files there already.
   */
  syncForCompile(id: string): Promise<void>
}
