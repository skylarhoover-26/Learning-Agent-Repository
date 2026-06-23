import PageHeader from '@/components/page-header';
import UseCaseLibrary from '@/components/use-case-library';
import { Library } from 'lucide-react';

// The Use Case Library is its own screen (split out from /discover).
export default function LibraryPage() {
  return (
    <div className="min-h-screen">
      <PageHeader icon={Library} title="Library" subtitle="Browse what AI can actually do for your work" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <UseCaseLibrary />
      </main>
    </div>
  );
}
