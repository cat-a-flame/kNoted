'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Project } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ContextMenu } from './ContextMenu';

interface ProjectCardProps {
  project: Project & { rows?: { done: boolean }[] };
  onArchive: () => void;
  onDelete: () => void;
}

function CoverPlaceholder() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#F0EDE8] to-[#DFF0EC] flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#9BBFBA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="11" />
        <path d="M5 16c4-5 8-7 11-7s7 2 11 7" />
        <path d="M5 16c4 5 8 7 11 7s7-2 11-7" />
        <path d="M16 5c-3 4-3 8-3 11s0 7 3 11" />
        <path d="M16 5c3 4 3 8 3 11s0 7-3 11" />
      </svg>
    </div>
  );
}

export function ProjectCard({ project, onArchive, onDelete }: ProjectCardProps) {
  const rows = project.rows ?? [];
  const done = rows.filter((r) => r.done).length;
  const total = rows.length;
  const allDone = total > 0 && done === total;

  const badgeVariant = project.archived ? 'archived' : allDone ? 'done' : 'inProgress';

  return (
    <div className="bg-surface border border-black/[0.09] rounded-lg overflow-hidden hover:border-black/[0.17] transition-colors group">
      <Link href={`/projects/${project.id}`} className="block relative w-full h-32">
        {project.cover_url ? (
          <Image
            src={project.cover_url}
            alt={project.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <CoverPlaceholder />
        )}
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
            <h3 className="font-serif text-base font-semibold text-text-primary truncate leading-snug">
              {project.name}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {done} / {total} rows
            </p>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={badgeVariant} />
            <ContextMenu
              items={[
                {
                  label: project.archived ? 'Unarchive' : 'Archive',
                  onClick: onArchive,
                },
                {
                  label: 'Delete',
                  onClick: onDelete,
                  variant: 'danger',
                },
              ]}
            />
          </div>
        </div>
        <ProgressBar value={done} max={total || 1} className="mt-3" />
      </div>
    </div>
  );
}
