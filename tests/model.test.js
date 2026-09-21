import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, newStep, scenarioResult, validateWorkflow, createInboxRun, approveInboxRun, newSource, sourceErrors, sourceConfig, switchSourceType, workflowEdges, migrateWorkflow, receiveSignal, matchesPortfolio, defaultSummaryPrompt, publishingErrors, publishingRecipients, workflowBranches, enrichmentSnapshot, enrichmentErrors } from '../public/model.js';

test('default workflow is valid and requires review before a scenario', () => {
  const steps = initialState().workflow.steps;
  assert.deepEqual(validateWorkflow(steps), []);
  assert.ok(validateWorkflow(steps.filter(s => s.type !== 'review')).some(e => e.includes('review assumptions')));
});

test('invalid ordering and missing actions are rejected', () => {
  assert.ok(validateWorkflow([newStep('scenario'), newStep('watch')]).some(e => e.includes('Start your workflow')));
  assert.ok(validateWorkflow([newStep('watch'), newStep('extract')]).some(e => e.includes('Match your portfolio')));
  assert.ok(validateWorkflow([newStep('watch')]).some(e => e.includes('Add an action')));
});

test('sensitivity converts basis points into annual interest correctly', () => {
  const result = scenarioResult(1200, 150, 480, 120);
  assert.equal(result.additionalInterest, 18);
  assert.equal(result.baselineCoverage, 4);
  assert.equal(result.stressedCoverage, 480 / 138);
  assert.equal(scenarioResult(1200, 0).stressedCoverage, 4);
});

test('invalid scenario assumptions cannot produce a result', () => {
  for (const args of [[-1, 150], [1200, -10], [NaN, 150], [1200, 150, 480, 0]]) {
    assert.throws(() => scenarioResult(...args));
  }
});

test('received run requires reviewed inputs, uses corrections, and cannot approve twice', () => {
  const run = createInboxRun();
  assert.throws(() => approveInboxRun(run), /confirm every/);
  run.values.shock = '250';
  run.checked = { debt: true, shock: true, ebitda: true, interest: true };
  const completed = approveInboxRun(run);
  assert.equal(completed.result.additionalInterest, 30);
  assert.equal(completed.result.stressedCoverage, 3.2);
  assert.equal(completed.status, 'completed');
  assert.equal(run.status, 'awaiting-review');
  assert.throws(() => approveInboxRun(completed), /already been reviewed/);
  run.values.debt = '';
  assert.throws(() => approveInboxRun(run), /confirm every/);
});

test('new arrivals start fresh and workflow draft edits do not change received runs', () => {
  const state = initialState();
  state.workflow.name = 'Changed draft';
  state.workflow.steps = [];
  assert.equal(state.runs[0].workflowName, 'Refinancing pressure monitor');
  const next = createInboxRun();
  assert.notEqual(next.id, state.runs[0].id);
  assert.equal(next.status, 'awaiting-review');
  assert.deepEqual(next.checked, {});
});

test('independent sources join once before a shared processing chain', () => {
  const steps = initialState().workflow.steps;
  const sources = steps.filter(s => s.type === 'watch');
  const join = steps.find(s => s.type === 'super');
  const edges = workflowEdges(steps);
  assert.equal(sources.length, 2);
  for (const source of sources) assert.deepEqual(edges.filter(e => e.from === source.id), [{ from: source.id, to: join.id }]);
  assert.equal(edges.filter(e => e.from === join.id).length, 1);
  assert.equal(edges.length, steps.length - 1);
  const withoutOneSource = steps.filter(s => s.id !== sources[0].id);
  assert.ok(workflowEdges(withoutOneSource).every(e => e.from !== sources[0].id));
  assert.deepEqual(validateWorkflow(withoutOneSource), []);
});

