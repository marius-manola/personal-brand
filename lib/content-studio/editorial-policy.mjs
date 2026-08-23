export const CONTENT_TYPES = [
  'original-research',
  'decision-tool',
  'failure-clinic',
  'implementation-lab',
  'capability-guide',
  'commercial-decision',
];

export const CURRICULUM_CLUSTERS = [
  'opportunity',
  'architecture',
  'implementation',
  'evaluation',
  'capability',
  'commercial',
];

export const CLUSTER_PARENTS = {
  opportunity: 'how-to-prioritize-ai-use-cases-in-a-small-business',
  architecture: 'when-to-use-an-ai-agent',
  implementation: 'how-to-scope-an-ai-agent-proof-of-concept',
  evaluation: 'how-to-evaluate-an-ai-agent',
  capability: 'what-to-learn-before-building-ai-agents',
  commercial: 'choose-between-ai-consultant-agency-internal-team',
};

export const CONTENT_PROFILES = {
  'original-research': {
    id: 'flagship', contentType: 'original-research', kind: 'flagship',
    min: 0, max: 6_000, label: 'evidence-complete, up to 6,000', images: 4,
  },
  'decision-tool': {
    id: 'standard', contentType: 'decision-tool', kind: 'satellite',
    min: 0, max: 3_500, label: 'decision-complete, up to 3,500', images: 2,
  },
  'failure-clinic': {
    id: 'standard', contentType: 'failure-clinic', kind: 'satellite',
    min: 0, max: 3_500, label: 'diagnosis-complete, up to 3,500', images: 2,
  },
  'implementation-lab': {
    id: 'focused', contentType: 'implementation-lab', kind: 'satellite',
    min: 0, max: 3_000, label: 'implementation-complete, up to 3,000', images: 3,
  },
  'capability-guide': {
    id: 'standard', contentType: 'capability-guide', kind: 'satellite',
    min: 0, max: 3_500, label: 'transfer-complete, up to 3,500', images: 2,
  },
  'commercial-decision': {
    id: 'focused', contentType: 'commercial-decision', kind: 'satellite',
    min: 0, max: 3_000, label: 'decision-complete, up to 3,000', images: 1,
  },
};

export function normalizeContentType(value) {
  return CONTENT_TYPES.includes(value) ? value : '';
}

export function canonicalCluster(value) {
  const raw = String(value || '').toLowerCase();
  if (CURRICULUM_CLUSTERS.includes(raw)) return raw;
  if (/use.case|opportun|prioriti|strategy/.test(raw)) return 'opportunity';
  if (/architect|rag|model|system.design/.test(raw)) return 'architecture';
  if (/implement|build|deploy|integrat/.test(raw)) return 'implementation';
  if (/evaluat|reliab|quality|observ|test/.test(raw)) return 'evaluation';
  if (/capab|learn|team|skill|tutor/.test(raw)) return 'capability';
  if (/commercial|consult|agency|hire|buy/.test(raw)) return 'commercial';
  return 'opportunity';
}

export function inferContentType({ contentType, kind, cluster, intent, query } = {}) {
  const explicit = normalizeContentType(contentType);
  if (explicit) return explicit;
  const text = `${cluster || ''} ${intent || ''} ${query || ''}`.toLowerCase();
  if (kind === 'flagship') return 'original-research';
  if (/commercial|consult|agency|hire|proposal|buy/.test(text)) return 'commercial-decision';
  if (/capability|learn|training|tutor|product manager/.test(text)) return 'capability-guide';
  if (/why|debug|diagnos|failure|fails|wrong|stuck|slow/.test(text)) return 'failure-clinic';
  if (/implementation|build|integrat|code|deploy|migrat/.test(text)) return 'implementation-lab';
  return 'decision-tool';
}

export function profileForTopic(topic = {}) {
  return { ...CONTENT_PROFILES[inferContentType(topic)] };
}
