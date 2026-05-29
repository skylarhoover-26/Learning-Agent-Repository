'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Zap, Trophy, Star, RotateCcw, Save, Check } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { getProfileClient, saveProfile } from '@/lib/profile-client';

const TIER_LABELS = {
  beginner: { label: 'Beginner', emoji: '🌱', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  practitioner: { label: 'Practitioner', emoji: '🚀', color: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  power_user: { label: 'Power User', emoji: '⚡', color: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200' },
  builder: { label: 'Builder', emoji: '🏗️', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  developer: { label: 'Developer', emoji: '🛠️', color: 'bg-slate-100 text-ink ring-1 ring-slate-300' },
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
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const p = getProfileClient();
    if (!p) {
      router.push('/onboarding');
      return;
    }
    setProfile(p);
    setEditName(p.display_name || '');
  }, [router]);

  function handleSaveName() {
    const trimmed = editName.trim();
    if (!trimmed || !profile) return;
    const updated = { ...profile, display_name: trimmed };
    saveProfile(updated);
    setProfile(updated);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }

  function handleReset() {
    document.cookie = 'learner_profile=; path=/; max-age=0';
    router.push('/onboarding');
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg-warm">
        <PageHeader icon={User} title="Profile" subtitle="Loading..." />
        <div className="max-w-3xl mx-auto px-6 py-12 text-center text-slate-500">
          Loading profile...
        </div>
      </div>
    );
  }

  const tier = TIER_LABELS[profile.tier] || TIER_LABELS.beginner;
  const initial = (profile.display_name || 'L').charAt(0).toUpperCase();
  const nameChanged = editName.trim() !== profile.display_name;

  return (
    <div className="min-h-screen bg-bg-warm">
      <PageHeader icon={User} title="Profile & Settings" subtitle="Manage your learning profile" />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* A. Profile Card */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-brand to-brand-700 mb-4">
            <span className="text-4xl font-bold text-white">{initial}</span>
          </div>
          <h2 className="text-2xl font-bold text-ink tracking-tight mb-1">
            {profile.display_name}
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            {profile.department}
            {profile.sub_team ? ` — ${profile.sub_team}` : ''}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${tier.color}`}>
              <span>{tier.emoji}</span>
              {tier.label}
            </span>
          </div>
          {profile.goal && (
            <p className="text-sm text-slate-500 mb-2">
              Goal: {profile.goal}
            </p>
          )}
          {profile.onboarded_at && (
            <p className="text-xs text-slate-400">
              Member since {formatDate(profile.onboarded_at)}
            </p>
          )}
        </div>

        {/* B. Edit Name */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
          <h3 className="font-semibold text-ink mb-4">Edit Name</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && nameChanged) handleSaveName();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
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

        {/* C. Learning Stats */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
          <h3 className="font-semibold text-ink mb-4">Learning Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Zap} label="Sessions" value="0" />
            <StatCard icon={Star} label="XP" value="0" />
            <StatCard icon={Trophy} label="Level" value="1" />
            <StatCard icon={Trophy} label="Badges" value="0" />
          </div>
        </div>

        {/* D. Reset / Sign Out */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
          <h3 className="font-semibold text-ink mb-2">Danger Zone</h3>
          <p className="text-sm text-slate-500 mb-4">
            Resetting your profile will clear all your settings and send you back to onboarding.
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-200 font-semibold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-bg-warm rounded-xl border border-slate-100 p-4 text-center">
      <Icon className="w-5 h-5 text-brand mx-auto mb-2" />
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
