import Link from 'next/link';
import { projects } from '../data/home';

// "building" section: renders the projects from home.ts as compact rows
// (name + blurb + external link label), matching the mockup. Server-safe.
export default function ProjectsRow() {
  return (
    <section className="section-block">
      <div className="section-head">
        <span className="section-label">building</span>
        <Link href="/projects" className="section-more">
          all projects &rarr;
        </Link>
      </div>

      <div>
        {projects.map((project) => (
          <a
            key={project.name}
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            className="build-row"
          >
            <span className="build-name">{project.name}</span>
            <span className="build-desc">{project.blurb}</span>
            <span className="section-more flex-shrink-0">{project.linkLabel}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
