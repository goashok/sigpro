export const sampleUser = { name: 'Alex Laurent', email: 'alex.laurent@example.com' };
export const defaultSummaryPrompt = 'Summarize this Super Signal for a credit analyst. Identify the affected issuer, key developments, potential credit implications, and uncertainties. Distinguish evidence from assumptions, include supporting and conflicting signals, and cite the source references. Keep the summary concise and do not infer a rating action.';

export const catalog = {
  super: { label: 'Create / update Super Signal', category: 'Aggregate', color: 'purple', icon: 'network', description: 'Create on the first arrival; stop unchanged duplicates here, and forward updated versions when content changes.', field: 'Credit topic', options: ['Refinancing pressure', 'Margin compression', 'Demand & revenue weakness', 'Governance risk'] },
  watch: { label: 'Source', category: 'Collect', color: 'blue', icon: 'radio', description: 'Bring your trusted information together.', field: 'Sources to watch', options: ['All connected sources', 'Policy & regulatory sources', 'News & subscriptions'] },
  match: { label: 'Match my portfolio', category: 'Filter', color: 'purple', icon: 'briefcase', description: 'Continue only when the Super Signal relates to your selected portfolio. Stop unmatched signals here.', field: 'Coverage universe', options: ['European corporates', 'All covered issuers', 'Industrials & automotive'] },
  enrich: { label: 'Enrich credit context', category: 'Context', color: 'teal', icon: 'layers', description: 'Bring approved internal data into one dated context snapshot shared by both paths.', field: 'Context snapshot', options: ['Latest available approved data'] },
  extract: { label: 'Extract scenario inputs', category: 'Extract', color: 'teal', icon: 'sparkles', description: 'Turn evidence into cited, reviewable assumptions.', field: 'Information to extract', options: ['Rates, debt maturities & cash flow', 'Revenue, margins & cost changes', 'Liquidity & covenant headroom'] },
  review: { label: 'Review assumptions', category: 'Review', color: 'amber', icon: 'check', description: 'An analyst confirms inputs before action.', field: 'Reviewer', options: ['Portfolio owner', 'Senior credit analyst', 'Team lead'] },
  scenario: { label: 'Run a scenario', category: 'Act', color: 'teal', icon: 'chart', description: 'Explore an impact using approved assumptions.', field: 'Scenario model', options: ['Refinancing downside', 'Margin stress', 'Liquidity sensitivity'] },
  assign: { label: 'Assign further analysis', category: 'Act', color: 'teal', icon: 'users', description: 'Give a colleague a focused investigation.', field: 'Assign to', options: ['Jamie Chen · Associate analyst', 'Priya Shah · Credit analyst', 'Portfolio owner'] },
  publish: { label: 'Summarize and Publish', category: 'Act', color: 'teal', icon: 'book', description: 'Summarize the Super Signal and publish it to your analytical workspace or email.', field: 'Publishing platform', options: ['Analytical Desktop', 'Email'] },
  job: { label: 'Create an event-driven review', category: 'Act', color: 'teal', icon: 'clipboard', description: 'Start a tracked review for the affected credit.', field: 'Review type', options: ['Event-driven credit review', 'Liquidity review', 'Sector impact review'] },
};

export function newStep(type, id = crypto.randomUUID(), userEmail = sampleUser.email) {
  if (type === 'enrich') return { id, type, value: 'Latest available approved data', note: '', enrichment: { datasets: ['ratings', 'financials', 'debt'], maxAgeDays: 90, issues: 'flag' } };
  if (type === 'publish') return { id, type, value: 'Analytical Desktop', note: '', branch: 'summary', publishing: { prompt: defaultSummaryPrompt, to: userEmail, additionalRecipients: [] } };
  if (type === 'watch') return newSource('web', id);
  return { id, type, value: catalog[type].options[0], note: '', ...(!['watch', 'super', 'match', 'enrich'].includes(type) ? { branch: 'analysis' } : {}) };
}

