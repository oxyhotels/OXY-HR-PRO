'use client';

interface ApiMetric {
  endpoint: string;
  durationMs: number;
  status: number;
  cached: boolean;
}

let apiMetrics: ApiMetric[] = [];
let cacheHits = 0;
let cacheRequests = 0;

export function recordApiMetric(endpoint: string, durationMs: number, status: number, cached = false) {
  apiMetrics.push({ endpoint, durationMs, status, cached });
  if (apiMetrics.length > 100) {
    apiMetrics = apiMetrics.slice(-100);
  }
}

export function recordCacheHit() {
  cacheHits += 1;
  cacheRequests += 1;
}

export function recordCacheMiss() {
  cacheRequests += 1;
}

export function getPerformanceSummary() {
  const total = apiMetrics.length;
  const average = total ? Math.round(apiMetrics.reduce((acc, item) => acc + item.durationMs, 0) / total) : 0;
  const successRate = total ? Math.round((apiMetrics.filter((item) => item.status >= 200 && item.status < 300).length / total) * 100) : 0;
  const hitRate = cacheRequests ? Math.round((cacheHits / cacheRequests) * 100) : 0;

  return {
    totalRequests: total,
    averageResponseTime: average,
    successRate,
    cacheHitRate: hitRate,
    cacheHits,
    cacheRequests,
    apiMetrics: apiMetrics.slice(-10).reverse(),
  };
}
