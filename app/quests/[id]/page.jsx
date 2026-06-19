'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QUESTS } from '@/lib/quest-data';
import BookLoader from '@/components/book-loader';

// Project Quests are now AI-generated and played through the lesson flow's build
// engine. This route just resolves the (legacy) quest id to its topic and
// redirects, so old links and the gallery's featured cards keep working.
export default function QuestRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const quest = QUESTS.find((q) => q.id === params.id);
    if (quest) {
      router.replace(`/lesson?format=project_quest&mode=read&topic=${encodeURIComponent(quest.title)}`);
    } else {
      router.replace('/quests');
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <BookLoader message="Setting up your project…" size="lg" />
    </div>
  );
}