export function initialState() {
  return {
    version: 1,
    user: { ...sampleUser },
    workflow: { schemaVersion: 4, name: 'Refinancing pressure monitor', active: false, steps: [newSource('web', 'source-web', 'Policy announcements', { url: 'https://www.ecb.europa.eu/press/pr/html/index.en.html' }), newSource('email', 'source-email', 'Research inbox', { inbox: 'research@example.com', folder: 'Credit research' }), newStep('super', 'super-signal'), ...['match', 'extract', 'review', 'scenario'].map((type, i) => newStep(type, `step-${i + 1}`))] },
    sources: [
      { id: 'ecb', name: 'European Central Bank', kind: 'Policy & regulatory', icon: 'landmark', enabled: true, count: 4, detail: 'Policy decisions & monetary updates', owner: 'Team source' },
      { id: 'news', name: 'Global Market News', kind: 'News feed', icon: 'globe', enabled: true, count: 18, detail: 'European credit & corporate headlines', owner: 'Your source' },
      { id: 'capiq', name: 'S&P Capital IQ', kind: 'Subscription', icon: 'chart', enabled: true, count: 8, detail: 'Issuer financials & market information', owner: 'Team source' },
      { id: 'email', name: 'Research inbox', kind: 'Email', icon: 'mail', enabled: true, count: 7, detail: 'Selected research & issuer notifications', owner: 'Your source' },
      { id: 'internal', name: 'Internal credit updates', kind: 'Internal', icon: 'users', enabled: true, count: 5, detail: 'Rating actions from your colleagues', owner: 'Team source' },
    ],
    runs: [createInboxRun()],
    actions: [],
    reviewed: [],
    overrides: {},
  };
}

