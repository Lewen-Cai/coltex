import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { FileText, Users } from 'lucide-react'
import type { ProjectSummary } from '@coltex/shared'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { timeAgo } from '@/lib/format'
import { plural, t, tk } from '@/lib/i18n'
import { ProjectActions, ProjectTags } from './project-actions'

export const ENGINE_LABEL = { pdflatex: 'pdfLaTeX', xelatex: 'XeLaTeX', lualatex: 'LuaLaTeX' } as const
/** Translate at render: `t(ROLE_LABEL[role])`. */
export const ROLE_LABEL = { owner: tk('Owner'), editor: tk('Can edit'), reviewer: tk('Can review'), viewer: tk('Can view') } as const

/** Deterministic, pleasant hue per project for the card header: blues to indigos. */
function hue(id: string): number {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return 200 + (hash % 70)
}

// The gradient reads the hue from `--hue`, so dark mode can swap in deeper tones.
const HEADER =
  'bg-[linear-gradient(135deg,oklch(0.93_0.05_var(--hue)),oklch(0.85_0.1_calc(var(--hue)_+_25)))] ' +
  'dark:bg-[linear-gradient(135deg,oklch(0.34_0.07_var(--hue)),oklch(0.27_0.1_calc(var(--hue)_+_25)))]'

export function ProjectCard({ project, index = 0 }: { project: ProjectSummary; index?: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.25 }}
      whileHover={{ y: -3 }}
    >
      <Card className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-lg hover:shadow-primary/10">
        <a href={`#/project/${project.id}`} className="absolute inset-0 z-0" aria-label={t('Open {name}', { name: project.name })} />
        <div className={`relative h-24 overflow-hidden ${HEADER}`} style={{ '--hue': hue(project.id) } as CSSProperties}>
          {/* A sheet of paper peeking out: the project as a document. */}
          <div className="absolute bottom-0 left-5 h-16 w-28 translate-y-3 rounded-t-md bg-white/90 p-2 shadow-sm dark:bg-slate-300/80 transition-transform duration-300 group-hover:translate-y-1">
            <div className="mb-1.5 h-1.5 w-14 rounded-full bg-slate-300 dark:bg-slate-500" />
            <div className="mb-1 h-1 w-20 rounded-full bg-slate-200 dark:bg-slate-400/80" />
            <div className="mb-1 h-1 w-16 rounded-full bg-slate-200 dark:bg-slate-400/80" />
            <div className="h-1 w-18 rounded-full bg-slate-200 dark:bg-slate-400/80" />
          </div>
          {/* Only a compiler someone chose; 'auto' needs no label. */}
          {project.engine !== 'auto' && (
            <Badge variant="secondary" className="absolute top-3 right-3 bg-white/80 backdrop-blur dark:bg-background/60">
              {ENGINE_LABEL[project.engine]}
            </Badge>
          )}
        </div>
        <div className="relative z-10 grid gap-3 p-4 pointer-events-none">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{project.name}</div>
              <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <FileText className="size-3" /> {project.rootFile}
              </div>
            </div>
            <div className="pointer-events-auto -mr-1 -mt-1">
              <ProjectActions project={project} />
            </div>
          </div>
          <div className="pointer-events-auto -mx-1 -my-0.5">
            <ProjectTags project={project} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar id={project.ownerId} name={project.ownerName} className="size-5 text-[11px]" />
            <span className="truncate">{project.role === 'owner' ? t('You') : project.ownerName}</span>
            <span>·</span>
            <span className="truncate">{timeAgo(project.updatedAt)}</span>
            {project.memberCount > 1 && (
              <span className="ml-auto flex items-center gap-1" title={plural(project.memberCount, '{n} person has access', '{n} people have access')}>
                <Users className="size-3.5" /> {project.memberCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
