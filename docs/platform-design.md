# Credit signal platform

## Product intent

Give credit analysts a configurable path from information to a justified credit action. Analysts bring their own sources, attach information to the credits they cover, combine related evidence, extract useful assumptions, and choose what happens next through a visual process builder.

## Analyst experience

The workspace has three connected views:

- **Signal inbox:** a prioritized queue scoped to an analyst's portfolio, showing the affected credits, why each item matters, new evidence, and outstanding actions.
- **Credit story:** an evidence-backed hypothesis, its affected credits, supporting and conflicting evidence, extracted assumptions, and action history.
- **Workflow studio:** a visual canvas of selectable steps, configured through plain-language forms and previewed against sample signals before activation.

An example flow is: Watch central-bank announcements and licensed news → Create/update a refinancing Super Signal → Filter to portfolio exposures → Extract rates and maturity assumptions → Ask an analyst to confirm assumptions → Run a downside scenario → Create a review task when an approved threshold is crossed.

Each step offers sensible defaults, an explanation, and a sample input/output. Technical IDs, adapter configuration, and model prompts belong in advanced administration. Analysts can branch by conditions, pause for approval, and select actions from a catalog. Activation requires valid connections and complete configuration; saved drafts may be incomplete.

## Domain model

| Construct | Purpose |
| --- | --- |
| Source connection | An analyst or team's authorized source, credentials reference, permitted use, ingestion schedule, and health. |
| Observation | Immutable source evidence with source ID, native item ID, publication and ingestion times, provenance, access policy, and a reference to permitted content. |
| Signal | A normalized event or assertion derived from observations, with entities, event type, effective time, extracted facts, and evidence references. |
| Credit context | A portfolio-specific relationship between a signal and an issuer, instrument, sector, or exposure, with a rationale and matching confidence. |
| Credit story / super signal | A versioned credit-impact hypothesis linked to distinct signals, preserving supporting, conflicting, and unresolved evidence. |
| Enrichment | Versioned extracted facts or derived assumptions with units, dates, source citations, method, confidence, and review status. |
| Priority assessment | Context-specific importance, severity, urgency, confidence, resulting queue priority, rationale, and assessment version. |
| Workflow definition | Versioned nodes and connections, configuration, conditions, source bindings, and permissions. |
| Workflow run | Execution against a pinned workflow version and input snapshot, including status and step-level trace. |
| Action | An authorized request such as scenario execution, review creation, assignment, notification, or export, with ownership and execution status. |

A Super Signal is created before portfolio filtering, on the first arrival for the same issuer and credit topic. Repeated source signals are checked inside it, keyed by source ID and signal ID. Identical content stops there without a new version or downstream processing; changed content updates the entry and continues; new distinct signals are added. Match my portfolio then continues matched Super Signals and stops unmatched ones before analysis or inbox tasks.

The same signal can matter differently to different portfolios. Keep portfolio relevance and priority assessments separate from the shared signal. Entity matching must distinguish issuers, subsidiaries, parents, and instruments; unresolved matches enter a review queue.

## Super Signal lifecycle and evidence

Deduplication belongs inside the Super Signal. The first source arrival creates the aggregate immediately. If the same source emits the same signal with unchanged substantive content, stop that delivery at the Super Signal without incrementing the signal or aggregate version or triggering downstream work. If substantive content changed, update the existing entry, retain its previous version, increment to v2 (and later versions), and continue. Ignore transport-only timestamp changes when comparing content; never append a duplicate entry. Use source identity plus the stable source-native signal identifier. Distinct signal identities remain distinct entries, including identical identifiers from different sources. Cross-source event equivalence may be recorded without losing provenance or treating syndication as independent corroboration.

Within the Super Signal, credit context answers **“Do these distinct events affect the same credit hypothesis?”** A rate increase, an upcoming maturity wall, and weakening operating cash flow can jointly support a refinancing-pressure story. Group using affected entities or exposures, a credit mechanism, and a configurable time horizon. Similar wording alone is insufficient.

A story is a hypothesis, not an established conclusion. It carries a concise impact rationale and evidence roles. New information can strengthen, weaken, reopen, or resolve it. Analysts can merge, split, dismiss, or correct grouping; all changes retain history. Similarity and AI suggestions remain reviewable.

## Priority

Keep these dimensions visible:

- **Importance:** relevance to the covered credit and materiality of the exposure or credit driver.
- **Severity:** estimated magnitude of the potential credit impact, with a direction and horizon.
- **Urgency:** how soon the analyst needs to act, including upcoming review deadlines or financing events.
- **Confidence:** evidence quality and uncertainty in entity matching and impact interpretation.

Map importance, severity, and urgency to configurable queue bands such as Critical, High, Medium, and Low. Show the inputs and rationale. Low confidence should trigger verification rather than automatically suppress a potentially severe event. Missing assessments remain “Needs assessment”; they must not silently become zero. Overrides require a reason and are recorded. A priority label is not a credit rating recommendation.

## Workflow step catalog