test('source type determines validation and switching preserves its own configuration', () => {
  const source = newSource('web');
  assert.ok(sourceErrors(source).url);
  sourceConfig(source).url = 'javascript:alert(1)';
  assert.ok(sourceErrors(source).url);
  sourceConfig(source).url = 'https://example.com/news';
  assert.deepEqual(sourceErrors(source), {});
  switchSourceType(source, 'email');
  assert.ok(sourceErrors(source).inbox);
  assert.equal(sourceErrors(source).url, undefined);
  sourceConfig(source).inbox = 'credit@example.com';
  assert.deepEqual(sourceErrors(source), {});
  switchSourceType(source, 'web');
  assert.equal(sourceConfig(source).url, 'https://example.com/news');
  switchSourceType(source, 'email');
  assert.equal(sourceConfig(source).inbox, 'credit@example.com');
});

test('missing sources, misplaced sources, and incomplete fields block activation', () => {
  const steps = initialState().workflow.steps;
  assert.ok(validateWorkflow(steps.filter(s => s.type !== 'watch')).some(e => e.includes('at least one source')));
  const incomplete = newSource('email');
  assert.ok(validateWorkflow([incomplete, ...steps]).some(e => e.includes('Email inbox is required')));
  assert.ok(validateWorkflow([...steps, steps[0]]).some(e => e.includes('Super Signal before')));
});

test('legacy workflow migration preserves processing and source selection and is idempotent', () => {
  const workflow = { active: true, steps: [{ id: 'old-source', type: 'watch', value: 'News & subscriptions', note: 'Watch credit news' }, newStep('assign', 'old-action')] };
  migrateWorkflow(workflow);
  assert.equal(workflow.steps[0].id, 'old-source');
  assert.equal(sourceConfig(workflow.steps[0]).group, 'News & subscriptions');
  assert.equal(workflow.steps[0].note, 'Watch credit news');
  assert.equal(workflow.steps[1].type, 'super');
  assert.equal(workflow.steps[4].id, 'old-action');
  assert.equal(workflow.active, false);
  assert.deepEqual(validateWorkflow(workflow.steps), []);
  const saved = JSON.stringify(workflow);
  migrateWorkflow(workflow);
  assert.equal(JSON.stringify(workflow), saved);
});


test('Super Signal creates on first arrival and updates the same source signal in place', () => {
  const first = { sourceId: 'web', signalId: 'A', issuerId: 'aster', topic: 'Refinancing pressure', content: 'Initial report', receivedAt: '2026-01-01' };
  const created = receiveSignal([], first);
  assert.equal(created.outcome, 'created');
  assert.equal(created.superSignal.signals.length, 1);
  const updated = receiveSignal(created.superSignals, { ...first, content: 'Revised report', receivedAt: '2026-01-02' });
  assert.equal(updated.outcome, 'updated');
  assert.equal(updated.superSignals.length, 1);
  assert.equal(updated.superSignal.id, created.superSignal.id);
  assert.equal(updated.superSignal.signals.length, 1);
  assert.equal(updated.superSignal.signals[0].content, 'Revised report');
  assert.equal(updated.superSignal.signals[0].history[0].content, 'Initial report');
  const otherSource = receiveSignal(updated.superSignals, { ...first, sourceId: 'email' });
  assert.equal(otherSource.superSignal.signals.length, 2);
  const newSignal = receiveSignal(otherSource.superSignals, { ...first, signalId: 'B' });
  assert.equal(newSignal.superSignal.signals.length, 3);
  const uncovered = receiveSignal(newSignal.superSignals, { ...first, issuerId: 'uncovered' });
  assert.equal(uncovered.superSignals.length, 2);
  assert.equal(matchesPortfolio(uncovered.superSignal, ['aster']), false);
  assert.equal(matchesPortfolio(created.superSignal, ['aster']), true);
});

