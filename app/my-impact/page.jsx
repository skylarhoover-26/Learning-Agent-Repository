'use client';

import PageHeader from '@/components/page-header';
import { BarChart3 } from 'lucide-react';
import AiImpactPanel from '@/components/ai-impact-panel';

// "My Impact" — the AI Impact self-assessment, reached from the profile dropdown.
// (Formerly the AI Impact tab of the retired "My Growth" page.) Still writes
// ai_impact_scores, which the Manager Dashboard reads.
export default function MyImpactPage() {
  return (
    <div className="min-h-screen">
      <PageHeader icon={BarChart3} title="My Impact" subtitle="Measure how AI is changing your work" />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10">
        <AiImpactPanel />
      </main>
    </div>
  );
}
