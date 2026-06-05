'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  GitBranch, ArrowRight, Clock, Sparkles, Lock, Unlock, ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import { useProgression } from '@/components/progression-provider';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';
import {
  GRAPH_NODES, GRAPH_EDGES, CATEGORY_COLORS,
  computeLayout, findRecommendedNext, getPathTo, getUnlockedBy,
} from '@/lib/skill-graph-data';

function getMasteryColor(mastery) {
  if (mastery >= 70) return '#22c55e';
  if (mastery >= 40) return '#3b82f6';
  if (mastery >= 20) return '#f59e0b';
  return '#94a3b8';
}

function getMasteryLabel(mastery) {
  if (mastery >= 70) return 'Strong';
  if (mastery >= 40) return 'Developing';
  if (mastery >= 20) return 'Emerging';
  return 'Not started';
}

function EdgePath({ fromPos, toPos, nodeWidth, nodeHeight, highlighted, dimmed }) {
  const startX = fromPos.x;
  const startY = fromPos.y + nodeHeight / 2;
  const endX = toPos.x;
  const endY = toPos.y - nodeHeight / 2;
  const midY = (startY + endY) / 2;

  const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={highlighted ? '#6366f1' : '#cbd5e1'}
      strokeWidth={highlighted ? 2.5 : 1.5}
      strokeDasharray={dimmed ? '4 4' : 'none'}
      opacity={dimmed ? 0.3 : highlighted ? 1 : 0.5}
      markerEnd={highlighted ? 'url(#arrow-active)' : 'url(#arrow)'}
    />
  );
}

function GraphNode({
  node, pos, nodeWidth, nodeHeight,
  isSelected, isRecommended, isOnPath, isDimmed,
  onClick,
}) {
  const catColor = CATEGORY_COLORS[node.category];
  const masteryColor = getMasteryColor(node.mastery);
  const rx = pos.x - nodeWidth / 2;
  const ry = pos.y - nodeHeight / 2;

  return (
    <g
      onClick={() => onClick(node.id)}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`${node.name}: ${node.mastery}% mastery`}
    >
      {isRecommended && (
        <rect
          x={rx - 4} y={ry - 4}
          width={nodeWidth + 8} height={nodeHeight + 8}
          rx={14} fill="none"
          stroke="#22c55e" strokeWidth={2}
          opacity={0.6}
        >
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
        </rect>
      )}

      {isSelected && (
        <rect
          x={rx - 3} y={ry - 3}
          width={nodeWidth + 6} height={nodeHeight + 6}
          rx={13} fill="none"
          stroke="#6366f1" strokeWidth={2.5}
        />
      )}

      <rect
        x={rx} y={ry}
        width={nodeWidth} height={nodeHeight}
        rx={10} fill="white"
        stroke={isOnPath ? '#6366f1' : catColor.stroke}
        strokeWidth={isOnPath ? 2 : 1.5}
        opacity={isDimmed ? 0.35 : 1}
      />

      <rect
        x={rx} y={ry}
        width={4} height={nodeHeight}
        rx={2} fill={catColor.stroke}
        opacity={isDimmed ? 0.35 : 1}
      />

      <text
        x={rx + 12} y={ry + 18}
        fontSize={11} fontWeight={600}
        fill={isDimmed ? '#94a3b8' : '#1e293b'}
        className="select-none"
      >
        {node.name.length > 18 ? node.name.slice(0, 16) + '...' : node.name}
      </text>

      <rect
        x={rx + 12} y={ry + 28}
        width={nodeWidth - 24} height={5}
        rx={2.5} fill="#e2e8f0"
        opacity={isDimmed ? 0.3 : 1}
      />
      <rect
        x={rx + 12} y={ry + 28}
        width={Math.max(0, (nodeWidth - 24) * (node.mastery / 100))}
        height={5} rx={2.5}
        fill={masteryColor}
        opacity={isDimmed ? 0.3 : 1}
      />

      <text
        x={rx + 12} y={ry + 45}
        fontSize={9} fill={isDimmed ? '#cbd5e1' : '#64748b'}
        className="select-none"
      >
        {node.mastery}%
      </text>
    </g>
  );
}

