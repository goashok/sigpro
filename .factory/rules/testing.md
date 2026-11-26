# Testing

- Run `npm test` (runs `node --test`); tests use `node:test` and `node:assert/strict`.
- Tests live in `tests/*.test.js` and import from `../public/model.js` and `../public/graph.js`. Add new cases to the matching file (model → `model.test.js`, graph → `graph.test.js`).
- There is no DOM/browser test setup; test pure functions, not `public/app.js`.
- Build state with `initialState()`, `createGraph()`, `newStep()` and mutate/`structuredClone` it; don't depend on localStorage or the network.
- Every behaviour change in model/graph code needs a test.