export const stories = [
  { id: 'aster', issuer: 'Aster Automotive', initials: 'AA', sector: 'Automotive', rating: 'BBB− / Stable', title: 'Refinancing headwinds converge ahead of 2027 maturities', summary: 'Higher-for-longer rates, a concentrated maturity schedule, and softer free cash flow point to growing refinancing pressure.', priority: 'High', mechanism: 'Refinancing pressure', time: '12 min ago', signals: 3, reports: 7, exposure: '€420m', importance: 'High', severity: 'High', urgency: 'Elevated', confidence: 'Moderate', color: 'blue', rationale: 'Aster has €1.2bn of debt maturing within 18 months. Higher funding costs could pressure interest coverage as cash generation slows.', evidence: [
    { title: 'Policy rates remain elevated', source: 'European Central Bank', time: '09:42', role: 'Supports', text: 'Sample policy announcement keeps the deposit rate at 3.50%, with no near-term easing signaled.', fact: 'Policy rate', value: '3.50%', reference: 'Illustrative policy release · paragraph 2', duplicates: 3 },
    { title: '€1.2bn debt maturity concentration', source: 'S&P Capital IQ', time: '09:18', role: 'Supports', text: 'Sample debt schedule shows €1.2bn of maturities within the next 18 months.', fact: 'Debt maturing', value: '€1.2bn', reference: 'Illustrative debt schedule · maturity table', duplicates: 2 },
    { title: 'Cash generation softens; liquidity remains available', source: 'Research inbox', time: '08:55', role: 'Mixed', text: 'Sample results show free cash flow down 18% year on year, alongside an undrawn €800m revolving credit facility.', fact: 'Free cash flow change', value: '−18% YoY', reference: 'Illustrative issuer results · cash flow section', duplicates: 2 },
  ] },
  { id: 'northstar', issuer: 'Northstar Utilities', initials: 'NU', sector: 'Utilities', rating: 'A− / Stable', title: 'Regulatory proposal could narrow allowed returns', summary: 'A proposed revision to network returns may reduce earnings headroom for regulated utilities.', priority: 'High', mechanism: 'Regulatory pressure', time: '38 min ago', signals: 2, reports: 3, exposure: '€310m', importance: 'High', severity: 'Moderate', urgency: 'Elevated', confidence: 'Moderate', color: 'teal', rationale: 'Regulated networks contribute 72% of issuer EBITDA. The proposal is material but remains subject to consultation.', evidence: [
    { title: 'Network return consultation opens', source: 'Global Market News', time: '09:12', role: 'Supports', text: 'An illustrative regulator consultation proposes a lower allowed return for the next control period.', fact: 'Proposed return change', value: '−40 bps', reference: 'Sample consultation · proposal summary', duplicates: 2 },
    { title: 'Investment recovery mechanism retained', source: 'Internal credit updates', time: '08:40', role: 'Counters', text: 'A sample internal note highlights retained mechanisms for recovering qualifying infrastructure investment.', fact: 'Regulated EBITDA share', value: '72%', reference: 'Sample sector note · issuer exposure', duplicates: 1 },
  ] },
  { id: 'meridian', issuer: 'Meridian Packaging', initials: 'MP', sector: 'Industrials', rating: 'BB+ / Stable', title: 'Input cost increases test margin recovery', summary: 'Rising pulp prices and freight costs may offset recent pricing gains.', priority: 'Medium', mechanism: 'Margin compression', time: '1 hour ago', signals: 2, reports: 4, exposure: '€185m', importance: 'Moderate', severity: 'Moderate', urgency: 'Routine', confidence: 'High', color: 'purple', rationale: 'Contract repricing offers a partial offset, but the lag could weigh on the next two quarters.', evidence: [
    { title: 'Pulp prices rise in sample market series', source: 'S&P Capital IQ', time: '08:20', role: 'Supports', text: 'Illustrative pulp prices increased 9% over the quarter.', fact: 'Pulp price change', value: '+9%', reference: 'Sample commodity series · quarterly change', duplicates: 2 },
    { title: 'Freight surcharges broaden', source: 'Global Market News', time: '07:45', role: 'Supports', text: 'A sample carrier announcement introduces higher surcharges on key trade routes.', fact: 'Freight cost change', value: '+6%', reference: 'Sample freight bulletin · route summary', duplicates: 2 },
  ] },
  { id: 'atlas', issuer: 'Atlas Infrastructure', initials: 'AI', sector: 'Infrastructure', rating: 'BBB / Positive', title: 'Asset disposal strengthens liquidity position', summary: 'A completed non-core disposal supports near-term deleveraging.', priority: 'Low', mechanism: 'Liquidity improvement', time: '2 hours ago', signals: 1, reports: 2, exposure: '€260m', importance: 'Moderate', severity: 'Low', urgency: 'Routine', confidence: 'High', color: 'amber', rationale: 'Disposal proceeds cover upcoming maturities, reducing immediate financing needs.', evidence: [
    { title: 'Non-core asset sale completed', source: 'Research inbox', time: '07:30', role: 'Supports', text: 'An illustrative issuer announcement confirms €350m of proceeds allocated to debt reduction.', fact: 'Disposal proceeds', value: '€350m', reference: 'Sample issuer announcement · proceeds', duplicates: 2 },
  ] },
];

