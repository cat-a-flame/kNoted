'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Project } from '@/lib/types';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  project: Project & { rows?: { done: boolean }[] };
  onArchive: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onArchive, onDelete }: ProjectCardProps) {
  const rows = project.rows ?? [];
  const done = rows.filter((r) => r.done).length;
  const total = rows.length;

  return (
    <div className={styles.card}>
      <Link href={`/projects/${project.id}`} className={styles.coverLink}>
        {project.cover_url ? (
          <Image
            src={project.cover_url}
            alt={project.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <CoverPlaceholder />
        )}
      </Link>

      <div className={styles.body}>
        <div className={styles.meta}>
          <Link href={`/projects/${project.id}`} className={styles.info}>
            <h3 className={styles.projectName}>{project.name}</h3>
            <p className={styles.rowCount}>{done} / {total} rows</p>
          </Link>
        </div>
        <ProgressBar value={done} max={total || 1} className={styles.progress} />
      </div>
    </div>
  );
}