test('v2 migration folds dedupe and grouping into Super Signal and pins portfolio filtering next', () => {
  const workflow = { schemaVersion: 2, active: true, steps: [newSource('web', 'src', 'Policy', { url: 'https://example.com' }), { id: 'join', type: 'join', note: 'Original sources' }, { id: 'dedupe', type: 'dedupe', value: 'Same event within 48 hours' }, { id: 'group', type: 'group', value: 'Margin compression', note: 'Watch pulp prices' }, newStep('assign', 'action'), newStep('match', 'filter')] };
  migrateWorkflow(workflow);
  assert.deepEqual(workflow.steps.map(s => s.type), ['watch', 'super', 'match', 'extract', 'assign']);
  assert.equal(workflow.steps[1].value, 'Margin compression');
  assert.equal(workflow.steps[1].note, 'Original sources\nWatch pulp prices');
  assert.equal(workflow.retiredSteps.length, 2);
  assert.deepEqual(validateWorkflow(workflow.steps), []);
  const [source, superStep, match, extract, action] = workflow.steps;
  assert.ok(validateWorkflow([source, match, superStep, extract, action]).some(e => e.includes('immediately after')));
});

test('publish is a standalone action after portfolio filtering with profile defaults', () => {
  const step = newStep('publish', 'publication', 'analyst@example.com');
  assert.equal(step.value, 'Analytical Desktop');
  assert.equal(step.publishing.prompt, defaultSummaryPrompt);
  assert.equal(step.publishing.to, 'analyst@example.com');
  const steps = initialState().workflow.steps.filter(s => ['watch', 'super', 'match'].includes(s.type));
  assert.deepEqual(validateWorkflow([...steps, step]), []);
  step.publishing.prompt = ' ';
  assert.ok(validateWorkflow([...steps, step]).some(e => e.includes('summarization prompt')));
});

test('email publishing validates each recipient and ignores saved emails for desktop', () => {
  const step = newStep('publish');
  step.value = 'Email';
  step.publishing.to = 'analyst@example.com';
  step.publishing.additionalRecipients = [' colleague@example.com ', 'invalid'];
  assert.ok(publishingErrors(step)['recipient-1']);
  step.publishing.additionalRecipients[1] = 'ANALYST@example.com';
  assert.ok(publishingErrors(step)['recipient-1'].includes('already included'));
  step.publishing.additionalRecipients.pop();
  assert.deepEqual(publishingErrors(step), {});
  assert.deepEqual(publishingRecipients(step), ['analyst@example.com', 'colleague@example.com']);
  step.publishing.to = '';
  assert.ok(publishingErrors(step).to);
  step.value = 'Analytical Desktop';
  assert.deepEqual(publishingErrors(step), {});
  assert.deepEqual(publishingRecipients(step), []);
});


test('portfolio matching fans out into independent analysis and publishing paths', () => {
  const steps = initialState().workflow.steps;
  const publishing = newStep('publish', 'publication');
  steps.push(publishing);
  const match = steps.find(s => s.type === 'match'), extract = steps.find(s => s.type === 'extract');
  const edges = workflowEdges(steps);
  assert.deepEqual(new Set(edges.filter(e => e.from === match.id).map(e => e.to)), new Set([extract.id, publishing.id]));
  assert.equal(edges.some(e => e.to === publishing.id && e.from !== match.id), false);
  assert.equal(workflowBranches(steps).length, 2);
  assert.deepEqual(validateWorkflow(steps), []);
});

test('review and extraction prerequisites must belong to the same path', () => {
  const steps = initialState().workflow.steps;
  const review = steps.find(s => s.type === 'review');
  review.branch = 'summary';
  const publishing = newStep('publish');
  steps.splice(steps.indexOf(review), 0, publishing);
  const errors = validateWorkflow(steps);
  assert.ok(errors.some(e => e.includes('Scenario analysis: Extract inputs and review')));
  assert.ok(errors.some(e => e.includes('Summary & publishing: Extract inputs before reviewing')));
});