export function validateWorkflow(steps) {
  const errors = [], sources = steps.filter(s => s.type === 'watch'), joins = steps.filter(s => s.type === 'super');
  if (!sources.length) errors.push('Add at least one source to start your workflow.');
  if (joins.length !== 1) errors.push('Use one Super Signal step before portfolio filtering.');
  if (steps[0]?.type !== 'watch') errors.push('Start your workflow with a source.');
  const joinIndex = steps.findIndex(s => s.type === 'super');
  if (steps.some((s, i) => s.type === 'watch' ? i > joinIndex : s.type !== 'super' && i < joinIndex)) errors.push('Connect all sources to the Super Signal before shared processing.');
  if (steps.filter(s => s.type === 'match').length !== 1 || steps[joinIndex + 1]?.type !== 'match') errors.push('Match your portfolio immediately after creating the Super Signal.');
  const contextSteps = steps.filter(step => step.type === 'enrich');
  if (contextSteps.length > 1 || (contextSteps.length && steps[steps.findIndex(step => step.type === 'match') + 1]?.type !== 'enrich')) errors.push('Place one shared enrichment step immediately after the portfolio filter.');
  if (new Set(steps.map(s => s.id)).size !== steps.length) errors.push('Each workflow node must have a unique identifier.');
  if (!steps.some(s => ['scenario', 'assign', 'job', 'publish'].includes(s.type))) errors.push('Add an action to complete your workflow.');
  for (const step of steps) {
    if (!catalog[step.type]) { errors.push('This workflow contains an unsupported step.'); continue; }
    if (step.type === 'watch') {
      for (const message of Object.values(sourceErrors(step))) errors.push(`${step.name || 'Unnamed source'}: ${message}`);
    } else if (!catalog[step.type].options.includes(step.value)) errors.push(`Choose a valid setting for ${catalog[step.type].label}.`);
    if (step.type === 'enrich') errors.push(...enrichmentErrors(step));
    if (step.type === 'publish') for (const message of Object.values(publishingErrors(step))) errors.push(`Summarize and Publish: ${message}`);

  }
  for (const branch of workflowBranches(steps)) {
    const firstType = branch.id === 'analysis' ? 'extract' : 'publish';
    if (branch.steps[0].type !== firstType) errors.push(`${branch.label} must start with ${catalog[firstType].label}.`);
    if (!branch.steps.some(step => ['scenario', 'assign', 'job', 'publish'].includes(step.type))) errors.push(`${branch.label}: add an action to complete this path.`);
    const seen = new Set();
    for (const step of branch.steps) {
      if (step.type === 'scenario' && (!seen.has('extract') || !seen.has('review'))) errors.push(`${branch.label}: Extract inputs and review assumptions before running a scenario.`);
      if (step.type === 'review' && !seen.has('extract')) errors.push(`${branch.label}: Extract inputs before reviewing assumptions.`);
      seen.add(step.type);
    }
  }
  if (steps.some(step => branchOf(step) && !['analysis', 'summary'].includes(branchOf(step)))) errors.push('Choose a valid branch for each downstream step.');
  return [...new Set(errors)];
}

