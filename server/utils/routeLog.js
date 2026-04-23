/**
 * Structured logs for mutating API routes (visible in the Node server console).
 */
function routeLog(namespace, action, meta = {}) {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console.log(`${new Date().toISOString()} [${namespace}] ${action}${extra}`);
}

module.exports = { routeLog };
