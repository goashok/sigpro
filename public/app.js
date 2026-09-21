import { catalog, newStep, initialState, stories, validateWorkflow, scenarioResult, assumptionFields, createInboxRun, approveInboxRun, sourceTypes, newSource, sourceConfig, switchSourceType, sourceErrors, sourceSummary, workflowEdges, migrateWorkflow, receiveSignal, matchesPortfolio, sampleUser, defaultSummaryPrompt, publishingErrors, publishingRecipients, branchOf, workflowBranches, enrichmentDatasets, enrichmentErrors, enrichmentSnapshot, enrichmentSampleDate } from './model.js';

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  inbox: '<path d="M4 4h16l2 11v5H2v-5L4 4Z"/><path d="M2 15h6l2 3h4l2-3h6"/>',
  network: '<rect x="8" y="2" width="8" height="6" rx="1.5"/><rect x="2" y="16" width="7" height="6" rx="1.5"/><rect x="15" y="16" width="7" height="6" rx="1.5"/><path d="M12 8v4M5.5 16v-4h13v4"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12a22 22 0 0 0 18 0M10 13h4"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  sparkles: '<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4M18 4h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chart: '<path d="M3 3v18h18M7 16l4-5 4 2 6-8"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',
  clipboard: '<rect x="5" y="5" width="14" height="17" rx="2"/><rect x="8" y="2" width="8" height="5" rx="1"/><path d="M9 12h6M9 16h4"/>',
  landmark: '<path d="m2 8 10-6 10 6H2ZM4 20h16M2 23h20M5 10v8M12 10v8M19 10v8"/>',
  globe: '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  play: '<path d="m7 4 14 8-14 8V4Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="17" r="3" fill="currentColor"/>',
  book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Z"/>',
  bell: '<path d="M5 9a7 7 0 0 1 14 0v7l2 3H3l2-3V9ZM9 22h6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let state;
try { state = JSON.parse(localStorage.getItem('sigpro-v1')); } catch {}
if (!state || state.version !== 1) state = initialState();
state.user ||= { ...sampleUser };
function initializeWorkflows() {
  if (!Array.isArray(state.workflows)) state.workflows = state.workflow ? [state.workflow] : [];
  for (const workflow of state.workflows) { workflow.id ||= crypto.randomUUID(); migrateWorkflow(workflow); }
  state.workflow = state.workflows.find(w => w.id === state.selectedWorkflowId) || state.workflows[0];
  state.selectedWorkflowId = state.workflow?.id || null;
}
initializeWorkflows();
let workflowLibrary = true;
if (!Array.isArray(state.runs)) state.runs = [createInboxRun()];
let view = 'inbox', selected = 'aster', filter = 'All signals', query = '', selectedStep = state.workflow?.steps[0]?.id, zoom = 0.8, modal = null, addBranch = 'analysis';
const app = document.querySelector('#app');
const getStory = () => stories.find(s => s.id === selected) || stories[0];
const priority = s => state.overrides[s.id]?.priority || s.priority;
const latestRun = storyId => state.runs.find(run => run.storyId === storyId);
const awaitingReview = storyId => latestRun(storyId)?.status === 'awaiting-review';
const modalRun = () => state.runs.find(run => run.id === modal?.payload);
function save() { try { localStorage.setItem('sigpro-v1', JSON.stringify(state)); } catch { toast('Browser storage is unavailable. Changes will last for this session.'); } }
let toastTimer;
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000); }
function badge(text, cls = '') { return `<span class="badge ${cls}">${esc(text)}</span>`; }
function button(text, action, cls = 'secondary', ico = '') { return `<button class="btn ${cls}" data-action="${action}">${ico ? icon(ico) : ''}${text}</button>`; }