function DetailPanel({ node, unlocks, prerequisites, allNodes }) {
  if (!node) return null;
  const catColor = CATEGORY_COLORS[node.category];
  const nodeMap = {};
  allNodes.forEach(n => { nodeMap[n.id] = n; });

  const prereqNodes = prerequisites.map(id => nodeMap[id]).filter(Boolean);
  const unlockNodes = [...unlocks].map(id => nodeMap[id]).filter(Boolean);
  const allPrereqsMet = prereqNodes.every(n => n.mastery >= 40);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${catColor.light} ${catColor.text}`}>
              {node.category}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
              node.mastery >= 70 ? 'bg-green-50 text-green-700' :
              node.mastery >= 40 ? 'bg-blue-50 text-blue-700' :
              'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {getMasteryLabel(node.mastery)}
            </span>
          </div>
          <h3 className="text-lg font-bold text-ink dark:text-slate-200">{node.name}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-ink dark:text-slate-200">{node.mastery}%</p>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{node.freshness}d ago</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 mb-5">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${node.mastery}%`, backgroundColor: getMasteryColor(node.mastery) }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-slate-200 mb-2">
            <Lock className="w-3.5 h-3.5" />
            Prerequisites ({prereqNodes.length})
          </div>
          {prereqNodes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No prerequisites — this is a root skill</p>
          ) : (
            <ul className="space-y-1.5">
              {prereqNodes.map(p => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${p.mastery >= 40 ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <span className="text-ink dark:text-slate-200">{p.name}</span>
                  <span className="text-slate-400 ml-auto">{p.mastery}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-slate-200 mb-2">
            <Unlock className="w-3.5 h-3.5" />
            Unlocks ({unlockNodes.length})
          </div>
          {unlockNodes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">This is an advanced skill — no further unlocks</p>
          ) : (
            <ul className="space-y-1.5">
              {unlockNodes.map(u => (
                <li key={u.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[u.category].bg}`} />
                  <span className="text-ink dark:text-slate-200">{u.name}</span>
                  <span className="text-slate-400 ml-auto">{u.mastery}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/lesson?topic=${encodeURIComponent(node.name)}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
        >
          {node.mastery >= 40 ? 'Continue learning' : 'Start learning'}
          <ArrowRight className="w-4 h-4" />
        </Link>
        {!allPrereqsMet && prereqNodes.length > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Complete prerequisites first for best results
          </span>
        )}
      </div>
    </div>
  );
}

const GRAPH_NAME_TO_HEATMAP = {
  'AI Fundamentals': 'AI Fundamentals',
  'Prompt Basics': 'Prompt Basics',
  'Customer Comms': 'Customer Comms',
  'System Prompts': 'System Prompts',
  'Data Privacy & PII': 'Data Privacy',
  'Safety & Red-teaming': 'Eval & Hallucinations',
  'Email Drafting': 'Email Drafting',
  'Report Writing': 'Report Writing',
  'Eval & Hallucinations': 'Eval & Hallucinations',
  'Bias & Fairness': 'Bias & Fairness',
  'AI Ethics': 'AI Ethics',
  'Compliance': 'Compliance',
  'AI Agents & Tools': 'AI Agents',
  'Image & Voice': 'Image & Voice',
  'Reasoning Models': 'Reasoning Models',
  'Multimodal AI': 'Multimodal',
};

export default function SkillGraphPage() {
  const [selectedId, setSelectedId] = useState(null);
  const prog = useProgression();

  const moduleProgress = typeof window !== 'undefined' ? getAllModuleProgress() : {};
  const calibrationSkills = typeof window !== 'undefined' ? getCalibrationSkills() : null;

  const realSkills = useMemo(() => {
    const computed = computeSkills({
      lessonHistory: prog?.lessonHistory || [],
      moduleProgress,
      calibrationSkills,
    });
    const map = {};
    for (const s of computed) {
      map[s.name] = s;
    }
    return map;
  }, [prog?.lessonHistory, moduleProgress, calibrationSkills]);

  const enrichedNodes = useMemo(() => GRAPH_NODES.map(node => {
    const heatmapName = GRAPH_NAME_TO_HEATMAP[node.name];
    const real = heatmapName ? realSkills[heatmapName] : null;
    return {
      ...node,
      mastery: real?.mastery || 0,
      freshness: real?.freshness ?? 0,
    };
  }), [realSkills]);

  const layout = useMemo(() => computeLayout(enrichedNodes, GRAPH_EDGES), [enrichedNodes]);
  const recommendedId = useMemo(() => findRecommendedNext(enrichedNodes, GRAPH_EDGES), [enrichedNodes]);

  const selectedNode = enrichedNodes.find(n => n.id === selectedId) || null;
  const pathNodeIds = selectedId ? getPathTo(selectedId, GRAPH_EDGES) : new Set();
  const unlockIds = selectedId ? getUnlockedBy(selectedId, GRAPH_EDGES) : new Set();

  const prerequisites = selectedId
    ? GRAPH_EDGES.filter(e => e.to === selectedId).map(e => e.from)
    : [];
  const directUnlocks = selectedId
    ? new Set(GRAPH_EDGES.filter(e => e.from === selectedId).map(e => e.to))
    : new Set();

  const highlightedEdges = selectedId
    ? new Set(GRAPH_EDGES.filter(e => pathNodeIds.has(e.from) && pathNodeIds.has(e.to)).map((_, i) => i))
    : new Set();

  const recommendedNode = enrichedNodes.find(n => n.id === recommendedId);
  const categories = [...new Set(enrichedNodes.map(n => n.category))];

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={GitBranch}
        title="Skill Graph"
        subtitle="Dependencies & learning paths — see how skills connect"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {recommendedNode && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink dark:text-slate-200 text-sm">
                Recommended next: <strong>{recommendedNode.name}</strong>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All prerequisites met — this skill unlocks {unlockIds.size > 0 ? `${getUnlockedBy(recommendedId, GRAPH_EDGES).size} more skill${getUnlockedBy(recommendedId, GRAPH_EDGES).size !== 1 ? 's' : ''}` : 'new capabilities'}
              </p>
            </div>
            <Link
              href={`/lesson?topic=${encodeURIComponent(recommendedNode.name)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all shrink-0"
            >
              Start
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${CATEGORY_COLORS[cat].bg}`} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{cat}</span>
            </div>
          ))}
          <span className="text-xs text-slate-400 ml-auto">Click a skill to explore</span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <svg
            viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
            className="w-full h-auto min-w-[600px]"
            role="img"
            aria-label="Skill dependency graph"
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX={10} refY={5}
                markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX={10} refY={5}
                markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>

            <g>
              {GRAPH_EDGES.map((edge, i) => {
                const fromPos = layout.positions[edge.from];
                const toPos = layout.positions[edge.to];
                if (!fromPos || !toPos) return null;
                const highlighted = highlightedEdges.has(i);
                const dimmed = selectedId && !highlighted;
                return (
                  <EdgePath
                    key={`${edge.from}-${edge.to}`}
                    fromPos={fromPos} toPos={toPos}
                    nodeWidth={layout.nodeWidth} nodeHeight={layout.nodeHeight}
                    highlighted={highlighted} dimmed={dimmed}
                  />
                );
              })}
            </g>

            <g>
              {enrichedNodes.map(node => {
                const pos = layout.positions[node.id];
                if (!pos) return null;
                const isSelected = selectedId === node.id;
                const isRecommended = recommendedId === node.id && !selectedId;
                const isOnPath = pathNodeIds.has(node.id);
                const isDimmed = selectedId && !isOnPath && !unlockIds.has(node.id) && selectedId !== node.id;
                return (
                  <GraphNode
                    key={node.id}
                    node={node} pos={pos}
                    nodeWidth={layout.nodeWidth} nodeHeight={layout.nodeHeight}
                    isSelected={isSelected} isRecommended={isRecommended}
                    isOnPath={isOnPath} isDimmed={isDimmed}
                    onClick={id => setSelectedId(selectedId === id ? null : id)}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        <DetailPanel
          node={selectedNode}
          unlocks={directUnlocks}
          prerequisites={prerequisites}
          allNodes={enrichedNodes}
        />

        <div className="flex items-center gap-4">
          <Link
            href="/heatmap"
            className="text-sm font-medium text-brand hover:text-brand-600 transition-colors"
          >
            View Knowledge Heatmap &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
