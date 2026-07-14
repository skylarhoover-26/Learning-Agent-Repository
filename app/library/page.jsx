'use client';

import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import UseCaseLibrary from '@/components/use-case-library';
import { Library } from 'lucide-react';

// The Use Case Library is its own screen (split out from /discover).
export default function LibraryPage() {
  return <CinematicFrame><LibraryPageInner /></CinematicFrame>;
}

function LibraryPageInner() {
  return (
    <div className="min-h-screen">
      <PageHeader icon={Library} title="Library" subtitle="Browse what AI can actually do for your work" />
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <CinematicPageHero
          eyebrow="Library"
          title="Browse what AI can do for your work"
          subtitle="Real, ready-to-use AI use cases grouped by category — each with a copy-paste prompt you can use right now, or try as a guided lesson."
          icon={Library}
          gradient
        />
        <UseCaseLibrary />
      </main>
    </div>
  );
}