test('linear v3 draft migration preserves settings and splits publishing from analysis', () => {
  const workflow = initialState().workflow;
  workflow.schemaVersion = 3;
  const publishing = newStep('publish', 'publication', 'owner@example.com');
  publishing.publishing.prompt = 'Keep my custom prompt';
  workflow.steps.push(publishing);
  const topic = workflow.steps.find(s => s.type === 'super');
  topic.value = 'Margin compression'; topic.note = 'Keep this topic';
  migrateWorkflow(workflow);
  assert.equal(workflow.schemaVersion, 4);
  assert.equal(topic.value, 'Margin compression');
  assert.equal(publishing.publishing.prompt, 'Keep my custom prompt');
  assert.equal(publishing.publishing.to, 'owner@example.com');
  assert.equal(workflowBranches(workflow.steps).length, 2);
  assert.deepEqual(validateWorkflow(workflow.steps), []);
  const saved = JSON.stringify(workflow);
  migrateWorkflow(workflow);
  assert.equal(JSON.stringify(workflow), saved);
});

test('unchanged replay stops at Super Signal without a new version or downstream trigger', () => {
  const signal = { sourceId: 'web', signalId: 'A', issuerId: 'aster', topic: 'Refinancing', content: 'Debt schedule', facts: { debt: 1200, currency: 'EUR' }, receivedAt: '2026-01-01' };
  const first = receiveSignal([], signal);
  assert.equal(first.shouldContinue, true);
  const replay = receiveSignal(first.superSignals, { ...signal, facts: { currency: 'EUR', debt: 1200 }, receivedAt: '2026-01-02', sourceName: 'Updated display name' });
  assert.equal(replay.outcome, 'duplicate');
  assert.equal(replay.shouldContinue, false);
  assert.equal(replay.superSignal.revision, 1);
  assert.equal(replay.superSignal.signals[0].revision, 1);
  assert.equal(replay.superSignal.signals[0].history.length, 0);
  assert.equal(replay.superSignal.signals.length, 1);
  const changed = receiveSignal(replay.superSignals, { ...signal, facts: { debt: 1400, currency: 'EUR' } });
  assert.equal(changed.outcome, 'updated');
  assert.equal(changed.shouldContinue, true);
  assert.equal(changed.superSignal.revision, 2);
  assert.equal(changed.superSignal.signals[0].revision, 2);
  assert.equal(changed.superSignal.signals[0].history[0].facts.debt, 1200);
  assert.equal(changed.superSignal.signals.length, 1);
  const repeatedUpdate = receiveSignal(changed.superSignals, { ...signal, facts: { debt: 1400, currency: 'EUR' }, receivedAt: '2026-01-03' });
  assert.equal(repeatedUpdate.shouldContinue, false);
  assert.equal(repeatedUpdate.superSignal.revision, 2);
});


test('shared enrichment sits after filtering and feeds both paths', () => {
  const steps = initialState().workflow.steps, context = newStep('enrich'), publish = newStep('publish');
  steps.splice(steps.findIndex(s => s.type === 'match') + 1, 0, context); steps.push(publish);
  assert.deepEqual(validateWorkflow(steps), []);
  const edges = workflowEdges(steps), match = steps.find(s => s.type === 'match');
  assert.deepEqual(edges.filter(e => e.from === match.id).map(e => e.to), [context.id]);
  assert.equal(edges.filter(e => e.from === context.id).length, 2);
  context.enrichment.datasets = []; assert.ok(enrichmentErrors(context).length);
});
test('enrichment retains dates, flags stale data and pauses only under review policy', () => {
  const step = newStep('enrich'); step.enrichment.datasets = ['ratings', 'models'];
  let snapshot = enrichmentSnapshot(step);
  assert.equal(snapshot.datasets.length, 2); assert.equal(snapshot.issues[0].id, 'models'); assert.equal(snapshot.paused, false);
  step.enrichment.issues = 'pause'; snapshot = enrichmentSnapshot(step, ['ratings']);
  assert.equal(snapshot.paused, true); assert.equal(snapshot.datasets[0].values, null); assert.equal(snapshot.datasets[0].asOf, null);
  assert.equal(snapshot.datasets[1].status, 'Stale');
});
