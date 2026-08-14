'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Zap, Trophy, Star, RotateCcw, Save, Check,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import Avatar from '@/components/avatar';
import AvatarLocker from '@/components/avatar-locker';
import { useChampions } from '@/components/champion-provider';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import RoleManagerCard from '@/components/role-manager-card';

const TIER_LABELS = {
  beginner: { label: 'Beginner', emoji: '🌱', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  practitioner: { label: 'Practitioner', emoji: '🚀', color: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  power_user: { label: 'Power User', emoji: '⚡', color: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200' },
  builder: { label: 'Builder', emoji: '🏗️', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  developer: { label: 'Developer', emoji: '🛠️', color: 'bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 ring-1 ring-slate-300' },
};

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

export default function ProfilePage() {
  return <CinematicFrame><ProfilePageInner /></CinematicFrame>;
}

function ProfilePageInner() {
  const router = useRouter();
  const { profile: ctxProfile, updateProfile, isLoading: profileLoading } = useProfile();
  const { crownTier } = useChampions();
  // Gates the whole Danger Zone. actingAsAdmin, NOT isAdmin: actingAsAdmin is
  // `isAdmin && !previewAsUser`, so "Viewing as a regular user" hides these the way
  // it hides the Manager and Admin sections. Gating on isAdmin left both reset
  // buttons on screen while previewing, which is precisely what an admin uses that
  // mode to check.
  const { actingAsAdmin } = useMenuVisibility();
  // Live progression stats (XP, level, badges, lessons) so the cards below reflect
  // real progress instead of static placeholders. Re-reads on every XP award via
  // the provider's xp-bus subscription, so leveling up updates here immediately.
  const { totalXp, level, badgesEarned, lessonHistory } = useProgression();
  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showProgressConfirm, setShowProgressConfirm] = useState(false);

  useEffect(() => {
    if (profileLoading) return;
    if (!ctxProfile) {
      router.push('/onboarding');
      return;
    }
    setProfile(ctxProfile);
    setEditName(ctxProfile.display_name || '');
  }, [ctxProfile, profileLoading, router]);

  async function handleSaveName() {
    const trimmed = editName.trim();
    if (!trimmed || !profile) return;
    const updated = { ...profile, display_name: trimmed };
    try {
      await updateProfile(updated);
      setProfile(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save name:', error);
    }
  }

  // Wipe this person server-side, through the one route that does it properly:
  // blob + Supabase (XP is stored as ROWS there, so it has to be deleted, not
  // written over) + a reset epoch so their OTHER devices clear themselves too.
  //
  // Both resets used to be browser-only. "Reset progress" made no server call at
  // all, and the full reset deleted only the profile — so the blob and Supabase
  // kept every XP event, and the next page load pulled it all straight back and
  // re-uploaded it. Clearing localStorage alone cannot reset anything that syncs.
  //
  // The Danger Zone is admin-only (feedback #147), which is why calling the admin
  // route here is not a privilege problem — and it takes the email explicitly, so
  // it resets the person looking at the page rather than whoever is signed in.
  async function resetOnServer(mode) {
    const email = profile?.email;
    if (!email) return;
    try {
      const res = await fetch('/api/admin/reset-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mode }),
      });
      // A 404 means there was nothing stored to clear — fine, carry on and clear
      // the browser. Anything else is a real failure worth surfacing, because a
      // reset that half-worked is the thing that wastes an afternoon.
      if (!res.ok && res.status !== 404) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || `Reset failed (${res.status})`);
      }
    } catch (error) {
      console.error('Server-side reset failed:', error);
      window.alert('Your progress could not be reset on the server, so it would come back on your next visit. Nothing has been changed — please try again.');
      throw error;
    }
  }

  async function handleReset() {
    // 1. Wipe everything server-side so nothing can re-hydrate afterwards.
    try {
      await resetOnServer('full');
    } catch {
      return; // already reported; leave their data alone rather than half-reset
    }
    // 2. Clear all learning state held in this browser (XP, levels, badges,
    //    quests, lessons, goals, calibration, tutorial flag, cached profile).
    try {
      const prefixes = [
        // `la_calibrated_<email>` is the device-local "already calibrated" marker
        // the calibration gate honors alongside the server's calibrated_at. It
        // must be cleared on reset, or the gate stays satisfied and the user is
        // never re-calibrated after re-onboarding.
        'lp_', 'learner_', 'ai_impact_', 'calibration_', 'la_calibrated', 'tutorial_completed',
        // Not prefixed like the others, so it needs naming explicitly — otherwise
        // the earned difficulty level survives the wipe and syncs itself back.
        'adaptive_level',
      ];
      Object.keys(localStorage)
        .filter((k) => prefixes.some((p) => k === p || k.startsWith(p)))
        .forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.error('Failed to clear local state:', error);
    }
    // 3. Send the user back through onboarding from a clean slate.
    window.location.href = '/onboarding';
  }

  // Lighter reset: clear learning progress (XP, badges, lessons, modules,
  // quests, calibration, impact) but KEEP the profile/role — so the user stays
  // on the dashboard and does NOT go back through onboarding.
  async function handleResetProgress() {
    try {
      await resetOnServer('progress');
    } catch {
      return; // already reported
    }
    try {
      const prefixes = ['lp_', 'learner_', 'ai_impact_', 'calibration_', 'la_calibrated', 'tutorial_completed', 'adaptive_level'];
      const keep = new Set(['learner_profile']); // the role/tasks/level cache
      Object.keys(localStorage)
        .filter((k) => !keep.has(k) && prefixes.some((p) => k === p || k.startsWith(p)))
        .forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.error('Failed to clear progress:', error);
    }
    // Back to the dashboard with a clean slate; profile/role stays intact.
    window.location.href = '/';
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader icon={User} title="Profile" subtitle="Loading..." />
        <div className="max-w-3xl mx-auto px-6 pt-6 pb-12 text-center text-slate-500 dark:text-slate-400">
          Loading profile...
        </div>
      </div>
    );
  }

  const tier = TIER_LABELS[profile.tier] || TIER_LABELS.beginner;
  const nameChanged = editName.trim() !== profile.display_name;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader icon={User} title="Profile & Settings" subtitle="Manage your learning profile" />

      <main className="max-w-3xl mx-auto px-6 pt-6 pb-8 space-y-6">
        {/* A. Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 mb-4 ring-1 ring-slate-200 dark:ring-slate-700">
            <Avatar
              avatar={profile.avatar}
              size={80}
              crown={crownTier(resolveLearnerId(profile))}
              title={profile.display_name}
            />
          </div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-1">
            {profile.display_name}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {profile.department}
            {profile.sub_team ? ` — ${profile.sub_team}` : ''}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${tier.color}`}>
              <span>{tier.emoji}</span>
              {tier.label}
            </span>
          </div>
          {(profile.goals?.length || profile.goal) && (
            <div className="mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1.5">
                {profile.goals?.length > 1 ? 'Goals' : 'Goal'}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {(profile.goals?.length ? profile.goals : [profile.goal]).map((g) => (
                  <span key={g} className="px-2.5 py-1 rounded-full bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-slate-200 text-xs">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.onboarded_at && (
            <p className="text-xs text-slate-400">
              Member since {formatDate(profile.onboarded_at)}
            </p>
          )}
        </div>

        {/* A2. Avatar Locker */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-1 flex items-center gap-2">
            <Star className="w-4 h-4 text-cta-500" />
            Avatar Locker
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Mix and match what you&apos;ve unlocked. Level up and earn badges to unlock more — outfits, accessories, and sidekicks.
          </p>
          <AvatarLocker />
        </div>

        {/* B. Edit Name */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-4">Edit Name</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && nameChanged) handleSaveName();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
              placeholder="Your name"
            />
            <button
              onClick={handleSaveName}
              disabled={!nameChanged || !editName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
          {saveStatus === 'saved' && (
            <p className="text-sm text-green-600 mt-2">Name updated successfully.</p>
          )}
        </div>

        {/* B2. Role & Tasks — the whole role manager, including experience
            level, goals, scheduling a change for a later date, and reverting to
            a previous role. Those used to live only on /my-role, which meant the
            page you happened to open decided what you could change. /my-role now
            redirects here. See components/role-manager-card.jsx. */}
        <RoleManagerCard />

        {/* C. Learning Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-4">Learning Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Zap} label="Lessons" value={lessonHistory.length} />
            <StatCard icon={Star} label="XP" value={totalXp.toLocaleString()} />
            <StatCard icon={Trophy} label="Level" value={level} />
            <StatCard icon={Trophy} label="Badges" value={badgesEarned.length} />
          </div>
        </div>

        {/* D. Reset — admin only, both of them (feedback #147).
            Neither reset is self-service now that we are live: wiping your own XP
            and history is a support action, same as wiping the whole profile. A
            learner who wants to change department, team or tasks uses Edit on the
            Role & Tasks card above, which is on this page already.
            The card is hidden entirely rather than disabled, so a non-admin never
            sees a control they cannot use. */}
        {actingAsAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-2">Danger Zone</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Admin only. Learners do not see this section.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Just want to change your department, team, or tasks? Use{' '}
            <span className="font-medium text-ink dark:text-slate-200">Change role</span> on the
            Role &amp; Tasks card above instead — it keeps everything.
          </p>

          {/* Reset progress only — keeps the profile, no re-onboarding. */}
          <div className="mb-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              <span className="font-medium text-ink dark:text-slate-200">Reset progress only</span> — clears your XP, badges, lessons, quests, and assessments but keeps your role and tasks. You stay on the home screen.
            </p>
            {!showProgressConfirm ? (
              <button
                onClick={() => setShowProgressConfirm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Reset progress only
              </button>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                  Clear your progress but keep your role and tasks? You won&apos;t need to onboard again.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetProgress}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
                  >
                    Yes, reset progress
                  </button>
                  <button
                    onClick={() => setShowProgressConfirm(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            <span className="font-medium text-ink dark:text-slate-200">Reset profile (full)</span> — clears all settings and progress and sends you back through onboarding.
          </p>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-100 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Profile
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 mb-3">
                Are you sure? This will reset your profile and you'll need to go through onboarding again.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-all"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-bg-warm dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 p-4 text-center">
      <Icon className="w-5 h-5 text-brand mx-auto mb-2" />
      <p className="text-2xl font-bold text-ink dark:text-slate-200">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
