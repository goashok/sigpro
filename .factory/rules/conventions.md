# Conventions

- Plain ES modules (`"type": "module"`), no dependencies, no build step, no bundler, no lockfile. Don't add npm packages; browser code in `public/` is served as-is by `server.js`.
- Layout: `public/model.js` (sample data, step catalog, workflow validation, scenario maths, migrations), `public/graph.js` (graph-based workflow editor logic), `public/app.js` (UI, DOM, localStorage persistence), `server.js` (static server only), `docs/platform-design.md` (design).
- Keep domain logic pure in `model.js`/`graph.js` so it is testable in Node; `app.js` must not hold logic that tests need.
- Code style is compact: 2-space indent, single quotes, semicolons, terse one-line functions. Match surrounding code.
- Everything is a simulated prototype: no real integrations, backend, credentials, or network calls. Data is illustrative and persists only in browser localStorage; changing the saved-state shape needs a migration (see `migrateWorkflow`).
- Don't edit README product behaviour claims without updating the code to match (e.g. connections never rewire/insert into existing arrows; removing a card removes only its arrows).
