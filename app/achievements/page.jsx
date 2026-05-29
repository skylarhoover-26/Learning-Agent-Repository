import Link from 'next/link';
import { ArrowLeft, Award, Sparkles } from 'lucide-react';
import { getCurrentLearner, getTotalXp, getLevelProgress, getEarnedBadges, getAllBadgesWithEarnedStatus } from '@/lib/data';

export default function AchievementsPage() {
  const learner = getCurrentLearner();
  const totalXp = getTotalXp(learner.id);
  const levelProgress = getLevelProgress(totalXp);
  const allBadges = getAllBadgesWithEarnedStatus(learner.id);

  return (
    <div className="min-h-screen">
      <header className="bg-ink sticky top-0 z-10 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <Award className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-[17px] leading-tight">Achievements</h1>
              <p className="text-xs text-white/60">Your progress and badges</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-gradient-to-br from-cta-400 to-cta-600 rounded-2xl p-8 mb-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/20 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
            <span className="text-4xl font-bold text-ink">{levelProgress.level}</span>
          </div>
          <h2 className="text-2xl font-bold text-ink mb-1">Level {levelProgress.level}</h2>
          <p className="text-ink/70 mb-4">{totalXp.toLocaleString()} XP total</p>
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 rounded-full"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-ink">{levelProgress.xpToNext} XP to go</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-ink mb-4">Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allBadges.map(badge => (
            <div
              key={badge.id}
              className={`bg-white rounded-2xl border p-5 text-center transition-all ${
                badge.earned
                  ? 'border-cta-200 shadow-card'
                  : 'border-slate-200 opacity-50 grayscale'
              }`}
            >
              <div className="text-4xl mb-2">{badge.emoji}</div>
              <h4 className="font-bold text-ink text-sm mb-1">{badge.name}</h4>
              <p className="text-xs text-slate-500">{badge.description}</p>
              {badge.earned && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-cta-700 font-medium">
                  <Sparkles className="w-3 h-3" />
                  Earned
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
