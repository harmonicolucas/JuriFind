export function createRateLimiter({ limit, windowMs, now = () => Date.now(), maxKeys = 5000 }) {
  const hits = new Map();
  return function allow(key) {
    const time = now();
    const recent = (hits.get(key) || []).filter((stamp) => time - stamp < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(time);
    hits.delete(key);
    hits.set(key, recent);
    while (hits.size > maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined || oldest === key) break;
      hits.delete(oldest);
    }
    return allowed;
  };
}
