import { Project } from '@/lib/types';
import { ProjectCard } from './ProjectCard';

interface ProjectGridProps {
  projects: (Project & { rows?: { done: boolean }[] })[];
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}

export function ProjectGrid({ projects, onArchive, onDelete }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-tertiary text-sm">No projects here yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