export const sourceTypes = {
  web: { label: 'Web page', icon: 'globe', fields: [
    { key: 'url', label: 'Page URL', type: 'url', required: true, placeholder: 'https://example.com/news' },
    { key: 'frequency', label: 'Check for changes', options: ['Every 15 minutes', 'Hourly', 'Daily'], default: 'Hourly' },
    { key: 'topics', label: 'Topics or keywords', placeholder: 'Monetary policy, interest rates' },
  ] },
  email: { label: 'Email inbox', icon: 'mail', fields: [
    { key: 'inbox', label: 'Email inbox', type: 'email', required: true, placeholder: 'research@example.com' },
    { key: 'folder', label: 'Folder or label', required: true, default: 'Inbox', placeholder: 'Inbox / Credit research' },
    { key: 'sender', label: 'Sender filter', type: 'email', placeholder: 'Optional sender address' },
    { key: 'subject', label: 'Subject contains', placeholder: 'Optional subject keywords' },
  ] },
  rss: { label: 'RSS feed', icon: 'radio', fields: [
    { key: 'url', label: 'Feed URL', type: 'url', required: true, placeholder: 'https://example.com/feed.xml' },
    { key: 'frequency', label: 'Check for updates', options: ['Every 15 minutes', 'Hourly', 'Daily'], default: 'Hourly' },
  ] },
  subscription: { label: 'Subscription service', icon: 'chart', fields: [
    { key: 'provider', label: 'Provider', options: ['S&P Capital IQ', 'Bloomberg', 'Other subscription'], default: 'S&P Capital IQ' },
    { key: 'account', label: 'Connection name', required: true, placeholder: 'Team research subscription' },
    { key: 'dataset', label: 'Information to watch', options: ['Company news', 'Financial statements', 'Credit rating changes'], default: 'Company news' },
    { key: 'coverage', label: 'Issuer or sector filter', placeholder: 'European corporates' },
  ] },
  internal: { label: 'Internal credit updates', icon: 'users', fields: [
    { key: 'feed', label: 'Update stream', options: ['Rating actions', 'Committee outcomes', 'Credit alerts'], default: 'Rating actions' },
    { key: 'team', label: 'Team or coverage group', required: true, placeholder: 'European corporates' },
  ] },
  connected: { label: 'Connected source group', icon: 'layers', fields: [
    { key: 'group', label: 'Source group', options: ['All connected sources', 'Policy & regulatory sources', 'News & subscriptions'], default: 'All connected sources' },
  ] },
};
export function newSource(sourceType = 'web', id = crypto.randomUUID(), name = '', config = {}) {
  const definition = sourceTypes[sourceType];
  return { id, type: 'watch', sourceType, name: name || definition.label, value: 'All connected sources', note: '', sourceConfigs: { [sourceType]: { ...Object.fromEntries(definition.fields.map(f => [f.key, f.default || ''])), ...config } } };
}
export function sourceConfig(step) { return step.sourceConfigs?.[step.sourceType] || {}; }
export function switchSourceType(step, sourceType) {
  if (!sourceTypes[sourceType]) return;
  step.sourceType = sourceType;
  step.sourceConfigs ||= {};
  step.sourceConfigs[sourceType] ||= newSource(sourceType).sourceConfigs[sourceType];
}
export function sourceErrors(step) {
  const errors = {}, definition = sourceTypes[step.sourceType], config = sourceConfig(step);
  if (!definition) return { sourceType: 'Choose a source type.' };
  if (!step.name?.trim()) errors.name = 'Enter a source name.';
  for (const field of definition.fields) {
    const value = String(config[field.key] ?? '').trim();
    if (!value) { if (field.required || field.options) errors[field.key] = `${field.label} is required.`; continue; }
    if (field.options && !field.options.includes(value)) errors[field.key] = `Choose a valid ${field.label.toLowerCase()}.`;
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.key] = 'Enter a valid email address.';
    if (field.type === 'url') {
      try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error(); }
      catch { errors[field.key] = 'Enter a valid http:// or https:// URL without credentials.'; }
    }
  }
  return errors;
}
export function sourceSummary(step) {
  const config = sourceConfig(step);
  return config.url || config.inbox || config.account || config.team || config.group || 'Configure this source';
}
export function branchOf(step) {
  return ['watch', 'super', 'match', 'enrich'].includes(step.type) ? null : step.branch || (step.type === 'publish' ? 'summary' : 'analysis');
}
export function workflowBranches(steps) {
  return [{ id: 'analysis', label: 'Scenario analysis' }, { id: 'summary', label: 'Summary & publishing' }].map(branch => ({ ...branch, steps: steps.filter(step => branchOf(step) === branch.id) })).filter(branch => branch.steps.length);
}
export function workflowEdges(steps) {
  const sources = steps.filter(s => s.type === 'watch'), superStep = steps.find(s => s.type === 'super'), match = steps.find(s => s.type === 'match');
  const edges = superStep ? sources.map(s => ({ from: s.id, to: superStep.id })) : [];
  if (superStep && match) edges.push({ from: superStep.id, to: match.id });
  const context = steps.find(step => step.type === 'enrich');
  if (match && context) edges.push({ from: match.id, to: context.id });
  if (match) for (const branch of workflowBranches(steps)) {
    const path = [context || match, ...branch.steps];
    for (let i = 0; i < path.length - 1; i++) edges.push({ from: path[i].id, to: path[i + 1].id, branch: branch.id });
  }
  return edges;
}
function migrateBranches(workflow) {
  for (const step of workflow.steps) {
    if (!['watch', 'super', 'match', 'enrich'].includes(step.type)) step.branch = step.type === 'publish' ? 'summary' : 'analysis';
    delete step.x; delete step.y;
  }
  const analysis = workflow.steps.filter(step => step.branch === 'analysis');
  if (analysis.length && analysis[0].type !== 'extract') {
    const extract = analysis.find(step => step.type === 'extract') || newStep('extract');
    workflow.steps = workflow.steps.filter(step => step.id !== extract.id);
    workflow.steps.splice(workflow.steps.findIndex(step => step.branch === 'analysis'), 0, extract);
  }
  workflow.schemaVersion = 4; workflow.active = false;
  return workflow;
}
export function migrateWorkflow(workflow) {
  if (workflow.schemaVersion === 4) return workflow;
  if (workflow.schemaVersion === 3) return migrateBranches(workflow);
  const original = workflow.steps;
  const sources = original.filter(s => s.type === 'watch').map(s => s.sourceType ? s : ({ ...newSource('connected', s.id, 'Connected sources', { group: s.value }), note: s.note || '' }));
  const oldJoin = original.find(s => ['join', 'super'].includes(s.type));
  const grouping = original.find(s => s.type === 'group');
  const superStep = { ...newStep('super', oldJoin?.id), note: [oldJoin?.note, grouping?.note].filter(Boolean).join('\n') };
  if (grouping && catalog.super.options.includes(grouping.value)) superStep.value = grouping.value;
  const match = original.find(s => s.type === 'match') || newStep('match');
  const downstream = original.filter(s => !['watch', 'join', 'super', 'dedupe', 'group', 'match'].includes(s.type));
  // Keep retired configuration for reference without leaving obsolete executable steps.
  workflow.retiredSteps = [...(workflow.retiredSteps || []), ...original.filter(s => ['dedupe', 'group'].includes(s.type))];
  workflow.steps = [...sources, superStep, match, ...downstream];
  workflow.steps.forEach(s => { delete s.x; delete s.y; });
  return migrateBranches(workflow);
}