function shell() {
  const nav = [['inbox', 'inbox', 'Signal inbox'], ['workflow', 'network', 'Workflow studio'], ['sources', 'radio', 'My sources'], ['actions', 'clipboard', 'Action center']];
  app.innerHTML = `<aside class="sidebar">
    <a class="brand" href="#" data-action="nav-inbox"><span class="brand-mark">${icon('chart')}</span>sigpro<span class="brand-dot">.</span></a>
    <button class="workspace" data-action="portfolio"><span class="workspace-icon">EC</span><span>European corporates<small>Credit research workspace</small></span><span class="tiny-chevron">⌄</span></button>
    <div class="nav-caption">WORKSPACE</div><nav>${nav.map(([id, ico, label]) => `<button class="nav-item ${view === id ? 'active' : ''}" data-action="nav-${id}">${icon(ico)}<span>${label}</span>${id === 'inbox' ? '<b class="nav-count">4</b>' : id === 'actions' && state.actions.length ? `<b class="nav-count">${state.actions.length}</b>` : ''}${id === 'workflow' ? '<span class="new-dot"></span>' : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="demo-card"><span class="live-dot"></span> Interactive prototype<p>A clearer path from information to credit insight.</p><button data-action="guide">Explore the demo ${icon('arrow')}</button></div><button class="profile" data-action="portfolio"><span class="avatar">AL</span><span>Alex Laurent<small>Senior credit analyst</small></span>${icon('settings')}</button></div>
  </aside><div class="main-shell"><header class="topbar"><div class="breadcrumb">Workspace ${icon('chevron')} <strong>${nav.find(n => n[0] === view)?.[2]}</strong></div><div class="topbar-right"><span class="sample-label"><span></span> Sample data</span><span class="top-divider"></span><button class="icon-button" aria-label="Open action center" data-action="nav-actions">${icon('bell')}${state.actions.length ? '<i class="notification-dot"></i>' : ''}</button><span class="avatar small">AL</span></div></header><main id="main"></main><footer class="app-footer"><span>Illustrative issuers & evidence · No live feeds or external actions</span><button data-action="reset">Reset demo</button></footer></div>`;
  renderView();
}
function renderView() {
  if (canvasSimulation.running) cancelSimulation('Simulation stopped because the view or workflow changed.');
  document.querySelector('#main').innerHTML = view === 'workflow' ? workflowLibrary ? workflowListView() : button('All workflows', 'workflow-list', 'secondary', 'arrow') + workflowView() : view === 'sources' ? sourcesView() : view === 'actions' ? actionsView() : inboxView();
  if (view === 'workflow' && !workflowLibrary) {
    markHumanInputSteps();
    requestAnimationFrame(() => { drawConnections(); paintSimulation(); });
  }
}
function markHumanInputSteps() {
  for (const step of state.workflow.steps) {
    const required = step.type === 'review';
    const conditional = step.type === 'enrich' && step.enrichment?.issues === 'pause';
    if (!required && !conditional) continue;
    const card = [...document.querySelectorAll('.flow-node')].find(node => node.dataset.step === step.id);
    if (!card) continue;
    card.classList.add('human-input-node');
    const marker = document.createElement('span');
    marker.className = 'human-input-marker';
    marker.innerHTML = `${icon('users')} ${required ? 'Human input required' : 'Human review if data issues'}`;
    marker.title = required ? 'This path pauses until an analyst reviews assumptions in the Signal Inbox.' : 'Both paths pause for data review when enrichment finds stale or missing data.';
    card.querySelector('.node-heading').after(marker);
  }
}
function selectWorkflowStep(id) {
  selectedStep = id;
  // Keep the canvas mounted so selecting a step preserves its scroll and focus.
  const template = document.createElement('template');
  template.innerHTML = workflowView();
  document.querySelector('.step-inspector').replaceWith(template.content.querySelector('.step-inspector'));
  document.querySelectorAll('.flow-node').forEach(node => {
    node.classList.toggle('selected', node.dataset.step === id);
  });
}
function workflowListView() {
  return `${pageHead('WORKFLOW STUDIO', 'Your workflows', 'Create separate processes for the credits, sources, and actions you monitor.', button('Create workflow', 'create-workflow', 'primary', 'plus'))}<div class="workflow-library">${state.workflows.map(w => `<article class="workflow-library-card"><div>${badge(w.active ? 'Active · demo' : 'Draft', w.active ? 'support-badge' : 'neutral')}<h2>${esc(w.name)}</h2><p>${w.steps.filter(s => s.type === 'watch').length} sources · ${w.steps.length} steps · ${workflowBranches(w.steps).length} paths</p></div><div class="workflow-card-actions"><button class="btn secondary" data-open-workflow="${w.id}">Open workflow ${icon('arrow')}</button><button class="btn danger subtle" data-remove-workflow="${w.id}" aria-label="Remove ${esc(w.name)}">${icon('trash')} Remove</button></div></article>`).join('')}</div>${state.workflows.length ? '' : '<div class="empty-state large"><h2>No workflows yet</h2><p>Create a workflow to start monitoring signals.</p></div>'}`;
}
function openWorkflow(id) {
  cancelSimulation();
  state.workflow = state.workflows.find(w => w.id === id);
  state.selectedWorkflowId = id;
  resetSimulation();
  canvasSimulation.open = false;
  selectedStep = state.workflow.steps[0]?.id; zoom = 0.8;
  workflowLibrary = false; save(); renderView();
}
function pageHead(eyebrow, title, description, controls = '') { return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="page-controls">${controls}</div></div>`; }
function inboxView() {
  const list = stories.filter(s => (filter !== 'High priority' || priority(s) === 'High' || priority(s) === 'Critical') && (filter !== 'Needs review' || awaitingReview(s.id)) && `${s.issuer} ${s.title} ${s.sector}`.toLowerCase().includes(query.toLowerCase()));
  if (list.length && !list.some(s => s.id === selected)) selected = list[0].id;
  return `${pageHead('YOUR CREDIT RADAR', 'Less noise. More perspective.', 'The developments that matter to your portfolio, connected and in context.', button('Simulate signal arrival', 'simulate-arrival', 'secondary', 'radio'))}
    <div class="stats-grid"><div class="stat"><span>Source reports ${icon('radio')}</span><strong>16 <small>from 5 sample sources</small></strong><div class="stat-foot">All original evidence retained</div></div><div class="stat"><span>Distinct signals ${icon('layers')}</span><strong>8 <small class="teal-text">50% less noise</small></strong><div class="stat-foot">Repeated reports brought together</div></div><div class="stat"><span>Credit stories ${icon('network')}</span><strong>4 <small>across 4 covered issuers</small></strong><div class="stat-foot">Evidence connected to credit impact</div></div><div class="stat"><span>Awaiting your review ${icon('clock')}</span><strong>${stories.filter(s => awaitingReview(s.id)).length} <small class="amber-text">workflow checkpoint</small></strong><div class="stat-foot">Review assumptions to continue</div></div></div>
    <div class="inbox-layout"><section class="signal-panel"><div class="panel-heading"><h2>Your signal inbox <span>4</span></h2><button class="text-button" data-action="sort">Priority ${icon('settings')}</button></div><div class="tabs">${['All signals', 'High priority', 'Needs review'].map(f => `<button class="tab ${f === filter ? 'active' : ''}" data-filter="${f}">${f}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="signal-search" type="search" placeholder="Search issuers, signals, or sectors…" value="${esc(query)}" aria-label="Search signals"/><kbd>/</kbd></label><div class="signal-list">${list.length ? list.sort((a, b) => ['Critical', 'High', 'Medium', 'Low'].indexOf(priority(a)) - ['Critical', 'High', 'Medium', 'Low'].indexOf(priority(b))).map(s => `<button class="signal-card ${selected === s.id ? 'selected' : ''}" data-story="${s.id}"><div class="signal-meta"><span class="issuer-logo ${s.color}">${s.initials}</span><span class="issuer-name">${s.issuer}<small>${s.sector} <span>·</span> ${s.rating}</small></span>${badge(priority(s), priority(s).toLowerCase())}</div><h3>${s.title}</h3><p>${s.summary}</p>${latestRun(s.id) ? `<div class="inbox-run-label ${awaitingReview(s.id) ? 'pending' : 'done'}">${icon(awaitingReview(s.id) ? 'clock' : 'check')}${awaitingReview(s.id) ? 'Action required · Review assumptions' : 'Workflow complete · Scenario ready'}</div>` : ''}<div class="signal-bottom"><span>${icon('network')} ${s.signals} ${s.signals === 1 ? 'signal' : 'signals'} ${badge('Credit story', 'story-badge')}</span><span>${state.reviewed.includes(s.id) ? icon('check') + ' Read' : s.time}</span></div></button>`).join('') : '<div class="empty-state">No stories match this view.<p>Try another search or filter.</p></div>'}</div><div class="list-footer">You’re seeing all stories in this sample portfolio ${icon('check')}</div></section>${list.length ? storyDetail(getStory()) : '<aside class="story-detail empty-state">No stories in this view need your attention.</aside>'}</div>`;
}
function storyDetail(s) {
  return `<aside class="story-detail"><div class="detail-top"><span class="eyebrow">CREDIT STORY</span><button class="icon-button" data-action="export-story" aria-label="Export this credit story">${icon('download')}</button></div><div class="detail-issuer"><span class="issuer-logo ${s.color}">${s.initials}</span><div><h2>${s.issuer}</h2><span>${s.rating} · ${s.sector}</span></div></div><h2 class="story-title">${s.title}</h2><div class="story-tags">${badge(priority(s) + ' priority', priority(s).toLowerCase())}${badge(s.mechanism, 'neutral')}</div>${inboxRunPanel(s)}<div class="impact-box"><div>${icon('sparkles')} Why this matters to your credit</div><p>${s.rationale}</p><span>Portfolio exposure <strong>${s.exposure}</strong> <span>·</span> ${s.confidence} confidence</span></div><div class="section-title"><h3>Connected evidence</h3><span>${s.signals} signals · ${s.reports} reports</span></div><div class="evidence-list">${s.evidence.map((e, i) => `<button class="evidence-item" data-evidence="${i}"><span class="evidence-line"><span class="evidence-dot ${e.role === 'Supports' ? 'support' : 'mixed'}"></span></span><span class="evidence-content"><span class="evidence-heading">${esc(e.title)} ${icon('chevron')}</span><span class="evidence-source">${e.source} <span>·</span> ${e.time}</span><span class="evidence-bottom">${badge(e.role, e.role === 'Supports' ? 'support-badge' : 'mixed-badge')}<span>${e.duplicates} source report${e.duplicates > 1 ? 's' : ''}</span></span></span></button>`).join('')}</div><div class="section-title priority-title"><h3>Priority assessment</h3><button class="text-button" data-action="priority">Adjust</button></div><div class="priority-grid">${[['Importance', s.importance], ['Severity', s.severity], ['Urgency', s.urgency]].map(([k, v]) => `<div><span>${k}</span><strong><i class="priority-dot ${v === 'High' ? 'high' : 'medium'}"></i>${v}</strong></div>`).join('')}</div>${state.overrides[s.id] ? `<p class="override-note">Analyst override: ${esc(state.overrides[s.id].reason)}</p>` : ''}<div class="detail-actions">${button('Explore impact', 'scenario', 'primary', 'chart')}${button('Take action', 'take-action', 'secondary', 'plus')}</div><button class="review-button" data-action="mark-reviewed">${icon('check')} ${state.reviewed.includes(s.id) ? 'Read · Mark as unread' : 'Mark story as read'}</button></aside>`;
}

function workflowLayout() {
  const steps = state.workflow.steps, sources = steps.filter(s => s.type === 'watch'), shared = steps.filter(s => !['watch', 'super'].includes(s.type));
  const width = Math.max(950, sources.length * 305 + 40), positions = {};
  sources.forEach((s, i) => positions[s.id] = { x: (width - (sources.length * 305 - 45)) / 2 + i * 305, y: 50 });
  const join = steps.find(s => s.type === 'super');
  if (join) positions[join.id] = { x: width / 2 - 130, y: 265 };
  const match = steps.find(step => step.type === 'match');
  if (match) positions[match.id] = { x: width / 2 - 130, y: 480 };
  const context = steps.find(step => step.type === 'enrich'), branchY = context ? 1000 : 770;
  if (context) positions[context.id] = { x: width / 2 - 130, y: 735 };
  for (const branch of workflowBranches(steps)) branch.steps.forEach((step, index) => positions[step.id] = { x: (width - 950) / 2 + (branch.id === 'analysis' ? 95 : 595), y: branchY + index * 200 });
  for (const step of steps) positions[step.id] = { x: step.x ?? positions[step.id]?.x ?? 35, y: step.y ?? positions[step.id]?.y ?? 50 };
  return { width, branchY, height: Math.max(1000, ...Object.values(positions).map(p => p.y + 220)), positions };
}
function sourceInspector(step) {
  const definition = sourceTypes[step.sourceType], config = sourceConfig(step), errors = sourceErrors(step);
  return `<label class="form-label">Source name<input data-source-field="name" value="${esc(step.name)}" placeholder="Name this source" required maxlength="80"/>${errors.name ? `<small class="field-error">${errors.name}</small>` : ''}</label><label class="form-label">Source type<select id="source-type">${Object.entries(sourceTypes).map(([key, type]) => `<option value="${key}" ${key === step.sourceType ? 'selected' : ''}>${type.label}</option>`).join('')}</select></label>${definition.fields.map(field => `<label class="form-label">${field.label}<span>${field.required || field.options ? 'Required' : 'Optional'}</span>${field.options ? `<select data-source-field="${field.key}">${field.options.map(option => `<option ${config[field.key] === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>` : `<input data-source-field="${field.key}" type="${field.type || 'text'}" value="${esc(config[field.key] || '')}" placeholder="${esc(field.placeholder || '')}" ${field.required ? 'required' : ''}/>`}${errors[field.key] ? `<small class="field-error">${errors[field.key]}</small>` : ''}</label>`).join('')}<div class="source-connection-note">${icon('network')} Connected to Create / update Super Signal</div><p class="field-source">Sample configuration only. No content is fetched or email account connected.</p>`;
}
function publishingInspector(step) {
  const config = step.publishing, errors = publishingErrors(step);
  return `<label class="form-label">Publishing platform<select id="step-value">${catalog.publish.options.map(platform => `<option ${step.value === platform ? 'selected' : ''}>${platform}</option>`).join('')}</select></label><label class="form-label">Summarization prompt<textarea id="summary-prompt" data-publish-field="prompt" required>${esc(config.prompt)}</textarea>${errors.prompt ? `<small class="field-error">${errors.prompt}</small>` : ''}</label><button class="text-button prompt-reset" data-action="reset-summary-prompt">Restore default prompt</button>${step.value === 'Email' ? `<div class="email-publishing"><label class="form-label">To<input type="email" data-publish-field="to" value="${esc(config.to)}" placeholder="analyst@example.com" required/>${errors.to ? `<small class="field-error">${errors.to}</small>` : ''}</label><p class="field-source">Defaults to your sample profile: ${esc(state.user.email)}. You can change it.</p><div class="section-title recipient-heading"><h3>Additional recipients</h3><span>Optional</span></div>${config.additionalRecipients.map((email, index) => `<div class="recipient-row"><label class="form-label">Recipient ${index + 2}<input type="email" data-publish-recipient="${index}" value="${esc(email)}" placeholder="colleague@example.com" required/>${errors['recipient-' + index] ? `<small class="field-error">${errors['recipient-' + index]}</small>` : ''}</label><button class="icon-button" data-remove-recipient="${index}" aria-label="Remove recipient ${index + 2}">${icon('close')}</button></div>`).join('')}${button('Add recipient', 'add-publish-recipient', 'secondary compact', 'plus')}</div>` : `<div class="inspector-hint">${icon('briefcase')}<p>The summary is intended for your Analytical Desktop workspace, linked to the Super Signal and its source evidence.</p></div>`}<div class="inspector-hint">${icon('sparkles')}<p>This step can follow the portfolio filter directly. Scenario inputs and assumption review are not required for a summary.</p></div>${button('Preview publication', 'preview-publication', 'secondary', 'book')}<p class="field-source">Prototype only. No AI request, desktop publication, or email is sent.</p>`;
}
function publicationPreview(step) {
  const errors = Object.values(publishingErrors(step));
  if (errors.length) return `<div class="validation-box"><h3>Complete the publishing settings</h3>${errors.map(message => `<p>${esc(message)}</p>`).join('')}</div>${button('Back to settings', 'close-modal')}`;
  const story = stories[0];
  return `<div class="info-banner">${icon('book')} Illustrative content only. Your edited prompt is saved for execution in a full implementation; it is not run in this prototype.</div><div class="publication-route"><strong>${esc(step.value)}</strong><p>${step.value === 'Email' ? 'To: ' + esc(publishingRecipients(step).join(', ')) : 'Workspace: European corporates · Super Signal: Aster Automotive'}</p></div><details class="publish-trace"><summary>Summarization prompt</summary><p>${esc(step.publishing.prompt)}</p></details><article class="publication-sample"><div class="eyebrow">SAMPLE SUPER SIGNAL SUMMARY</div><h3>${story.issuer}: ${story.mechanism}</h3><p>${story.summary}</p><p>${story.rationale}</p><h4>Evidence and uncertainty</h4><ul>${story.evidence.map(e => `<li>${esc(e.text)} <small>${esc(e.source)} · ${esc(e.reference)}</small></li>`).join('')}</ul><p>This is a potential credit implication, not a rating action. The available liquidity partly offsets the pressure and requires analyst judgment.</p></article><div class="modal-actions">${button('Back to settings', 'close-modal')}</div><p class="modal-disclaimer">Delivery is simulated; no external publication or email is created.</p>`;
}
function branchInspector() {
  return `<div class="inspector-hint"><p>Enrich once before these paths split. Both paths receive the same dated context.</p></div>${button(state.workflow.steps.some(s => s.type === 'enrich') ? 'Configure shared enrichment' : 'Add shared enrichment', 'add-enrichment', 'secondary', 'layers')}<div class="branch-picker"><h3>Paths for portfolio matches</h3><p>Choose one or both. Each path receives the same Super Signal.</p>${['analysis', 'summary'].map(id => { const path = workflowBranches(state.workflow.steps).find(branch => branch.id === id); return `<button class="branch-choice" data-action="add-path-${id}"><span class="node-icon ${id === 'analysis' ? 'purple' : 'teal'}">${icon(id === 'analysis' ? 'chart' : 'book')}</span><span><strong>${id === 'analysis' ? 'Extract Scenario Inputs' : 'Summarize and Publish'}</strong><small>${path ? path.steps.length + ' steps · Configure path' : 'Add this path'}</small></span>${icon(path ? 'chevron' : 'plus')}</button>`; }).join('')}</div>`;
}
function branchCanvasControls(layout) {
  return ['analysis', 'summary'].map(id => {
    const exists = workflowBranches(state.workflow.steps).some(branch => branch.id === id), x = (layout.width - 950) / 2 + (id === 'analysis' ? 95 : 595);
    return `<div class="branch-lane-label" style="left:${x}px;top:${layout.branchY - 60}px"><span>${id === 'analysis' ? 'A · SCENARIO ANALYSIS' : 'B · SUMMARY & PUBLISHING'}</span><small>${exists ? 'Runs independently on portfolio match' : 'Optional path'}</small></div>${!exists ? `<button class="empty-branch" style="left:${x}px;top:${layout.branchY}px" data-action="add-path-${id}">${icon('plus')}<strong>${id === 'analysis' ? 'Extract Scenario Inputs' : 'Summarize and Publish'}</strong><span>Add this path from Match my portfolio</span></button>` : ''}`;
  }).join('');
}
function workflowView() {
  const w = state.workflow, step = w.steps.find(s => s.id === selectedStep), info = step && catalog[step.type], layout = workflowLayout();
  const sources = w.steps.filter(s => s.type === 'watch'), shared = w.steps.filter(s => !['watch', 'super'].includes(s.type));
  const branch = step && workflowBranches(w.steps).find(branch => branch.id === branchOf(step));
  const branchSteps = branch?.steps || [], stepIndex = branchSteps.indexOf(step), canMove = stepIndex > 0;
  return `${pageHead('DESIGNED BY YOU', 'Many sources. One credit workflow.', 'Filter to your portfolio, then summarize, analyze, or follow both paths.', button('Preview flow', 'preview', 'secondary', 'play') + button('Try signal arrivals', 'try-signal-arrivals', 'secondary', 'radio') + button(w.active ? 'Pause workflow' : 'Activate workflow', 'activate', w.active ? 'secondary' : 'primary', w.active ? 'clock' : 'check'))}
  <div class="workflow-shell"><div class="workflow-toolbar"><div><button class="workflow-name" data-action="rename">${esc(w.name)} ${icon('settings')}</button>${badge(w.active ? 'Active · demo' : 'Draft', w.active ? 'support-badge' : 'neutral')}<small>Saved in this browser</small></div><div class="workflow-add-buttons">${button('Add source', 'add-workflow-source', 'secondary compact', 'radio')}${button('Add step', 'add-step', 'secondary compact', 'plus')}</div></div><section id="simulation-panel" class="simulation-panel" ${canvasSimulation.open ? '' : 'hidden'}>${simulationPanel()}</section><div class="workflow-body"><div class="canvas-scroll"><div class="canvas-tip">${icon('network')} ${sources.length} source${sources.length === 1 ? '' : 's'} → Super Signal → portfolio filter <span>Drag to arrange · Select to configure</span></div><div class="canvas" style="width:${layout.width * zoom}px;height:${layout.height * zoom}px"><div class="canvas-inner" style="width:${layout.width}px;transform:scale(${zoom});height:${layout.height}px"><svg id="connections" aria-hidden="true"></svg><div class="canvas-stage-label" style="top:15px;width:${layout.width}px">01 · YOUR SOURCES</div><div class="canvas-stage-label" style="top:445px;width:${layout.width}px">02 · PORTFOLIO FILTER</div>${w.steps.map((node, i) => {
    const c = catalog[node.type], pos = layout.positions[node.id], isSource = node.type === 'watch', needsSetup = isSource ? Object.keys(sourceErrors(node)).length : node.type === 'enrich' ? Object.keys(enrichmentErrors(node)).length : node.type === 'publish' && Object.keys(publishingErrors(node)).length;
    return `<button class="flow-node ${selectedStep === node.id ? 'selected' : ''} ${node.type === 'super' ? 'join-node' : isSource ? 'source-node' : ''}" data-step="${node.id}" style="left:${pos.x}px;top:${pos.y}px"><div class="node-heading"><span class="node-icon ${c.color}">${icon(isSource ? sourceTypes[node.sourceType].icon : c.icon)}</span><span class="node-category">${isSource ? sourceTypes[node.sourceType].label : c.category}</span><span class="node-number">${isSource ? 'SOURCE' : node.type === 'super' ? 'SUPER' : node.type === 'match' ? 'FILTER' : node.type === 'enrich' ? 'CONTEXT' : (branchOf(node) === 'analysis' ? 'A' : 'B') + (workflowBranches(w.steps).find(branch => branch.id === branchOf(node)).steps.indexOf(node) + 1)}</span></div><h3>${esc(isSource ? node.name || 'Untitled source' : c.label)}</h3><p>${esc(isSource ? sourceSummary(node) : node.type === 'super' ? sources.length + ' sources · deduplication built in' : node.type === 'enrich' ? node.enrichment.datasets.length + ' datasets · shared context' : node.value)}</p><div class="node-footer"><span class="node-status ${needsSetup ? 'needs-setup' : ''}"></span>${needsSetup ? 'Needs configuration' : node.type === 'review' ? 'Analyst checkpoint' : node.type === 'super' ? 'First arrival creates · repeats update' : 'Configured'}<span class="node-menu">•••</span></div>${isSource ? '' : '<span class="port port-in"></span>'}<span class="port port-out"></span></button>`;
  }).join('')}<div class="filter-stop" style="left:${layout.width / 2 + 175}px;top:480px"><span>${icon('close')} Not in portfolio</span><strong>Stop here</strong><p>No downstream analysis or inbox task</p></div>${branchCanvasControls(layout)}<div class="flow-end" style="top:${layout.height - 35}px;width:${layout.width}px">${icon('check')} Every source follows the same credit process</div></div></div><div class="canvas-controls"><button class="icon-button" data-action="zoom-out" aria-label="Zoom out">−</button><span>${Math.round(zoom * 100)}%</span><button class="icon-button" data-action="zoom-in" aria-label="Zoom in">+</button><span class="vertical-line"></span><button class="text-button" data-action="arrange">Auto arrange</button></div></div><aside class="step-inspector">${step ? `<div class="inspector-label">${step.type === 'watch' ? 'SOURCE CONFIGURATION' : step.type === 'super' ? 'SUPER SIGNAL LIFECYCLE' : step.type === 'match' ? 'PORTFOLIO FILTER & BRANCHES' : step.type === 'enrich' ? 'SHARED CREDIT CONTEXT' : (branch?.label || 'Processing') + ' · STEP ' + (stepIndex + 1)}</div><span class="inspector-icon ${info.color}">${icon(step.type === 'watch' ? sourceTypes[step.sourceType].icon : info.icon)}</span><h2>${step.type === 'watch' ? 'Configure source' : info.label}</h2><p>${info.description}</p>${step.type === 'watch' ? sourceInspector(step) : step.type === 'enrich' ? enrichmentInspector(step) : step.type === 'publish' ? publishingInspector(step) : step.type === 'super' ? `<div class="join-source-list">${sources.length ? sources.map(source => `<div>${icon(sourceTypes[source.sourceType].icon)}<span>${esc(source.name)}</span>${icon('check')}</div>`).join('') : '<p>Add a source to start this flow.</p>'}</div>${button('Add another source', 'add-workflow-source', 'secondary', 'plus')}<label class="form-label">${info.field}<select id="step-value">${info.options.map(option => `<option ${option === step.value ? 'selected' : ''}>${option}</option>`).join('')}</select></label><p class="field-source">Group by issuer + credit topic. Repeat identity: source + source signal identifier.</p><div class="inspector-hint">${icon('network')}<p>The first arrival creates a Super Signal for the issuer and credit topic. A new signal joins it; the same source emitting identical content is stopped here with no version change. Changed content updates the existing entry to v2 and continues. Source references and previous versions are retained.</p></div>` : `<label class="form-label">${info.field}<select id="step-value">${info.options.map(option => `<option ${option === step.value ? 'selected' : ''}>${option}</option>`).join('')}</select></label>`}<label class="form-label">Analyst guidance <span>Optional</span><textarea id="step-note" placeholder="What should this step pay attention to?">${esc(step.note)}</textarea></label>${step.type === 'match' ? `${branchInspector()}<div class="inspector-hint">${icon('briefcase')}<p>In portfolio → follow each configured path independently. A review pause on the analysis path does not pause publishing.<br>Not in portfolio → stop this workflow. The Super Signal is retained, but no inbox review or downstream action is created for this portfolio.</p></div>` : ''}${step.type === 'review' ? `<div class="inspector-hint">${icon('inbox')}<p>Review tasks arrive on the affected story in the analyst’s inbox.</p></div>` : ''}${canMove ? `<div class="step-order"><span>Order within this path</span><button class="btn secondary compact" data-action="move-up" ${stepIndex <= 1 ? 'disabled' : ''}>↑</button><button class="btn secondary compact" data-action="move-down" ${stepIndex === branchSteps.length - 1 ? 'disabled' : ''}>↓</button></div>` : ''}${branch ? button('Add next step', 'add-branch-step', 'secondary', 'plus') : ''}${stepIndex === 0 && branchSteps.length > 1 ? '<p class="field-source">Remove the later steps before removing this path’s first step.</p>' : ''}${!['super', 'match'].includes(step.type) && !(stepIndex === 0 && branchSteps.length > 1) ? button(step.type === 'watch' ? 'Remove source' : 'Remove step', 'remove-step', 'danger subtle', 'trash') : ''}` : '<h2>Choose a step</h2><p>Select a source or processing step to configure it.</p>'}</aside></div><div class="workflow-bottom"><span>${icon('layers')} ${sources.length} sources <span>·</span> ${shared.length} shared steps <span>·</span> Sample adapters</span><span>${icon('check')} Changes saved automatically</span></div></div>`;
}
function drawConnections() {
  const svg = document.querySelector('#connections'); if (!svg) return;
  const nodes = new Map([...document.querySelectorAll('.flow-node')].map(node => [node.dataset.step, node]));
  const matchStep = state.workflow.steps.find(s => s.type === 'match'), matchNode = matchStep && nodes.get(matchStep.id), stopNode = document.querySelector('.filter-stop');
  svg.innerHTML = '<defs><marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#94a7c0"/></marker></defs>' + workflowEdges(state.workflow.steps).map(edge => {
    const node = nodes.get(edge.from), next = nodes.get(edge.to); if (!node || !next) return '';
    const x = parseFloat(node.style.left), y = parseFloat(node.style.top), nx = parseFloat(next.style.left), ny = parseFloat(next.style.top); let d;
    if (Math.abs(ny - y) > 100) {
      const down = ny > y, sy = y + (down ? 145 : 0), ey = ny + (down ? -6 : 151), mid = (sy + ey) / 2;
      d = `M${x + 130},${sy} C${x + 130},${mid} ${nx + 130},${mid} ${nx + 130},${ey}`;
    } else if (nx > x) d = `M${x + 260},${y + 73} C${x + 285},${y + 73} ${nx - 25},${ny + 73} ${nx - 6},${ny + 73}`;
    else d = `M${x},${y + 73} C${x - 25},${y + 73} ${nx + 285},${ny + 73} ${nx + 266},${ny + 73}`;
    return `<path data-from="${edge.from}" data-to="${edge.to}" d="${d}" fill="none" stroke="#a8b8cb" stroke-width="1.6" marker-end="url(#arrowhead)"/>`;
  }).join('');
  if (matchNode && stopNode) { const x = parseFloat(matchNode.style.left) + 260, y = parseFloat(matchNode.style.top) + 73, nx = parseFloat(stopNode.style.left), ny = parseFloat(stopNode.style.top) + 60; svg.innerHTML += `<path data-filter="excluded" d="M${x},${y} C${x + 20},${y} ${nx - 20},${ny} ${nx - 5},${ny}" fill="none" stroke="#c1a18b" stroke-dasharray="4 3" marker-end="url(#arrowhead)"/>`; }
}
function sourcesView() { return `${pageHead('YOUR INFORMATION ECOSYSTEM', 'Different sources. One perspective.', 'Bring the information you trust into your own credit workflow.', button('Add a source', 'add-source', 'primary', 'plus'))}<div class="info-banner">${icon('radio')}<div><strong>Your sources, your way.</strong> Personal and team sources feed the same signal model. These connections are simulated in the prototype.</div></div><div class="source-grid">${state.sources.map(s => `<article class="source-card"><div class="source-card-top"><span class="source-icon">${icon(s.icon)}</span><button class="switch ${s.enabled ? 'on' : ''}" role="switch" aria-checked="${s.enabled}" aria-label="Enable ${esc(s.name)}" data-source-toggle="${s.id}"><span></span></button></div><h2>${esc(s.name)}</h2>${badge(s.kind, 'neutral')}<p>${esc(s.detail)}</p><div class="source-card-bottom"><span><i class="status-dot ${s.enabled ? 'connected' : ''}"></i>${s.enabled ? 'Enabled in preview' : 'Paused'}</span><small>${s.owner}</small></div></article>`).join('')}</div><div class="source-note">${icon('layers')} New sources plug into the same workflow—no process redesign required.</div>`; }
function actionsView() { return `${pageHead('FROM INSIGHT TO FOLLOW-THROUGH', 'Put your perspective to work.', 'A clear record of reviews, assignments, and scenario explorations.', button('Create an action', 'take-action', 'primary', 'plus'))}<div class="action-summary">${badge(`${state.actions.filter(a => a.status === 'Open').length} open`, 'high')}${badge(`${state.actions.filter(a => a.status === 'Completed').length} completed`, 'support-badge')}<span>Actions are saved locally. No notifications are sent.</span></div>${state.actions.length ? `<div class="action-table"><div class="action-row table-header"><span>ACTION / CREDIT</span><span>OWNER</span><span>CREATED</span><span>STATUS</span></div>${state.actions.map(a => `<div class="action-row"><div><strong>${esc(a.title)}</strong><small>${esc(a.issuer)} · ${esc(a.type)}</small>${a.note ? `<p>${esc(a.note)}</p>` : ''}${a.runId ? `<button class="run-history-button" data-run-result="${a.runId}">View approved inputs & result</button>` : ''}</div><span>${esc(a.owner)}</span><span>${new Date(a.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><button ${a.runId ? 'disabled' : ''} class="badge action-status ${a.status === 'Completed' ? 'support-badge' : 'high'}" data-complete="${a.id}" title="Toggle completion">${a.status === 'Completed' ? icon('check') : icon('clock')}${a.status}</button></div>`).join('')}</div>` : `<div class="empty-state large"><span class="empty-icon">${icon('clipboard')}</span><h2>Your next action starts with a signal.</h2><p>Explore a credit story, run a scenario, or assign a focused review.<br>Your follow-through will appear here.</p>${button('Explore the signal inbox', 'nav-inbox', 'primary', 'arrow')}</div>`}`; }

function openModal(type, payload) { modal = { type, payload }; renderModal(); }
function closeModal() { document.querySelector('#modal-root').innerHTML = ''; modal = null; }
function renderModal() {
  if (!modal) return; const s = getStory(); let title = '', subtitle = '', body = '', wide = false;
  if (modal.type === 'remove-workflow') {
    const workflow = state.workflows.find(w => w.id === modal.payload); if (!workflow) { closeModal(); return; }
    title = 'Remove workflow?'; subtitle = esc(workflow.name);
    body = `<p>Remove this workflow and its saved configuration from this browser? This cannot be undone. Existing inbox reviews and action history will remain.</p><div class="modal-actions">${button('Keep workflow', 'close-modal', 'secondary')}${button('Remove workflow', 'confirm-remove-workflow', 'danger', 'trash')}</div>`;
  }
  if (modal.type === 'create-workflow') { title = 'Create a workflow'; subtitle = 'Choose a starting point, then configure your sources and steps.'; body = `<form id="create-workflow-form"><label class="form-label">Workflow name<input name="name" required maxlength="80" placeholder="e.g. Liquidity risk monitor"/></label><label class="form-label">Starting point<select name="template"><option value="blank">Basic flow · sources, Super Signal & portfolio filter</option><option value="analysis">Scenario analysis · extraction, review & scenario</option><option value="summary">Summarize and Publish</option></select></label><p class="field-source">New workflows start as drafts. Configure the source and choose your portfolio before activation.</p><button type="submit" class="btn primary">Create workflow</button></form>`; }
  if (modal.type === 'evidence') { const e = s.evidence[modal.payload]; title = e.title; subtitle = `${e.source} · ${e.time} · Illustrative evidence`; body = `${badge(e.role + ' this credit story', e.role === 'Supports' ? 'support-badge' : 'mixed-badge')}<blockquote>${e.text}</blockquote><div class="fact-row"><span>${e.fact}</span><strong>${e.value}</strong></div><p class="muted">Evidence reference: ${e.reference}</p><div class="info-banner">${icon('layers')} ${e.duplicates} report${e.duplicates > 1 ? 's are' : ' is'} represented by this signal. Source repetition does not increase evidence confidence.</div><p class="modal-disclaimer">Sample content created for this prototype; this is not a live source excerpt.</p>`; }
  if (modal.type === 'priority') { title = 'Adjust story priority'; subtitle = s.issuer; body = `<form id="priority-form"><label class="form-label">Queue priority<select name="priority">${['Critical', 'High', 'Medium', 'Low'].map(p => `<option ${priority(s) === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label class="form-label">Why is this priority appropriate?<textarea name="reason" required placeholder="Explain your portfolio-specific assessment…">${esc(state.overrides[s.id]?.reason || '')}</textarea></label><p class="muted">Your override changes queue priority. The original importance, severity, and urgency remain visible.</p><button class="btn primary" type="submit">Save assessment</button></form>`; }
  if (modal.type === 'take-action') { title = 'Move the analysis forward'; subtitle = `Create a local action for ${s.issuer}`; body = `<form id="action-form"><label class="form-label">Action<select name="type"><option>Event-driven credit review</option><option>Assign further analysis</option><option>Monitor at next committee</option></select></label><label class="form-label">Owner<select name="owner"><option>Alex Laurent</option><option>Jamie Chen</option><option>Priya Shah</option></select></label><label class="form-label">Analysis question<textarea name="note" required placeholder="What needs to be investigated?">Assess ${s.mechanism.toLowerCase()} and implications for the credit outlook.</textarea></label><p class="muted">The action will appear in your Action center. No external job or notification is created.</p><button class="btn primary" type="submit">${icon('plus')} Create action</button></form>`; }
  if (modal.type === 'scenario') { title = 'Explore the credit impact'; subtitle = `${s.issuer} · Illustrative interest coverage sensitivity`; wide = true; const debt = s.id === 'aster' ? 1200 : ''; body = `<div class="scenario-layout"><form id="scenario-form"><div class="eyebrow">REVIEW YOUR ASSUMPTIONS</div><label class="form-label">Debt to refinance <span>€ million</span><input name="debt" type="number" min="0" step="any" value="${debt}" required placeholder="Enter an analyst assumption"/></label><p class="field-source">${s.id === 'aster' ? 'Evidence: sample debt schedule · €1.2bn within 18 months' : 'Not available in sample evidence. Analyst input required.'}</p><label class="form-label">Additional refinancing spread <span>basis points</span><input name="shock" type="number" min="0" max="2000" step="1" value="150" required/></label><p class="field-source">Analyst-defined downside assumption, not an extracted fact.</p><div class="two-fields"><label class="form-label">Baseline EBITDA (€m)<input name="ebitda" type="number" min="0.01" step="any" value="480" required/></label><label class="form-label">Baseline interest (€m)<input name="interest" type="number" min="0.01" step="any" value="120" required/></label></div><p class="field-source">Illustrative baseline assumptions. Replace before interpretation.</p><label class="checkbox-label"><input name="approved" type="checkbox" required/> I have reviewed these inputs for this demo.</label><button class="btn primary" type="submit">${icon('play')} Calculate sensitivity</button></form><div id="scenario-output" class="scenario-output"><span class="empty-icon">${icon('chart')}</span><h3>Make the assumptions explicit.</h3><p>Review the inputs, then explore how additional interest expense changes coverage.</p><div class="formula">Coverage = EBITDA ÷ interest expense</div></div></div><p class="modal-disclaimer">Simplified annual sensitivity: all selected debt refinances at the added spread; EBITDA and other interest stay constant. This is not a rating model.</p>`; }
  if (modal.type === 'add-step') { title = 'What happens next?'; subtitle = 'Start a path from the portfolio filter, or add a step to an existing path.'; wide = true; body = `<label class="form-label branch-destination">Add downstream steps to<select id="add-step-branch"><option value="analysis" ${addBranch === 'analysis' ? 'selected' : ''}>Scenario analysis path</option><option value="summary" ${addBranch === 'summary' ? 'selected' : ''}>Summary & publishing path</option></select></label><p class="field-source">Extract Scenario Inputs starts the analysis path. Summarize and Publish starts the publishing path. Enrich credit context is shared before the split. Other steps extend the selected path.</p><div class="step-catalog">${Object.entries(catalog).filter(([type]) => !['watch', 'match'].includes(type)).map(([type, c]) => `<button class="catalog-card" data-add-step="${type}"><span class="node-icon ${c.color}">${icon(c.icon)}</span><strong>${c.label}</strong><p>${c.description}</p><span>${['super', 'enrich'].includes(type) && state.workflow.steps.some(step => step.type === type) ? 'Already in flow · Configure' : c.category} ${icon(['super', 'enrich'].includes(type) && state.workflow.steps.some(step => step.type === type) ? 'settings' : 'plus')}</span></button>`).join('')}</div>`; }
  if (modal.type === 'rename') { title = 'Name your workflow'; subtitle = 'Give this process a name your team will recognize.'; body = `<form id="rename-form"><label class="form-label">Workflow name<input name="name" maxlength="80" value="${esc(state.workflow.name)}" required/></label><button class="btn primary" type="submit">Save name</button></form>`; }
  if (modal.type === 'add-source') { title = 'Bring another source into view'; subtitle = 'Add a simulated adapter to your information ecosystem.'; body = `<form id="source-form"><label class="form-label">Source name<input name="name" placeholder="e.g. Sector research newsletter" maxlength="70" required/></label><label class="form-label">Source type<select name="kind"><option>Email</option><option>News feed</option><option>Subscription</option><option>Policy & regulatory</option><option>Internal</option></select></label><label class="form-label">What should this source watch?<input name="detail" placeholder="Topics, issuers, or a publication" required/></label><p class="muted">This adds a sample connection. It does not authenticate with or retrieve content from a provider.</p><button class="btn primary" type="submit">Add sample source</button></form>`; }
  if (modal.type === 'assumption-review') { title = 'Review the assumptions'; subtitle = `${stories.find(s => s.id === modalRun()?.storyId)?.issuer || ''} · ${esc(modalRun()?.workflowName)} · Inbox review`; wide = true; body = assumptionReviewBody(); }
  if (modal.type === 'run-result') { title = 'Workflow result'; subtitle = 'Aster Automotive · Completed sample run'; wide = true; body = runResultBody(); }
  if (modal.type === 'publication-preview') { title = 'Preview publication'; subtitle = 'Summarize and Publish · Sample output'; wide = true; body = publicationPreview(state.workflow.steps.find(step => step.id === modal.payload)); }
  if (modal.type === 'enrichment-preview') { title = 'Preview credit context'; subtitle = 'Illustrative Aster Automotive snapshot · No systems are queried'; wide = true; body = enrichmentPreview(state.workflow.steps.find(s => s.id === modal.payload)); }
  if (modal.type === 'preview') { title = 'Preview your workflow design'; subtitle = 'Design-time simulation · No inbox runs or approvals are changed'; wide = true; body = previewBody(); }
  if (modal.type === 'portfolio') { title = 'European corporates'; subtitle = 'Your sample coverage universe'; body = `<div class="portfolio-list">${stories.map(s => `<div><span class="issuer-logo ${s.color}">${s.initials}</span><span><strong>${s.issuer}</strong><small>${s.sector} · ${s.rating}</small></span><b>${s.exposure}</b></div>`).join('')}</div><p class="muted">Alex Laurent · Senior credit analyst<br>Issuer names, ratings, and exposures are fictional. Portfolio editing and identity integration are reserved for the full-stack implementation.</p>`; }
  if (modal.type === 'guide') { title = 'From a headline to a credit decision.'; subtitle = 'A short tour of your interactive prototype'; body = `<div class="guide-list">${[['1', 'Start with the signal inbox', 'Choose an issuer, inspect supporting and conflicting evidence, and adjust the story priority.'], ['2', 'Explore an impact', 'Choose Review assumptions on a story awaiting your input. Approve the values to continue its workflow and see the result in the inbox.'], ['3', 'Build your process', 'Use Workflow studio to design processing. Runtime review tasks arrive in the signal inbox.'], ['4', 'Follow through', 'Create a review or assign analysis. Track completion in the Action center.']].map(([n, h, p]) => `<div><span>${n}</span><section><h3>${h}</h3><p>${p}</p></section></div>`).join('')}</div><div class="info-banner">${icon('check')} Changes persist in this browser. Use Reset demo to start again.</div>`; }
  if (modal.type === 'reset') { title = 'Reset the prototype?'; subtitle = 'This clears your local workflow edits, sources, priority overrides, and actions.'; body = `<div class="modal-actions">${button('Keep my changes', 'close-modal')}${button('Reset sample workspace', 'confirm-reset', 'primary')}</div>`; }
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" aria-label="Close dialog" data-action="close-modal">${icon('close')}</button><div class="eyebrow">SIGPRO WORKSPACE</div><h2 id="modal-title">${title}</h2><p class="modal-subtitle">${subtitle}</p>${body}</section></div>`;
  document.querySelector('.modal-close').focus();
}

function inboxRunPanel(story) {
  const run = latestRun(story.id); if (!run) return '';
  const pending = run.status === 'awaiting-review';
  return `<section class="inbox-run-panel ${pending ? 'pending' : 'done'}"><div class="section-title"><h3>${icon(pending ? 'clock' : 'check')} ${pending ? 'Your review is needed' : 'Scenario ready'}</h3>${badge(pending ? 'Awaiting review' : 'Completed', pending ? 'high' : 'support-badge')}</div><p class="run-origin">${esc(run.workflowName)} · v${run.workflowVersion}</p><p>${pending ? 'Incoming signals formed a Super Signal, passed the portfolio filter, and were enriched. Review the extracted values and proposed assumptions to release the scenario step.' : `Using your approved inputs, coverage changes from ${run.result.baselineCoverage.toFixed(2)}x to ${run.result.stressedCoverage.toFixed(2)}x, with €${run.result.additionalInterest.toFixed(1)}m additional annual interest.`}</p><div class="run-path">${icon('check')} Signals processed <span>→</span> ${pending ? 'Review assumptions' : 'Assumptions approved'} <span>→</span> ${pending ? 'Scenario queued' : 'Scenario complete'}</div><small>${pending ? 'Assigned to ' + esc(run.reviewer) : 'Approved by ' + esc(run.reviewer) + ' · ' + new Date(run.approvedAt).toLocaleString()} · Sample run</small>${button(pending ? 'Review assumptions' : 'View scenario result', pending ? 'inbox-review' : 'inbox-result', 'primary', pending ? 'clipboard' : 'chart')}</section>`;
}
function assumptionReviewBody() {
  const run = modalRun(); if (!run || run.status !== 'awaiting-review') return '<p>This review is already complete.</p>';
  return `<div class="review-context"><span>${badge('Awaiting your review', 'high')}</span><span>Assigned to <strong>${esc(run.reviewer)}</strong> · Workflow v${run.workflowVersion}</span></div><p class="muted">This story reached the Review assumptions checkpoint after signal processing. Confirm each input to continue its ${esc(run.nextStep)} scenario.</p><form id="assumption-review-form"><div class="assumption-list">${assumptionFields.map(field => `<section class="assumption-card"><div class="assumption-card-heading"><h3>${field.label}</h3>${badge(field.kind, field.key === 'debt' ? 'support-badge' : 'mixed-badge')}</div><div class="assumption-columns"><div class="assumption-evidence"><strong>${field.source}</strong><p>“${field.excerpt}”</p><small>${field.detail}</small></div><div><label class="form-label">Value to use <span>${field.unit}</span><input name="${field.key}" data-review-value="${field.key}" type="number" min="${field.min}" step="any" required value="${esc(run.values[field.key])}"/></label><label class="checkbox-label"><input type="checkbox" name="confirm-${field.key}" data-review-check="${field.key}" required ${run.checked[field.key] ? 'checked' : ''}/> I reviewed this input</label></div></div></section>`).join('')}</div><label class="form-label">Reviewer note <span>Optional</span><textarea name="review-note" id="review-note" placeholder="Explain corrections or why the assumptions are appropriate…">${esc(run.note)}</textarea></label><div class="review-submit"><span id="review-progress" role="status">${Object.values(run.checked).filter(Boolean).length} of 4 inputs reviewed</span>${button('Save & return to inbox', 'close-modal', 'secondary')}<button class="btn primary" type="submit">${icon('check')} Approve & continue workflow</button></div></form><p class="modal-disclaimer">Draft edits are saved in this browser. Leaving without approval keeps this run paused. Evidence and baseline values are illustrative; the sample calculation runs locally.</p>`;
}
function runResultBody() {
  const run = modalRun(); if (!run || run.status !== 'completed') return '<p>This run is awaiting review.</p>';
  return `<div class="review-context">${badge('Completed', 'support-badge')}<span>${esc(run.workflowName)} · v${run.workflowVersion}</span></div><div class="run-result-metrics"><div><span>Baseline coverage</span><strong>${run.result.baselineCoverage.toFixed(2)}x</strong></div><div><span>Stressed coverage</span><strong>${run.result.stressedCoverage.toFixed(2)}x</strong></div><div><span>Additional annual interest</span><strong>€${run.result.additionalInterest.toFixed(1)}m</strong></div></div><div class="approved-inputs"><h3>Approved inputs</h3>${assumptionFields.map(field => `<div class="fact-row"><span>${field.label}</span><strong>${esc(run.values[field.key])} ${field.unit}</strong></div>`).join('')}<p>Approved by ${esc(run.reviewer)} · ${new Date(run.approvedAt).toLocaleString()}</p>${run.note ? `<p>Reviewer note: ${esc(run.note)}</p>` : ''}</div><p class="muted">The result and approved inputs are saved with this story and in the Action center. Later workflow design changes do not alter this received run.</p><div class="modal-actions">${button('Back to inbox', 'open-inbox')}${button('Create follow-up action', 'take-action', 'primary', 'plus')}</div><p class="modal-disclaimer">Illustrative annual sensitivity: selected debt refinances at the added spread, with EBITDA and other interest held constant. No external actions were taken.</p>`;
}
let canvasSimulation = { open: false, running: false, token: 0, signals: [], latestBySource: {}, sourceId: '', nextId: 1, deliveries: 0, nodes: {}, edges: {}, log: [], status: '', signature: '', version: null };
function simulationPanel() {
  if (!canvasSimulation.open) return '';
  const sources = state.workflow.steps.filter(step => step.type === 'watch');
  if (!sources.some(source => source.id === canvasSimulation.sourceId)) canvasSimulation.sourceId = sources[0]?.id || '';
  const previous = canvasSimulation.latestBySource[canvasSimulation.sourceId];
  const disabled = canvasSimulation.running ? 'disabled' : '';
  return `<div class="simulation-heading"><span>${icon('play')} SIGNAL ARRIVAL SIMULATION</span><small>Sample data · No inbox tasks, AI calls, or publishing</small><button class="icon-button" data-action="sim-close" aria-label="Close simulation">${icon('close')}</button></div><div class="simulation-controls"><label>From source<select id="simulation-source" ${disabled}>${sources.map(source => `<option value="${source.id}" ${source.id === canvasSimulation.sourceId ? 'selected' : ''}>${esc(source.name)}</option>`).join('')}</select></label><button class="btn primary compact" data-action="sim-new" ${disabled}>${icon('radio')} Send new signal</button><button class="btn secondary compact" data-action="sim-duplicate" ${disabled || (!previous ? 'disabled' : '')}>Replay unchanged</button><button class="btn secondary compact" data-action="sim-update" ${disabled || (!previous ? 'disabled' : '')}>Send update${previous ? ' · v' + (previous.revision + 1) : ''}</button><button class="btn secondary compact" data-action="sim-outside" ${disabled}>Outside portfolio</button><button class="text-button" data-action="${canvasSimulation.running ? 'sim-stop' : 'sim-reset'}">${canvasSimulation.running ? 'Stop animation' : 'Reset simulation'}</button></div><div class="simulation-feedback"><p id="simulation-status" role="status" aria-live="polite">${esc(canvasSimulation.status || 'Choose an arrival and watch its path through your workflow.')}</p><span>${canvasSimulation.deliveries} arrivals · ${canvasSimulation.signals.reduce((sum, signal) => sum + signal.signals.length, 0)} signals${canvasSimulation.version ? ' · latest v' + canvasSimulation.version : ''}</span></div>${canvasSimulation.log.length ? `<details class="simulation-log"><summary>Arrival trace (${canvasSimulation.log.length})</summary><ol>${canvasSimulation.log.map(message => `<li>${esc(message)}</li>`).join('')}</ol></details>` : ''}`;
}
function paintSimulation() {
  const panel = document.querySelector('#simulation-panel');
  if (panel) { panel.innerHTML = simulationPanel(); panel.hidden = !canvasSimulation.open; panel.dataset.running = String(canvasSimulation.running); }
  for (const node of document.querySelectorAll('.flow-node, .filter-stop')) {
    const id = node.dataset.step || 'filtered-out', status = canvasSimulation.nodes[id];
    node.classList.remove('sim-active', 'sim-passed', 'sim-stopped', 'sim-paused');
    node.querySelector('.sim-node-tag')?.remove();
    delete node.dataset.simState;
    if (status) {
      node.classList.add(`sim-${status.state}`); node.dataset.simState = status.state;
      const tag = document.createElement('span'); tag.className = 'sim-node-tag'; tag.textContent = status.label; node.append(tag);
    }
  }
  for (const edge of document.querySelectorAll('#connections path[data-from], #connections path[data-filter]')) {
    const key = edge.dataset.filter ? 'filtered-out' : `${edge.dataset.from}:${edge.dataset.to}`;
    edge.classList.toggle('sim-edge-passed', canvasSimulation.edges[key] === 'passed');
    edge.classList.toggle('sim-edge-active', canvasSimulation.edges[key] === 'active');
  }
}
function cancelSimulation(message = 'Animation stopped. Send another arrival when ready.') {
  canvasSimulation.token++; canvasSimulation.running = false;
  for (const node of Object.values(canvasSimulation.nodes)) if (node.state === 'active') { node.state = 'stopped'; node.label = 'Simulation stopped'; }
  for (const key of Object.keys(canvasSimulation.edges)) if (canvasSimulation.edges[key] === 'active') delete canvasSimulation.edges[key];
  document.querySelectorAll('.signal-particle').forEach(dot => dot.remove());
  canvasSimulation.status = message; paintSimulation();
}
function resetSimulation() {
  cancelSimulation();
  Object.assign(canvasSimulation, { signals: [], latestBySource: {}, nextId: 1, deliveries: 0, nodes: {}, edges: {}, log: [], version: null, signature: JSON.stringify(state.workflow.steps), status: 'Simulation reset. The next arrival creates v1.' });
  paintSimulation();
}
function simulationNode(id, status, label) {
  canvasSimulation.nodes[id] = { state: status, label }; paintSimulation();
}
function simulationLog(message) {
  canvasSimulation.log.push(message); canvasSimulation.status = message; paintSimulation();
}
const simulationDelay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function simulationAlive(token) { return canvasSimulation.token === token && canvasSimulation.running && view === 'workflow'; }
function reducedSimulationMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
async function visitSimulationNode(step, token, label, finalState = 'passed') {
  if (!simulationAlive(token)) return false;
  simulationNode(step.id, 'active', label);
  const node = [...document.querySelectorAll('.flow-node')].find(node => node.dataset.step === step.id);
  const viewport = document.querySelector('.canvas-scroll');
  if (node && viewport) {
    const box = node.getBoundingClientRect(), frame = viewport.getBoundingClientRect();
    const top = box.top < frame.top + 70 ? box.top - frame.top - 90 : box.bottom > frame.bottom - 45 ? box.bottom - frame.bottom + 65 : 0;
    const left = box.left < frame.left + 15 ? box.left - frame.left - 20 : box.right > frame.right - 15 ? box.right - frame.right + 20 : 0;
    viewport.scrollBy({ top, left, behavior: reducedSimulationMotion() ? 'instant' : 'smooth' });
  }
  await simulationDelay(reducedSimulationMotion() ? 180 : 700);
  if (!simulationAlive(token)) return false;
  simulationNode(step.id, finalState, label); return true;
}
async function travelSimulationEdge(from, to, token, excluded = false) {
  if (!simulationAlive(token)) return false;
  const key = excluded ? 'filtered-out' : `${from}:${to}`;
  const path = [...document.querySelectorAll('#connections path')].find(path => excluded ? path.dataset.filter === 'excluded' : path.dataset.from === from && path.dataset.to === to);
  if (!path) return false;
  canvasSimulation.edges[key] = 'active'; paintSimulation();
  let dot;
  if (!reducedSimulationMotion()) {
    dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '5'); dot.setAttribute('class', 'signal-particle');
    const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
    motion.setAttribute('path', path.getAttribute('d')); motion.setAttribute('dur', '0.55s'); motion.setAttribute('fill', 'freeze');
    dot.append(motion); document.querySelector('#connections').append(dot); motion.beginElement();
  }
  await simulationDelay(reducedSimulationMotion() ? 100 : 550); dot?.remove();
  if (!simulationAlive(token)) return false;
  canvasSimulation.edges[key] = 'passed'; paintSimulation(); return true;
}
async function runCanvasArrival(kind = 'new') {
  if (canvasSimulation.running) return;
  canvasSimulation.open = true;
  if (canvasSimulation.signature !== JSON.stringify(state.workflow.steps)) resetSimulation();
  const errors = validateWorkflow(state.workflow.steps);
  if (errors.length) { canvasSimulation.status = 'Complete the workflow before simulating: ' + errors.join(' '); paintSimulation(); return; }
  const source = state.workflow.steps.find(step => step.id === canvasSimulation.sourceId && step.type === 'watch') || state.workflow.steps.find(step => step.type === 'watch');
  canvasSimulation.sourceId = source.id;
  const previous = canvasSimulation.latestBySource[source.id];
  if ((kind === 'duplicate' || kind === 'update') && !previous) { canvasSimulation.status = 'Send a new signal from this source first.'; paintSimulation(); return; }
  const superStep = state.workflow.steps.find(step => step.type === 'super'), match = state.workflow.steps.find(step => step.type === 'match');
  const signal = kind === 'duplicate' || kind === 'update' ? { ...previous, receivedAt: new Date().toISOString(), ...(kind === 'update' ? { content: `Updated credit evidence, revision ${previous.revision + 1}`, facts: { ...previous.facts, refinancingSpreadBps: 150 + previous.revision * 25 } } : {}) } : { sourceId: source.id, sourceName: source.name, signalId: `signal-${canvasSimulation.nextId++}`, issuerId: kind === 'outside' ? 'uncovered' : 'aster', topic: superStep.value, content: kind === 'outside' ? 'Uncovered Co sample refinancing evidence' : 'Aster sample refinancing evidence', facts: { refinancingSpreadBps: 150 }, receivedAt: new Date().toISOString() };
  const token = ++canvasSimulation.token;
  canvasSimulation.running = true; canvasSimulation.nodes = {}; canvasSimulation.edges = {}; canvasSimulation.log = []; canvasSimulation.version = null;
  simulationLog(`${source.name}: ${kind === 'duplicate' ? 'unchanged replay' : kind === 'update' ? 'changed content' : 'new signal'} ${signal.signalId}.`);
  try {
    if (!await visitSimulationNode(source, token, 'Signal received')) return;
    if (!await travelSimulationEdge(source.id, superStep.id, token)) return;
    // Only arrivals that actually reach the aggregate change simulation state.
    const received = receiveSignal(canvasSimulation.signals, signal);
    canvasSimulation.signals = received.superSignals; canvasSimulation.deliveries++;
    const member = received.superSignal.signals.find(item => item.sourceId === signal.sourceId && item.signalId === signal.signalId);
    canvasSimulation.latestBySource[source.id] = structuredClone(member); canvasSimulation.version = member.revision;
    const label = received.outcome === 'duplicate' ? `Duplicate · v${member.revision} unchanged` : received.outcome === 'updated' ? `Updated to v${member.revision} · continue` : `Signal v${member.revision} · ${received.outcome === 'created' ? 'Super Signal created' : 'added to Super Signal'}`;
    simulationLog(received.outcome === 'duplicate' ? 'Stopped at Super Signal: identical content. Version unchanged; nothing sent downstream.' : label);
    if (!await visitSimulationNode(superStep, token, label, received.shouldContinue ? 'passed' : 'stopped')) return;
    if (!received.shouldContinue) return;
    if (!await travelSimulationEdge(superStep.id, match.id, token)) return;
    // Fixed demo coverage: Aster is covered by every selectable portfolio, Uncovered Co is not.
    const covered = matchesPortfolio(received.superSignal, ['aster']);
    simulationLog(covered ? `Matched ${match.value}; sending v${member.revision} to each configured path.` : `Not in ${match.value}; stopped at portfolio filter.`);
    if (!await visitSimulationNode(match, token, covered ? 'In portfolio · continue' : 'Not in portfolio · stop', covered ? 'passed' : 'stopped')) return;
    if (!covered) {
      if (await travelSimulationEdge(match.id, '', token, true)) simulationNode('filtered-out', 'stopped', 'Filtered out · no downstream actions');
      return;
    }
    const context = state.workflow.steps.find(step => step.type === 'enrich');
    if (context) {
      if (!await travelSimulationEdge(match.id, context.id, token)) return;
      const snapshot = enrichmentSnapshot(context);
      simulationLog(`Shared context: ${snapshot.datasets.length} datasets; ${snapshot.issues.length} stale or missing. Sample snapshot ${snapshot.retrievedAt}.`);
      if (!await visitSimulationNode(context, token, snapshot.paused ? 'Data review needed · paths paused' : snapshot.issues.length ? 'Context attached · quality flags' : 'Shared context attached', snapshot.paused ? 'paused' : 'passed')) return;
      if (snapshot.paused) { canvasSimulation.status = 'Paused at enrichment for data review. Neither downstream path has run.'; paintSimulation(); return; }
    }
    const endings = await Promise.all(workflowBranches(state.workflow.steps).map(async branch => {
      let from = context?.id || match.id;
      for (const step of branch.steps) {
        if (!await travelSimulationEdge(from, step.id, token)) return '';
        const needsReview = step.type === 'review';
        const label = needsReview ? `v${member.revision} · awaiting analyst review` : step.type === 'publish' ? 'Publishing simulated · no delivery' : `${catalog[step.type].label} · simulated`;
        if (!await visitSimulationNode(step, token, label, needsReview ? 'paused' : 'passed')) return '';
        if (needsReview) { simulationLog(`${branch.label} paused at Review assumptions. Later nodes on this path have not run.`); return `${branch.label}: awaiting review`; }
        from = step.id;
      }
      simulationLog(`${branch.label} completed in simulation.`); return `${branch.label}: completed`;
    }));
    if (simulationAlive(token)) { canvasSimulation.status = endings.filter(Boolean).join(' · '); paintSimulation(); }
  } catch (error) {
    if (simulationAlive(token)) { canvasSimulation.status = 'Simulation could not finish: ' + error.message; paintSimulation(); }
  } finally {
    if (canvasSimulation.token === token) { canvasSimulation.running = false; paintSimulation(); }
  }
}

function previewBody() {
  const errors = validateWorkflow(state.workflow.steps);

  if (errors.length) return `<div class="validation-box"><h3>A few things to connect first</h3>${errors.map(e => `<p>• ${esc(e)}</p>`).join('')}</div>${button('Back to workflow', 'close-modal', 'primary')}`;
  const descriptions = { watch: 'Normalize incoming information and preserve source context', super: 'Create on first arrival; stop unchanged duplicates; update and forward new versions only when content changes', enrich: 'Attach selected internal datasets with source references and as-of dates before both paths split. Apply the configured missing/stale data policy.', match: 'Portfolio matches enter every configured path. Unmatched Super Signals stop here.', extract: 'Prepare source-linked scenario inputs', review: 'Pause this path for assumptions review in the inbox', scenario: 'Run a scenario using approved inputs', assign: 'Create an analysis assignment', job: 'Create a credit review', publish: 'Summarize and publish to the selected platform (simulated)' };
  function traceRow(step, waiting = false, checkpoint = false) {
    return `<div class="trace-row ${waiting ? 'waiting' : ''}"><span class="trace-icon">${icon(waiting ? 'clock' : 'check')}</span><div><strong>${esc(step.type === 'watch' ? step.name : catalog[step.type].label)}</strong><p>${descriptions[step.type]}</p><small>${esc(step.type === 'watch' ? sourceSummary(step) : step.value)}</small>${step.type === 'publish' ? `<details class="publish-trace"><summary>Publishing configuration</summary><p>${esc(step.publishing.prompt)}</p><small>${step.value === 'Email' ? 'To: ' + esc(publishingRecipients(step).join(', ')) : 'Destination: Analytical Desktop'}</small></details>` : ''}</div>${badge(waiting ? checkpoint ? 'Inbox checkpoint' : 'After approval' : 'Automatic', waiting ? 'neutral' : 'support-badge')}</div>`;
  }
  return `<div class="preview-notice">${icon('network')} Each configured path receives the matched Super Signal independently. Pausing analysis for review does not block the publishing path. Design preview only; no delivery or inbox tasks are created.</div><div class="run-trace">${state.workflow.steps.filter(step => !branchOf(step)).map(step => traceRow(step)).join('')}</div><div class="branch-preview-grid">${workflowBranches(state.workflow.steps).map(branch => { const reviewIndex = branch.steps.findIndex(step => step.type === 'review'); return `<section class="branch-preview"><h3>${branch.label}</h3>${branch.steps.map((step, index) => traceRow(step, reviewIndex >= 0 && index >= reviewIndex, index === reviewIndex)).join('')}</section>`; }).join('')}</div>${button('Go to signal inbox', 'open-inbox', 'primary', 'inbox')}`;

}

app.addEventListener('click', handleClick);
document.querySelector('#modal-root').addEventListener('click', handleClick);
function handleClick(event) {
  const el = event.target.closest('button, a');
  if (!el) { if (event.target.classList.contains('modal-backdrop')) closeModal(); return; }
  if (el.dataset.openWorkflow) { openWorkflow(el.dataset.openWorkflow); return; }
  if (el.dataset.removeWorkflow) { openModal('remove-workflow', el.dataset.removeWorkflow); return; }
  if (el.dataset.story) { selected = el.dataset.story; renderView(); return; }
  if (el.dataset.filter) { filter = el.dataset.filter; renderView(); return; }
  if (el.dataset.evidence !== undefined) { openModal('evidence', Number(el.dataset.evidence)); return; }
  if (el.dataset.step) { if (suppressClick) return; selectWorkflowStep(el.dataset.step); return; }
  if (el.dataset.addStep) {
    const type = el.dataset.addStep;
    if (type === 'enrich') { closeModal(); addEnrichment(); return; }
    if (type === 'super') {
      let step = state.workflow.steps.find(step => step.type === 'super');
      if (!step) {
        step = newStep('super');
        const firstProcessing = state.workflow.steps.findIndex(step => step.type !== 'watch');
        state.workflow.steps.splice(firstProcessing < 0 ? state.workflow.steps.length : firstProcessing, 0, step);
        state.workflow.active = false; save();
      }
      selectedStep = step.id; closeModal(); renderView();
      document.querySelector('.flow-node.selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      toast('Configure the Super Signal that connects your sources.');
      return;
    }
    if (type === 'extract' || type === 'publish') { closeModal(); ensureBranch(type === 'extract' ? 'analysis' : 'summary'); return; }
    const path = workflowBranches(state.workflow.steps).find(branch => branch.id === addBranch);
    if (!path) { toast('Start this path with Extract Scenario Inputs or Summarize and Publish first.'); return; }
    const step = newStep(type, undefined, state.user.email); step.branch = addBranch;
    const after = path.steps.find(step => step.id === modal?.payload?.afterId) || path.steps.at(-1);
    state.workflow.steps.splice(state.workflow.steps.indexOf(after) + 1, 0, step);
    selectedStep = step.id; state.workflow.active = false; save(); closeModal(); renderView(); toast('Step added to ' + path.label + '.'); return;
  }
  if (el.dataset.sourceToggle) { const source = state.sources.find(s => s.id === el.dataset.sourceToggle); source.enabled = !source.enabled; save(); renderView(); return; }
  if (el.dataset.runResult) { const run = state.runs.find(r => r.id === el.dataset.runResult); if (run) { selected = run.storyId; openModal('run-result', run.id); } return; }
  if (el.dataset.complete) { const action = state.actions.find(a => a.id === el.dataset.complete); action.status = action.status === 'Open' ? 'Completed' : 'Open'; save(); renderView(); return; }
  if (el.dataset.removeRecipient !== undefined) { const step = state.workflow.steps.find(step => step.id === selectedStep); if (step?.type === 'publish') { step.publishing.additionalRecipients.splice(Number(el.dataset.removeRecipient), 1); state.workflow.active = false; save(); renderView(); } return; }
  const action = el.dataset.action;
  if (action === 'confirm-remove-workflow' && modal?.type === 'remove-workflow') {
    const id = modal.payload, workflow = state.workflows.find(w => w.id === id);
    if (!workflow) return;
    cancelSimulation(); canvasSimulation.open = false;
    state.workflows = state.workflows.filter(w => w.id !== id);
    if (state.workflow?.id === id) {
      state.workflow = state.workflows[0] || null;
      state.selectedWorkflowId = state.workflow?.id || null;
      selectedStep = state.workflow?.steps[0]?.id;
    }
    workflowLibrary = true; closeModal(); save(); renderView(); toast(`Removed “${workflow.name}”.`); return;
  }
  if (action === 'add-enrichment') { addEnrichment(); return; }
  if (action === 'preview-enrichment') { openModal('enrichment-preview', selectedStep); return; } if (!action) return; event.preventDefault();
  if (action === 'create-workflow') { openModal('create-workflow'); return; }
  if (action === 'workflow-list') { workflowLibrary = true; renderView(); return; }
  if (action.startsWith('nav-')) { view = action.slice(4); if (view === 'workflow') workflowLibrary = true; shell(); return; }
  if (['evidence', 'priority', 'scenario', 'take-action', 'rename', 'add-source', 'portfolio', 'guide', 'reset'].includes(action)) { openModal(action); return; }
  if (action === 'add-step' || action === 'add-branch-step') {
    const selectedNode = state.workflow.steps.find(step => step.id === selectedStep);
    addBranch = branchOf(selectedNode || { type: 'match' }) || 'analysis';
    openModal('add-step', action === 'add-branch-step' ? { afterId: selectedStep } : null);
  }
  if (action === 'add-path-analysis' || action === 'add-path-summary') ensureBranch(action === 'add-path-analysis' ? 'analysis' : 'summary');
  if (action === 'close-modal') closeModal();
  if (action === 'mark-reviewed') { state.reviewed = state.reviewed.includes(selected) ? state.reviewed.filter(id => id !== selected) : [...state.reviewed, selected]; save(); renderView(); }
  if (action === 'sort') toast('Stories are ordered Critical → High → Medium → Low. Adjust a story’s priority to change its position.');
  if (action === 'add-workflow-source') {
    const node = newSource(); const joinIndex = state.workflow.steps.findIndex(s => s.type === 'super');
    state.workflow.steps.splice(joinIndex < 0 ? 0 : joinIndex, 0, node);
    selectedStep = node.id; state.workflow.active = false;
    state.workflow.steps.forEach(s => { delete s.x; delete s.y; });
    save(); renderView(); toast('Source added and connected to the Super Signal. Choose its type and settings.');
  }
  if (action === 'try-signal-arrivals') {
    canvasSimulation.open = true; renderView();
    document.querySelector('#simulation-panel')?.scrollIntoView({ block: 'nearest' });
    requestAnimationFrame(() => { drawConnections(); runCanvasArrival(canvasSimulation.latestBySource[canvasSimulation.sourceId] ? 'duplicate' : 'new'); });
  }
  if (['sim-new', 'sim-duplicate', 'sim-update', 'sim-outside'].includes(action)) runCanvasArrival(action.slice(4));
  if (action === 'sim-stop') cancelSimulation();
  if (action === 'sim-reset') resetSimulation();
  if (action === 'sim-close') { cancelSimulation(); canvasSimulation.open = false; canvasSimulation.nodes = {}; canvasSimulation.edges = {}; paintSimulation(); }

  if (['reset-summary-prompt', 'add-publish-recipient', 'preview-publication'].includes(action)) {
    const step = state.workflow.steps.find(step => step.id === selectedStep); if (step?.type !== 'publish') return;
    if (action === 'preview-publication') { openModal('publication-preview', step.id); return; }
    if (action === 'reset-summary-prompt') step.publishing.prompt = defaultSummaryPrompt;
    else step.publishing.additionalRecipients.push('');
    state.workflow.active = false; save(); renderView();
    if (action === 'add-publish-recipient') document.querySelector('[data-publish-recipient="' + (step.publishing.additionalRecipients.length - 1) + '"]')?.focus();
  }
  if (action === 'preview') openModal('preview');
  if (action === 'open-inbox') { closeModal(); view = 'inbox'; filter = 'All signals'; selected = 'aster'; shell(); }
  if (action === 'inbox-review' || action === 'inbox-result') {
    const run = latestRun(selected); if (!run) return;
    openModal(run.status === 'awaiting-review' ? 'assumption-review' : 'run-result', run.id);
  }
  if (action === 'simulate-arrival') {
    selected = 'aster'; filter = 'All signals'; query = '';
    if (awaitingReview('aster')) { renderView(); toast('Aster already has a sample run awaiting your review.'); return; }
    state.runs.unshift(createInboxRun()); save(); renderView();
    toast('Sample arrival processed. Aster is awaiting a fresh review; previous results are retained in the Action center.');
  }
  if (action === 'activate') { const errors = validateWorkflow(state.workflow.steps); if (errors.length) { openModal('preview'); return; } state.workflow.active = !state.workflow.active; save(); renderView(); toast(state.workflow.active ? 'Workflow activated in this demo. Live monitoring requires a backend.' : 'Workflow paused.'); }
  if (action === 'move-up' || action === 'move-down') {
    const steps = state.workflow.steps, node = steps.find(step => step.id === selectedStep), shared = workflowBranches(steps).find(branch => branch.id === branchOf(node))?.steps || [];
    const i = shared.findIndex(s => s.id === selectedStep), j = i + (action === 'move-up' ? -1 : 1);
    if (i > 0 && j > 0 && j < shared.length) {
      const first = steps.indexOf(shared[i]), second = steps.indexOf(shared[j]);
      [steps[first], steps[second]] = [steps[second], steps[first]];
      steps.forEach(s => { delete s.x; delete s.y; }); state.workflow.active = false; save(); renderView();
    }
  }
  if (action === 'remove-step') {
    if (['super', 'match'].includes(state.workflow.steps.find(s => s.id === selectedStep)?.type)) return;
    const node = state.workflow.steps.find(s => s.id === selectedStep), path = workflowBranches(state.workflow.steps).find(branch => branch.id === branchOf(node));
    if (path?.steps[0].id === selectedStep && path.steps.length > 1) { toast('Remove the later steps before removing this path’s first step.'); return; }
    state.workflow.steps = state.workflow.steps.filter(s => s.id !== selectedStep);
    selectedStep = state.workflow.steps[0]?.id; state.workflow.active = false;
    state.workflow.steps.forEach(s => { delete s.x; delete s.y; }); save(); renderView();
  }
  if (action === 'zoom-in' || action === 'zoom-out') { zoom = Math.min(1.2, Math.max(0.5, Math.round((zoom + (action === 'zoom-in' ? .1 : -.1)) * 10) / 10)); renderView(); }
  if (action === 'arrange') { state.workflow.steps.forEach(s => { delete s.x; delete s.y; }); save(); renderView(); }
  if (action === 'confirm-reset') { state = initialState(); initializeWorkflows(); workflowLibrary = true; selectedStep = state.workflow.steps[0].id; selected = 'aster'; query = ''; filter = 'All signals'; closeModal(); save(); shell(); toast('Sample workspace reset.'); }
  if (action === 'save-scenario') { if (!modal.payload) return; addAction({ type: 'Scenario exploration', title: 'Refinancing downside sensitivity', note: modal.payload, owner: 'Alex Laurent' }); closeModal(); toast('Scenario result saved to the Action center.'); }
  if (action === 'export-story') { const s = getStory(); const blob = new Blob([JSON.stringify({ ...s, priority: priority(s), override: state.overrides[s.id], disclaimer: 'Illustrative prototype data, not actual credit research.' }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${s.id}-credit-story.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Credit story exported with evidence and context.'); }
}
function ensureBranch(id) {
  let path = workflowBranches(state.workflow.steps).find(branch => branch.id === id);
  if (!path) {
    const root = newStep(id === 'analysis' ? 'extract' : 'publish', undefined, state.user.email);
    root.branch = id; state.workflow.steps.push(root); state.workflow.active = false;
    state.workflow.steps.forEach(step => { delete step.x; delete step.y; }); save();
    path = { steps: [root] };
  }
  selectedStep = path.steps[0].id; renderView();
  document.querySelector('.flow-node.selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function addAction(fields) { state.actions.unshift({ ...fields, id: crypto.randomUUID(), issuer: getStory().issuer, storyId: selected, created: new Date().toISOString(), status: 'Open' }); save(); shell(); }
function updatePublishingField(event) {
  const field = event.target.dataset.publishField, recipient = event.target.dataset.publishRecipient;
  if (!field && recipient === undefined) return;
  const step = state.workflow.steps.find(step => step.id === selectedStep); if (step?.type !== 'publish') return;
  if (field) step.publishing[field] = event.target.value;
  else step.publishing.additionalRecipients[Number(recipient)] = event.target.value;
  state.workflow.active = false; save();
}
app.addEventListener('change', event => { if (event.target.id === 'simulation-source') { canvasSimulation.sourceId = event.target.value; paintSimulation(); } });
app.addEventListener('input', event => { if (canvasSimulation.running && event.target.closest('.step-inspector')) cancelSimulation('Settings changed. Restart the simulation to use the new configuration.'); });
document.querySelector('#modal-root').addEventListener('change', event => { if (event.target.id === 'add-step-branch') addBranch = event.target.value; });
app.addEventListener('input', updatePublishingField);
app.addEventListener('change', event => {
  if (event.target.dataset.publishField || event.target.dataset.publishRecipient !== undefined) { updatePublishingField(event); renderView(); }
});
app.addEventListener('input', e => {
  if (!e.target.dataset.sourceField) return;
  const node = state.workflow.steps.find(s => s.id === selectedStep), key = e.target.dataset.sourceField;
  if (node?.type !== 'watch') return;
  if (key === 'name') node.name = e.target.value; else sourceConfig(node)[key] = e.target.value;
  state.workflow.active = false; save();
});
app.addEventListener('change', e => {
  const node = state.workflow?.steps.find(s => s.id === selectedStep);
  if (e.target.id === 'source-type' && node?.type === 'watch') { switchSourceType(node, e.target.value); state.workflow.active = false; save(); renderView(); }
  else if (e.target.dataset.sourceField && node?.type === 'watch') {
    const key = e.target.dataset.sourceField;
    if (key === 'name') node.name = e.target.value; else sourceConfig(node)[key] = e.target.value;
    state.workflow.active = false; save(); renderView();
  }
});
app.addEventListener('input', e => { if (e.target.id === 'signal-search') { const pos = e.target.selectionStart; query = e.target.value; renderView(); const input = document.querySelector('#signal-search'); input.focus(); try { input.setSelectionRange(pos, pos); } catch {} } if (e.target.id === 'step-note') { state.workflow.steps.find(s => s.id === selectedStep).note = e.target.value; state.workflow.active = false; save(); } });
app.addEventListener('change', e => { if (e.target.id === 'step-value') { state.workflow.steps.find(s => s.id === selectedStep).value = e.target.value; state.workflow.active = false; save(); renderView(); } if (e.target.id === 'step-note') renderView(); });
document.querySelector('#modal-root').addEventListener('input', e => {
  const run = modalRun();
  if (modal?.type !== 'assumption-review' || !run || run.status !== 'awaiting-review') return;
  const key = e.target.dataset.reviewValue, check = e.target.dataset.reviewCheck;
  if (key) { run.values[key] = e.target.value; run.checked[key] = false; document.querySelector(`[name="confirm-${key}"]`).checked = false; }
  if (check) run.checked[check] = e.target.checked;
  if (e.target.id === 'review-note') run.note = e.target.value;
  save();
  document.querySelector('#review-progress').textContent = `${Object.values(run.checked).filter(Boolean).length} of 4 inputs reviewed`;
});
document.querySelector('#modal-root').addEventListener('submit', e => {
  e.preventDefault(); const f = new FormData(e.target);
  if (e.target.id === 'create-workflow-form') {
    const name = f.get('name').trim(); if (!name || !e.target.reportValidity()) return;
    const types = f.get('template') === 'analysis' ? ['extract', 'review', 'scenario'] : f.get('template') === 'summary' ? ['publish'] : [];
    const workflow = { id: crypto.randomUUID(), schemaVersion: 4, name, active: false, steps: [newSource('web'), newStep('super'), newStep('match'), ...types.map(type => newStep(type, undefined, state.user.email))] };
    state.workflows.push(workflow); closeModal(); openWorkflow(workflow.id); toast('Workflow created. Configure your source to get started.'); return;
  }
  if (e.target.id === 'assumption-review-form') {
    const run = modalRun(); if (!run || !e.target.reportValidity()) return;
    try {
      const updated = { ...run, values: Object.fromEntries(assumptionFields.map(field => [field.key, f.get(field.key)])), checked: Object.fromEntries(assumptionFields.map(field => [field.key, f.get(`confirm-${field.key}`) === 'on'])), note: f.get('review-note').trim() };
      const completed = approveInboxRun(updated);
      state.runs[state.runs.findIndex(r => r.id === run.id)] = completed;
      const story = stories.find(s => s.id === run.storyId);
      state.actions.unshift({ id: crypto.randomUUID(), runId: run.id, storyId: run.storyId, issuer: story.issuer, title: 'Workflow scenario completed', type: 'Approved scenario', owner: completed.reviewer, created: completed.approvedAt, status: 'Completed', note: `Coverage ${completed.result.baselineCoverage.toFixed(2)}x → ${completed.result.stressedCoverage.toFixed(2)}x; additional annual interest €${completed.result.additionalInterest.toFixed(1)}m. ` + assumptionFields.map(field => `${field.label}: ${completed.values[field.key]} ${field.unit}`).join('; ') + (completed.note ? `. Reviewer note: ${completed.note}` : '') });
      save(); closeModal(); view = 'inbox'; filter = 'All signals'; selected = run.storyId; shell();
      toast('Assumptions approved. The scenario result is ready on this story.');
    } catch (error) { toast(error.message); }
    return;
  }
  if (e.target.id === 'priority-form') { const reason = f.get('reason').trim(); if (!reason) return; state.overrides[selected] = { priority: f.get('priority'), reason }; save(); closeModal(); renderView(); toast('Priority assessment saved.'); }
  if (e.target.id === 'action-form') { if (!f.get('note').trim()) return; addAction({ type: f.get('type'), title: f.get('type'), owner: f.get('owner'), note: f.get('note').trim() }); closeModal(); toast('Action created. Find it in the Action center.'); }
  if (e.target.id === 'rename-form') { if (!f.get('name').trim()) return; state.workflow.name = f.get('name').trim(); save(); closeModal(); renderView(); }
  if (e.target.id === 'source-form') { if (!f.get('name').trim() || !f.get('detail').trim()) return; state.sources.push({ id: crypto.randomUUID(), name: f.get('name').trim(), kind: f.get('kind'), detail: f.get('detail').trim(), enabled: true, icon: f.get('kind') === 'Email' ? 'mail' : 'radio', count: 0, owner: 'Your source' }); save(); closeModal(); renderView(); toast('Sample source added.'); }
  if (e.target.id === 'scenario-form') {
    try { const debt = Number(f.get('debt')), shock = Number(f.get('shock')), ebitda = Number(f.get('ebitda')), interest = Number(f.get('interest')); const result = scenarioResult(debt, shock, ebitda, interest);
      modal.payload = `Debt €${debt}m; added spread ${shock} bps; EBITDA €${ebitda}m; baseline interest €${interest}m. Additional annual interest €${result.additionalInterest.toFixed(1)}m. Coverage ${result.baselineCoverage.toFixed(2)}x → ${result.stressedCoverage.toFixed(2)}x. Inputs reviewed by Alex Laurent. Illustrative sensitivity only.`;
      document.querySelector('#scenario-output').innerHTML = `<div class="eyebrow">ILLUSTRATIVE RESULT</div><div class="scenario-metric"><span>Stressed interest coverage</span><strong>${result.stressedCoverage.toFixed(2)}<small>x</small></strong><p>from ${result.baselineCoverage.toFixed(2)}x baseline coverage</p></div><div class="coverage-chart"><div><span>Baseline</span><i style="width:100%"></i><b>${result.baselineCoverage.toFixed(2)}x</b></div><div><span>Downside</span><i class="stressed" style="width:${100 * result.stressedCoverage / result.baselineCoverage}%"></i><b>${result.stressedCoverage.toFixed(2)}x</b></div></div><div class="fact-row"><span>Additional annual interest</span><strong>€${result.additionalInterest.toFixed(1)}m</strong></div>${button('Save scenario to actions', 'save-scenario', 'primary', 'clipboard')}<p class="field-source">Saved results retain all inputs and the approval note.</p>`;
    } catch (err) { toast(err.message); }
  }
});
let drag = null, suppressClick = false;
app.addEventListener('pointerdown', e => { const node = e.target.closest('.flow-node'); if (!node || e.button !== 0) return; if (canvasSimulation.running) cancelSimulation('Animation stopped so you can edit the canvas.'); drag = { node, id: node.dataset.step, startX: e.clientX, startY: e.clientY, x: parseFloat(node.style.left), y: parseFloat(node.style.top), moved: false }; });
window.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.startX) / zoom, dy = (e.clientY - drag.startY) / zoom; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (drag.moved) { drag.node.style.left = `${Math.min(workflowLayout().width - 270, Math.max(10, drag.x + dx))}px`; drag.node.style.top = `${Math.max(10, drag.y + dy)}px`; drawConnections(); } });
window.addEventListener('pointerup', () => { if (!drag) return; if (drag.moved) { const step = state.workflow.steps.find(s => s.id === drag.id); step.x = parseFloat(drag.node.style.left); step.y = parseFloat(drag.node.style.top); save(); suppressClick = true; setTimeout(() => suppressClick = false, 100); } drag = null; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && !modal) { e.preventDefault(); document.querySelector('#signal-search')?.focus(); } if (e.key === 'Tab' && modal) { const focusable = [...document.querySelectorAll('.modal button, .modal input, .modal select, .modal textarea, .modal a')].filter(el => !el.disabled); const first = focusable[0], last = focusable.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } });
save();
shell();

function addEnrichment() {
  let step = state.workflow.steps.find(s => s.type === 'enrich');
  if (!step) {
    step = newStep('enrich');
    state.workflow.steps.splice(state.workflow.steps.findIndex(s => s.type === 'match') + 1, 0, step);
    state.workflow.steps.forEach(s => { delete s.x; delete s.y; });
    state.workflow.active = false; save();
  }
  selectedStep = step.id; renderView();
  document.querySelector('.flow-node.selected')?.scrollIntoView({block:'nearest', inline:'nearest'});
}
function enrichmentInspector(step) {
  const config = step.enrichment;
  return `<div class="inspector-hint"><p>After portfolio matching, before the split. Extraction and publishing use the same context snapshot.</p></div><fieldset class="dataset-picker"><legend>Internal datasets</legend>${enrichmentDatasets.map(d => `<label><input type="checkbox" data-enrichment-dataset="${d.id}" ${config.datasets.includes(d.id) ? 'checked' : ''}/><span><strong>${d.label}</strong><small>${d.description}</small></span></label>`).join('')}</fieldset><label class="form-label">Flag data older than<select data-enrichment-field="maxAgeDays">${[30,90,180,365].map(n => `<option value="${n}" ${config.maxAgeDays === n ? 'selected' : ''}>${n} days</option>`).join('')}</select></label><label class="form-label">If data is stale or missing<select data-enrichment-field="issues"><option value="flag" ${config.issues === 'flag' ? 'selected' : ''}>Flag and continue</option><option value="pause" ${config.issues === 'pause' ? 'selected' : ''}>Pause for data review</option></select></label><p class="field-source">Missing values stay empty. Historical assumptions remain context until an analyst approves their use. Freshness is measured from each dataset’s as-of date.</p>${Object.values(enrichmentErrors(step)).map(e => `<p class="field-error">${esc(e)}</p>`).join('')}${button('Preview selected data', 'preview-enrichment', 'secondary', 'book')}<p class="field-source">Sample adapters only. No internal systems are queried.</p>`;
}
function enrichmentPreview(step) {
  const errors = Object.values(enrichmentErrors(step));
  if (errors.length) return `<div class="validation-box">${errors.map(e => `<p>${esc(e)}</p>`).join('')}</div>`;
  const snapshot = enrichmentSnapshot(step, modal.missing ? [modal.missing] : []);
  return `<div class="info-banner">Shared by analysis and publishing · Sample snapshot ${enrichmentSampleDate}. Each field retains its source; enrichment does not overwrite source evidence or approve scenario assumptions.</div><label class="form-label">Try a data gap<select id="enrichment-gap"><option value="">Use sample dataset availability</option>${snapshot.datasets.map(d => `<option value="${d.id}" ${modal.missing === d.id ? 'selected' : ''}>${d.label} unavailable</option>`).join('')}</select></label><div class="context-outcome"><strong>${snapshot.paused ? 'Pause before both paths' : snapshot.issues.length ? 'Continue with quality flags' : 'Ready for both paths'}</strong><p>${snapshot.issues.length} dataset(s) stale or missing. Threshold: ${step.enrichment.maxAgeDays} days. ${snapshot.paused ? 'Data review would be required before extraction or publishing.' : 'Source dates and any quality flags travel with the context.'}</p></div><div class="context-grid">${snapshot.datasets.map(d => `<article class="context-card"><div>${badge(d.status, d.status === 'Available' ? 'support-badge' : 'high')}<h3>${d.label}</h3></div><p>${d.values || 'No value returned. Analyst input or a refreshed dataset is needed.'}</p><small>${d.source}<br>As of: ${d.asOf || 'Unavailable'}${d.ageDays === null ? '' : ' · ' + d.ageDays + ' days old'}</small></article>`).join('')}</div><p class="modal-disclaimer">This previews configuration only. Runtime context and data-review tasks would be available from the signal inbox in the full implementation.</p>`;
}
app.addEventListener('change', event => {
  const dataset = event.target.dataset.enrichmentDataset, field = event.target.dataset.enrichmentField;
  if (!dataset && !field) return;
  const step = state.workflow.steps.find(s => s.id === selectedStep);
  if (step?.type !== 'enrich') return;
  if (dataset) step.enrichment.datasets = enrichmentDatasets.filter(d => d.id === dataset ? event.target.checked : step.enrichment.datasets.includes(d.id)).map(d => d.id);
  if (field) step.enrichment[field] = field === 'maxAgeDays' ? Number(event.target.value) : event.target.value;
  state.workflow.active = false; save(); renderView();
});
document.querySelector('#modal-root').addEventListener('change', event => {
  if (event.target.id === 'enrichment-gap') { modal.missing = event.target.value; renderModal(); }
});
