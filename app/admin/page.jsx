'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '../../components/page-header';
import {
  Shield, Activity, Users, Zap, FlaskConical, SlidersHorizontal,
  Wrench, Bell, UserCog, Sparkles, ClipboardCheck,
} from 'lucide-react';
import BookLoader from '@/components/book-loader';

// The Admin Dashboard is the single hub for every admin tool — each lives behind
// a card here, so the sidebar only needs one "Admin Dashboard" entry.
const ADMIN_TOOLS = [
  { href: '/admin/users', icon: Users, title: 'People & XP', desc: "See anyone's level, badges, lessons, and XP history — and grant or deduct XP" },
  { href: '/admin/activity-log', icon: Activity, title: 'Activity Log', desc: 'Review all AI interactions, inputs, and outputs across users' },
  { href: '/admin/lesson-qa', icon: ClipboardCheck, title: 'Lesson QA', desc: 'Hidden quality review of generated lessons — scores, issues, who got them' },
  { href: '/admin/lesson-preview', icon: FlaskConical, title: 'Lesson Content Preview', desc: 'Generate and review what a lesson produces for any topic and depth' },
  { href: '/admin/skill-levels', icon: SlidersHorizontal, title: 'Skill Levels', desc: "Set each AI skill's difficulty to control who gets recommended it" },
  { href: '/admin/ai-tools', icon: Wrench, title: 'AI Tools', desc: 'Edit what each AI tool is good for' },
  { href: '/admin/avatar-preview', icon: Sparkles, title: 'Avatar Catalog', desc: 'Contact sheet of every avatar item to review how each looks' },
  { href: '/admin/xp-rules', icon: Zap, title: 'XP & Levels', desc: 'Reference: what earns XP, daily caps, and the leveling curve' },
  { href: '/admin/notifications', icon: Bell, title: 'Notifications', desc: 'Who receives Slack notifications' },
  { href: '/admin/admins', icon: UserCog, title: 'Admins', desc: 'Manage who has admin access' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false))
      .finally(() => setAdminChecked(true));
  }, []);

  if (!adminChecked) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={Shield} title="Admin Dashboard" subtitle="All your admin tools in one place" />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ADMIN_TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-brand-300 hover:shadow-card-hover transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
                <t.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink dark:text-slate-200 text-sm">{t.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