| Step | Analyst configuration | Result |
| --- | --- | --- |
| Watch sources | Personal/team sources, topics, frequency | Observations |
| Create / update Super Signal | Issuer and credit topic; source identity | Versioned aggregate with built-in duplicate updates and evidence lineage |
| Match my portfolio | Portfolio, issuers, sectors, exposure relationships | Matched Super Signals continue; unmatched ones stop |
| Assess priority | Importance/severity criteria, urgency rules | Explainable queue order |
| Extract information | Fields, units, dates, permitted evidence | Cited values and explicit unknowns |
| Enrich credit context | Approved data sources and attributes | Versioned contextual data |
| Check a condition | Business fields, operators, thresholds | Conditional branches |
| Request analyst review | Reviewer, required fields, due time | Approved/corrected/rejected state |
| Run a scenario | Model, mappings, baseline, shocks | Model run with reproducible inputs |
| Create a review | Review type, owner, due date | Tracked review job |
| Assign analysis | Assignee/team, question, deliverable, due date | Tracked investigation task |
| Summarize and Publish | Editable summary prompt; Analytical Desktop or Email; editable analyst email and additional recipients | Source-linked summary delivered to the configured destination |
| Notify or export | Authorized destination, content | Delivery record |

AI extraction cannot invent missing values. Every extracted value needs an evidence reference; derived assumptions must be distinguished from facts. Scenario actions validate required fields, dimensions, currencies, units, and dates. Pin the model and assumption versions so a run can be reproduced. Analyst approval is configurable by action policy, with explicit approval appropriate for consequential downstream actions.

## Adapter and execution architecture

Source adapters emit observations through a stable contract. They own authentication, provider formats, cursors, rate limits, and provider-specific retrieval. The workflow engine sees domain objects rather than source-specific payloads. Preserve provider metadata in a namespaced extension field.

Maintain separate registries for source adapters, enrichment providers, scenario models, and action connectors. Each declares its configuration schema, input/output schemas, capability version, and required permissions. Expose analyst-friendly forms from curated schema metadata. New adapters should not require changes to the orchestration engine.

Suggested backend boundaries are ingestion, evidence storage, normalization/entity resolution, story assembly, enrichment, priority assessment, workflow execution, and action dispatch. These can begin as modules in one deployable application. A queue and relational persistence support ingestion and durable workflow execution; specialist search/vector infrastructure is optional until scale or retrieval quality requires it.

Runs pin a workflow version. Steps receive typed inputs and return typed outputs plus evidence lineage. Validate compatible connections, required configuration, branch completeness, and cycles before activation. Support a portfolio-match branch point with independent scenario-analysis and summary/publishing paths. Analysts may choose either path or both, and append review, scenario, or follow-up actions within each path. Validation is path-specific: an approval on one path cannot satisfy another path’s prerequisite. A review pause does not block the sibling publishing path. Initially support directed acyclic flows with durable approval pauses; explicit scheduled re-evaluation starts a new run.

Expect at-least-once delivery. Use stable ingestion keys, idempotent step execution, and action idempotency keys to prevent duplicate work. Record retries, timeouts, cancellations, and failures. Retry transient failures with backoff; route exhausted or invalid inputs to a visible exception queue. External actions require reconciliation where a provider cannot guarantee idempotency.

## Access and audit

Respect source licenses and inherited access permissions at ingestion, retrieval, enrichment, grouping, and export. A grouped story must not expose restricted evidence or restricted derived content to unauthorized analysts. Share personal-source content only when permitted. Store credentials outside workflow definitions and redact them from logs.

Maintain lineage from action and scenario output back through assumptions, stories, signals, and original observations. Record model/provider versions and analyst edits. Treat retrieved content as untrusted data; content cannot grant tool permissions or change workflow instructions.

## First usable release

Deliver one coherent vertical path: configurable source inputs → Super Signal creation/update with internal deduplication → portfolio filter → explainable priority → cited extraction → analyst confirmation → scenario or assigned review task.

Provide an inbox, story detail, visual workflow builder, run history, and source connection screen. Initially demonstrate integrations with clearly labeled sample adapters; production integrations depend on the agency's source entitlements, identity system, and model interfaces.

Acceptance examples:

- Three syndicated reports appear as one event with three retained source references.
- Three distinct events can form one refinancing story with an explicit credit mechanism.
- Conflicting evidence remains visible and updates the story assessment.
- A signal affecting two portfolios can have different priority and reasoning in each.
- An analyst can configure and preview a workflow without writing code.
- Missing extracted values block dependent scenario execution and request review.
- Replaying ingestion or retrying a run does not create duplicate external tasks.
- Every scenario assumption and action can be traced to evidence and approvals.

## Decisions to settle before production

Confirm identity and tenancy boundaries, required sources and licenses, portfolio/exposure data ownership, scenario model APIs, task-system integrations, evidence retention, permitted AI providers, and action approval policies. These do not prevent a prototype but determine the production integration plan.

### Shared credit-context enrichment

The optional **Enrich credit context** step belongs immediately after portfolio matching and before the analysis/publishing split. Entity identification needed for Super Signal grouping remains an adapter/normalization responsibility. Context enrichment fetches datasets only for covered credits and gives both downstream paths the same dated snapshot.

Analysts select high-level datasets: ratings/reviews, financial statements, debt/liquidity/covenants, portfolio exposures/relationships, and prior assumptions/scenario results. They choose a freshness threshold and either flag-and-continue or pause-for-data-review. Historical assumptions are context, never automatically approved scenario inputs. Missing fields must remain missing; source evidence must remain separate from internal context.

The prototype offers sample snapshots, provenance dates, a missing-dataset preview, and inline arrival simulation of the quality gate. It does not fetch internal data or create runtime enrichment-review inbox tasks. In a full implementation, the inbox should expose the snapshot on the Super Signal and allow the assigned analyst to resolve quality issues before releasing both paths. Snapshot IDs and versions should be pinned to each run for reproducibility; underlying data updates require an explicit refresh policy.