// Transport timestamps and display names do not constitute a content update.
// Adapters expose substantive values through content, facts, and effectiveAt.
function signalFingerprint(signal) {
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  return JSON.stringify(canonical({ content: signal.content ?? null, facts: signal.facts ?? null, effectiveAt: signal.effectiveAt ?? null }));
}
export function receiveSignal(superSignals, signal) {
  for (const key of ['sourceId', 'signalId', 'issuerId', 'topic']) if (!signal[key]) throw new Error(`${key} is required.`);
  const existing = superSignals.find(s => s.issuerId === signal.issuerId && s.topic === signal.topic);
  const superSignal = existing ? structuredClone(existing) : { id: crypto.randomUUID(), issuerId: signal.issuerId, topic: signal.topic, signals: [], revision: 0 };
  const index = superSignal.signals.findIndex(s => s.sourceId === signal.sourceId && s.signalId === signal.signalId);
  if (index >= 0) {
    const previous = superSignal.signals[index];
    if (signalFingerprint(previous) === signalFingerprint(signal)) return { superSignals, superSignal: existing, outcome: 'duplicate', shouldContinue: false };
    superSignal.signals[index] = { ...previous, ...signal, revision: previous.revision + 1, history: [...previous.history, { content: previous.content, facts: previous.facts, effectiveAt: previous.effectiveAt, receivedAt: previous.receivedAt, revision: previous.revision }] };
  } else superSignal.signals.push({ ...signal, revision: 1, history: [] });
  superSignal.revision++;
  const list = existing ? superSignals.map(s => s.id === existing.id ? superSignal : s) : [...superSignals, superSignal];
  return { superSignals: list, superSignal, outcome: !existing ? 'created' : index >= 0 ? 'updated' : 'added', shouldContinue: true };
}
export function matchesPortfolio(superSignal, coveredIssuerIds) { return coveredIssuerIds.includes(superSignal.issuerId); }

