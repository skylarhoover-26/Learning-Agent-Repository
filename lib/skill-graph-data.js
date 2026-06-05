const GRAPH_NODES = [
  { id: 'ai-fundamentals', name: 'AI Fundamentals', category: 'Foundations', mastery: 0, freshness: 0 },
  { id: 'prompt-basics', name: 'Prompt Basics', category: 'Foundations', mastery: 0, freshness: 0 },
  { id: 'customer-comms', name: 'Customer Comms', category: 'Foundations', mastery: 0, freshness: 0 },
  { id: 'system-prompts', name: 'System Prompts', category: 'Foundations', mastery: 0, freshness: 0 },
  { id: 'data-privacy', name: 'Data Privacy & PII', category: 'Application', mastery: 0, freshness: 0 },
  { id: 'safety-redteam', name: 'Safety & Red-teaming', category: 'Application', mastery: 0, freshness: 0 },
  { id: 'email-drafting', name: 'Email Drafting', category: 'Application', mastery: 0, freshness: 0 },
  { id: 'report-writing', name: 'Report Writing', category: 'Application', mastery: 0, freshness: 0 },
  { id: 'eval-hallucinations', name: 'Eval & Hallucinations', category: 'Safety', mastery: 0, freshness: 0 },
  { id: 'bias-fairness', name: 'Bias & Fairness', category: 'Safety', mastery: 0, freshness: 0 },
  { id: 'ai-ethics', name: 'AI Ethics', category: 'Safety', mastery: 0, freshness: 0 },
  { id: 'compliance', name: 'Compliance', category: 'Safety', mastery: 0, freshness: 0 },
  { id: 'ai-agents', name: 'AI Agents & Tools', category: 'Frontier', mastery: 0, freshness: 0 },
  { id: 'image-voice', name: 'Image & Voice', category: 'Frontier', mastery: 0, freshness: 0 },
  { id: 'reasoning', name: 'Reasoning Models', category: 'Frontier', mastery: 0, freshness: 0 },
  { id: 'multimodal', name: 'Multimodal AI', category: 'Frontier', mastery: 0, freshness: 0 },
];

const GRAPH_EDGES = [
  { from: 'ai-fundamentals', to: 'prompt-basics' },
  { from: 'ai-fundamentals', to: 'customer-comms' },
  { from: 'ai-fundamentals', to: 'data-privacy' },
  { from: 'ai-fundamentals', to: 'eval-hallucinations' },
  { from: 'ai-fundamentals', to: 'image-voice' },
  { from: 'prompt-basics', to: 'system-prompts' },
  { from: 'prompt-basics', to: 'email-drafting' },
  { from: 'prompt-basics', to: 'report-writing' },
  { from: 'prompt-basics', to: 'reasoning' },
  { from: 'data-privacy', to: 'safety-redteam' },
  { from: 'data-privacy', to: 'compliance' },
  { from: 'eval-hallucinations', to: 'bias-fairness' },
  { from: 'eval-hallucinations', to: 'ai-ethics' },
  { from: 'ai-ethics', to: 'compliance' },
  { from: 'system-prompts', to: 'ai-agents' },
  { from: 'image-voice', to: 'multimodal' },
  { from: 'reasoning', to: 'multimodal' },
];

const CATEGORY_COLORS = {
  Foundations: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', stroke: '#3b82f6' },
  Application: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', stroke: '#10b981' },
  Safety: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', stroke: '#f59e0b' },
  Frontier: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', stroke: '#8b5cf6' },
};

function computeLayout(nodes, edges) {
  const incoming = {};
  nodes.forEach(n => { incoming[n.id] = []; });
  edges.forEach(e => { incoming[e.to].push(e.from); });

  const layers = {};
  function assignLayer(id) {
    if (layers[id] !== undefined) return layers[id];
    if (incoming[id].length === 0) { layers[id] = 0; return 0; }
    layers[id] = Math.max(...incoming[id].map(assignLayer)) + 1;
    return layers[id];
  }
  nodes.forEach(n => assignLayer(n.id));

  const layerGroups = {};
  Object.entries(layers).forEach(([id, layer]) => {
    if (!layerGroups[layer]) layerGroups[layer] = [];
    layerGroups[layer].push(id);
  });

  const layerOrder = [
    ['ai-fundamentals'],
    ['prompt-basics', 'data-privacy', 'eval-hallucinations', 'customer-comms', 'image-voice'],
    ['system-prompts', 'email-drafting', 'report-writing', 'reasoning', 'safety-redteam', 'bias-fairness', 'ai-ethics'],
    ['ai-agents', 'compliance', 'multimodal'],
  ];

  const nodeWidth = 140;
  const nodeHeight = 52;
  const viewWidth = 1200;
  const layerSpacing = 140;
  const topPad = 50;

  const positions = {};
  layerOrder.forEach((ids, layerIdx) => {
    const y = topPad + layerIdx * layerSpacing;
    const count = ids.length;
    const margin = 90;
    const spacing = count > 1 ? (viewWidth - 2 * margin) / (count - 1) : 0;
    ids.forEach((id, i) => {
      positions[id] = {
        x: count > 1 ? margin + i * spacing : viewWidth / 2,
        y,
      };
    });
  });

  const viewHeight = topPad + (layerOrder.length - 1) * layerSpacing + nodeHeight + 40;
  return { positions, viewWidth, viewHeight, nodeWidth, nodeHeight };
}

function findRecommendedNext(nodes, edges) {
  const incoming = {};
  const outgoing = {};
  nodes.forEach(n => { incoming[n.id] = []; outgoing[n.id] = []; });
  edges.forEach(e => { incoming[e.to].push(e.from); outgoing[e.from].push(e.to); });

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const candidates = nodes.filter(n => {
    if (n.mastery >= 40) return false;
    const prereqsMet = incoming[n.id].every(pid => nodeMap[pid].mastery >= 40);
    return prereqsMet;
  });

  candidates.sort((a, b) => {
    const aDownstream = countDownstream(a.id, outgoing);
    const bDownstream = countDownstream(b.id, outgoing);
    if (bDownstream !== aDownstream) return bDownstream - aDownstream;
    return a.mastery - b.mastery;
  });

  return candidates[0]?.id || null;
}

function countDownstream(id, outgoing, visited = new Set()) {
  if (visited.has(id)) return 0;
  visited.add(id);
  let count = 0;
  for (const child of outgoing[id]) {
    count += 1 + countDownstream(child, outgoing, visited);
  }
  return count;
}

function getPathTo(targetId, edges) {
  const incoming = {};
  edges.forEach(e => {
    if (!incoming[e.to]) incoming[e.to] = [];
    incoming[e.to].push(e.from);
  });

  const path = new Set();
  function trace(id) {
    path.add(id);
    if (incoming[id]) {
      incoming[id].forEach(parent => trace(parent));
    }
  }
  trace(targetId);
  return path;
}

function getUnlockedBy(nodeId, edges) {
  const downstream = new Set();
  function trace(id) {
    edges.filter(e => e.from === id).forEach(e => {
      downstream.add(e.to);
      trace(e.to);
    });
  }
  trace(nodeId);
  return downstream;
}

export {
  GRAPH_NODES,
  GRAPH_EDGES,
  CATEGORY_COLORS,
  computeLayout,
  findRecommendedNext,
  getPathTo,
  getUnlockedBy,
};
