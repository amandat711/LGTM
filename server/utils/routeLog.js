/**
 * Structured logs for mutating API routes (visible in the Node server console).
 */
// JOCELYNE LI (100% estimated contribution) => Feature implementation, integration work, and quality refinements
function routeLog(namespace, action, meta = {}) {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console.log(`${new Date().toISOString()} [${namespace}] ${action}${extra}`);
}

module.exports = { routeLog };
