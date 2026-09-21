# SigPro · Interactive credit signal prototype

A browser-based prototype for credit analysts: connect evidence to a credit story, explore its impact, design a workflow, and track follow-up actions.

## Run

Requires Node.js 18 or newer. No dependency installation is needed.

```sh
npm start
```

Open **http://localhost:3000**. To use a different port, run `PORT=3001 npm start`.

```sh
npm test
```

## Suggested walkthrough

1. Open the **Signal inbox**. Aster Automotive is flagged **Action required · Review assumptions** because its sample workflow has processed the source reports and reached an analyst checkpoint.
2. Select the story and click **Review assumptions**. Inspect sources and proposed assumptions, edit the values, and confirm each input. Edits persist if you return later; leaving without approval keeps the run paused. Marking a story as read does not approve its assumptions.
3. Choose **Approve & continue workflow**. The sample scenario uses those approved inputs. The inbox story now shows **Scenario ready**; choose **View scenario result** to see the result, inputs, reviewer, and approval time.
4. Choose **Take action** or **Create follow-up action** to create a review or assignment. The Action center retains completed workflow results and links to their approved inputs.
5. Choose **Simulate signal arrival** in the inbox to deliver another fixed sample run after completing the previous one. It requires a fresh approval and preserves previous results. An existing pending run is not duplicated.
6. Use **Workflow studio → Add source** to add independent inputs. Select each source and choose its type: web pages request a URL, email requests an inbox/folder, RSS requests a feed URL, subscriptions request provider/connection/data, and internal updates request stream/team. Every source connects to **Create / update Super Signal**, then **Match my portfolio** filters what continues. Select the Super Signal and choose **Try signal arrivals** to animate arrivals directly on the canvas. Send new signals, replay unchanged content (stops at Super Signal), send changed content (v2 continues), or try an uncovered issuer (stops at the portfolio filter). Cards and connecting paths highlight as each signal travels; review checkpoints pause their own path. Stop or reset the animation at any time. **Preview flow** validates required fields and shows the planned sequence. Preview never approves inbox tasks. The seeded runtime demonstration represents a fixed, previously published sample workflow; editing the draft does not modify received runs or the arrival fixture.
7. In **Workflow studio → Add Step**, choose **Summarize and Publish**. Edit the default summarization prompt and choose Analytical Desktop or Email. Email starts with the sample analyst address; change it and add/remove recipients as needed. This action can follow the portfolio filter directly without scenario or assumption-review steps. **Preview publication** shows a fixed sample summary and the configured destination, prompt, and recipients.
8. Select **Match my portfolio** and choose **Extract Scenario Inputs**, **Summarize and Publish**, or both. The canvas shows independent analysis and publishing paths. Select an extraction-path node and choose **Add next step** to insert a review, scenario, or follow-up action after it. Step arrows reorder within the same path. Each active path must end in an action; analysis-only and publishing-only designs are supported. A review checkpoint pauses only its own path in the design preview.
9. Visit **My sources** to enable, pause, or add sample connections.

## Prototype boundaries

- All issuers, ratings, exposures, evidence, and financial inputs are illustrative.
- Source connections, AI grouping/extraction, workflow activation, and execution traces are simulated. The inbox uses a fixed Aster Automotive arrival fixture. Its review checkpoint and subsequent sensitivity calculation work locally; changing design settings does not run live processing.
- The designer supports Sources → Create / update Super Signal → Match my portfolio → independent analysis and/or publishing paths. The first arrival creates the Super Signal for an issuer and credit topic. New signals join it; a repeated source ID + signal ID with identical content stops at the Super Signal without changing its version. Changed content updates the existing entry to the next version, retains previous content in history, and continues downstream. Transport timestamps do not create new versions. There is no separate deduplication or story-building step.
- Portfolio matching is a filter: matched Super Signals continue; unmatched ones stop before downstream analysis or inbox tasks. The editor shows both routes. The on-canvas arrival demonstration performs local aggregation and filtering against an explicitly labeled sample coverage list; it does not create inbox runs or publish content. Simulation state is temporary and separate from saved workflow settings. Editing or navigating away cancels animation, and reduced-motion settings are respected.
- Saved linear designs migrate to separate analysis and publishing paths. Existing publishing settings and analysis-step order are preserved. Legacy analysis actions without an extraction root receive an Extract Scenario Inputs root; migrated drafts require reactivation.
- Saved designs migrate to this structure. Source settings, portfolio selection, and downstream settings persist; the old grouping topic moves to the Super Signal. Retired duplicate/grouping configurations remain archived in local workflow data. Switching a source type retains that type’s previous field values. No credentials are collected or real integrations connected.
- Summarize and Publish saves its prompt and destination settings locally. The publication preview uses fixed illustrative content; it does not run the edited prompt, publish to Analytical Desktop, or send email. The analyst email defaults to `alex.laurent@example.com` from the sample profile.
- Actions are local records. No email, external assignments, ratings, or review jobs are sent or created.
- The scenario is a transparent annual interest-coverage sensitivity, not a credit rating model.
- Workflow settings, received runs, review drafts, approved inputs/results, source settings, overrides, and actions persist in browser local storage. **Reset demo** restores the sample workspace. There is no backend database, authentication, or multi-user synchronization.
- Fonts are optionally loaded from Google Fonts; local sans-serif fonts are used offline.

## Structure

- `public/app.js`: screens, interactions, workflow canvas, dialogs, and local persistence.
- `public/model.js`: sample domain objects, step catalog, workflow validation, and scenario calculation.
- `public/styles.css`: responsive interface styles.
- `server.js`: minimal static development server.
- `docs/platform-design.md`: product and future backend architecture.

The prototype isolates source adapters, normalized signals, contextual stories, and actions conceptually. The next implementation phase can replace the sample data and local persistence without changing the analyst-facing vocabulary.