export function scenarioResult(debtMillions, shockBps, ebitdaMillions = 480, interestMillions = 120) {
  if (![debtMillions, shockBps, ebitdaMillions, interestMillions].every(Number.isFinite) || debtMillions < 0 || shockBps < 0 || ebitdaMillions <= 0 || interestMillions <= 0) throw new Error('Enter valid, non-negative assumptions and positive baseline values.');
  const additionalInterest = debtMillions * shockBps / 10000;
  return { additionalInterest, baselineCoverage: ebitdaMillions / interestMillions, stressedCoverage: ebitdaMillions / (interestMillions + additionalInterest) };
}

export const assumptionFields = [
  { key: 'debt', label: 'Debt to refinance', unit: '€ million', value: 1200, min: 0, kind: 'Extracted from evidence', source: 'S&P Capital IQ · Sample debt schedule · maturity table', excerpt: '€1.2bn of maturities within the next 18 months.', detail: 'Converted to € million: 1.2bn × 1,000 = 1,200. Confirm the amount and refinancing horizon.' },
  { key: 'shock', label: 'Additional refinancing spread', unit: 'basis points', value: 150, min: 0, kind: 'Proposed assumption', source: 'Analyst-defined downside · no source evidence', excerpt: 'Assume refinancing costs rise by 150 basis points.', detail: 'This is a proposed stress assumption, not an extracted policy rate. Adjust it to reflect your downside case.' },
  { key: 'ebitda', label: 'Baseline EBITDA', unit: '€ million / year', value: 480, min: 0.01, kind: 'Illustrative baseline', source: 'Demo model input · not source-verified', excerpt: 'Annual EBITDA is held constant at €480m.', detail: 'Review or replace this illustrative baseline. The calculation holds EBITDA constant under stress.' },
  { key: 'interest', label: 'Baseline interest expense', unit: '€ million / year', value: 120, min: 0.01, kind: 'Illustrative baseline', source: 'Demo model input · not source-verified', excerpt: 'Annual interest expense starts at €120m.', detail: 'Additional refinancing interest is added to this baseline. Confirm the same annual period and currency.' },
];

// A received run is independent of later edits to the workflow draft.
export function createInboxRun() {
  return {
    id: crypto.randomUUID(), storyId: 'aster', status: 'awaiting-review',
    workflowName: 'Refinancing pressure monitor', workflowVersion: 1,
    receivedAt: new Date().toISOString(), reviewer: 'Alex Laurent',
    nextStep: 'Refinancing downside',
    values: Object.fromEntries(assumptionFields.map(f => [f.key, String(f.value)])),
    checked: {}, note: '',
  };
}

export function approveInboxRun(run) {
  if (run.status !== 'awaiting-review') throw new Error('This run has already been reviewed.');
  if (!assumptionFields.every(f => run.checked[f.key] && String(run.values[f.key]).trim() !== '' && Number.isFinite(Number(run.values[f.key])) && Number(run.values[f.key]) >= f.min)) {
    throw new Error('Review and confirm every valid input before continuing.');
  }
  const values = Object.fromEntries(assumptionFields.map(f => [f.key, Number(run.values[f.key])]));
  return { ...run, values, result: scenarioResult(values.debt, values.shock, values.ebitda, values.interest), status: 'completed', approvedAt: new Date().toISOString() };
}


