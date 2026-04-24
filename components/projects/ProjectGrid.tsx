import { Project } from '@/lib/types';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectGrid.module.css';

interface ProjectGridProps {
  projects: (Project & { rows?: { done: boolean }[] })[];
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}

export function ProjectGrid({ projects, onArchive, onDelete }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No projects here yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onArchive={() => onArchive(project.id, !project.archived)}
          onDelete={() => onDelete(project.id)}
        />
      ))}
    </div>
  );
}
