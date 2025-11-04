export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const hits = new Map();
  return function allow(key) {
    const time = now();
    const recent = (hits.get(key) || []).filter((stamp) => time - stamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(time);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}