export function publishingErrors(step) {
  const errors = {}, config = step.publishing;
  if (!config?.prompt?.trim()) errors.prompt = 'Enter a summarization prompt.';
  if (!catalog.publish.options.includes(step.value)) errors.platform = 'Choose a publishing platform.';
  if (step.value === 'Email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = [config?.to || '', ...(config?.additionalRecipients || [])];
    const seen = new Set();
    recipients.forEach((recipient, index) => {
      const value = recipient.trim(), key = index === 0 ? 'to' : `recipient-${index - 1}`;
      if (!emailPattern.test(value)) errors[key] = 'Enter a valid email address.';
      else if (seen.has(value.toLowerCase())) errors[key] = 'This recipient is already included.';
      seen.add(value.toLowerCase());
    });
  }
  return errors;
}
export function publishingRecipients(step) {
  return step.value === 'Email' ? [step.publishing.to, ...step.publishing.additionalRecipients].map(email => email.trim()) : [];
}


export const enrichmentDatasets = [
  { id: 'ratings', label: 'Ratings & review history', description: 'Current rating, outlook, last review and key credit drivers.', source: 'Internal ratings & reviews', asOf: '2026-09-18', values: 'BBB− / Stable · Last review: 18 Sep 2026 · Refinancing and cash generation are key drivers.' },
  { id: 'financials', label: 'Financial statements', description: 'Approved income, balance-sheet and cash-flow figures.', source: 'Approved financial spreading system', asOf: '2026-06-30', values: 'Illustrative annual baseline: EBITDA €480m; interest expense €120m. Reporting period ended 30 Jun 2026.' },
  { id: 'debt', label: 'Debt, liquidity & covenants', description: 'Maturities, cash, available facilities and covenant headroom.', source: 'Internal debt & liquidity database', asOf: '2026-09-10', values: '€1.2bn maturing within 18 months · €800m undrawn revolving facility · Covenant headroom not provided in this sample.' },
  { id: 'exposures', label: 'Portfolio exposures & relationships', description: 'Exposure amounts, covered instruments and issuer relationships.', source: 'Portfolio & entity reference systems', asOf: '2026-09-19', values: '€420m sample exposure to Aster Automotive · Parent issuer mapping confirmed; instrument breakdown not provided.' },
  { id: 'models', label: 'Prior assumptions & scenario results', description: 'Approved baseline assumptions and historical scenario outcomes.', source: 'Model & scenario archive', asOf: '2026-03-31', values: 'Historical stress: +100 bps spread assumption. Prior scenario output unavailable in this sample; do not substitute for a current result.' },
];
export const enrichmentSampleDate = '2026-09-20';
export function enrichmentErrors(step) {
  const config = step.enrichment, errors = [];
  if (!config?.datasets?.length) errors.push('Enrich credit context: select at least one dataset.');
  if (config?.datasets?.some(id => !enrichmentDatasets.some(dataset => dataset.id === id))) errors.push('Enrich credit context: choose supported datasets.');
  if (![30, 90, 180, 365].includes(Number(config?.maxAgeDays))) errors.push('Enrich credit context: choose a freshness threshold.');
  if (!['flag', 'pause'].includes(config?.issues)) errors.push('Enrich credit context: choose how to handle data gaps.');
  return errors;
}
export function enrichmentSnapshot(step, missingDatasetIds = []) {
  const errors = enrichmentErrors(step); if (errors.length) throw new Error(errors.join(' '));
  const datasets = enrichmentDatasets.filter(dataset => step.enrichment.datasets.includes(dataset.id)).map(dataset => {
    const ageDays = Math.round((Date.parse(enrichmentSampleDate) - Date.parse(dataset.asOf)) / 86400000);
    const missing = missingDatasetIds.includes(dataset.id);
    return { ...dataset, ageDays: missing ? null : ageDays, asOf: missing ? null : dataset.asOf, values: missing ? null : dataset.values, status: missing ? 'Missing' : ageDays > Number(step.enrichment.maxAgeDays) ? 'Stale' : 'Available' };
  });
  const issues = datasets.filter(dataset => dataset.status !== 'Available');
  return { issuer: 'Aster Automotive', retrievedAt: enrichmentSampleDate, datasets, issues, paused: issues.length > 0 && step.enrichment.issues === 'pause' };
}
