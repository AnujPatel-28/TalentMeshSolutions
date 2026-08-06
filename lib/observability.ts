"use client";

export interface TraceLog {
  traceId: string;
  requestId: string;
  duration: number;
  endpoint: string;
  userRole?: string;
  status: 'success' | 'error' | 'timeout';
  errorDetails?: string;
  timestamp: string;
}

/**
 * Starts a distributed tracing block for a network request or edge function.
 */
export function startTrace(endpoint: string, role?: string) {
  // Generate random tokens for trace and request ids
  const traceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const requestId = Math.random().toString(36).substring(2, 15);
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  return {
    traceId,
    requestId,
    startTime,
    endpoint,
    userRole: role,
    timestamp: new Date().toISOString()
  };
}

/**
 * Prunes traces older than 7 days.
 */
export function pruneOldTraces(logs: TraceLog[]): TraceLog[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return logs.filter((log) => {
    try {
      return new Date(log.timestamp).getTime() > sevenDaysAgo;
    } catch {
      return false;
    }
  });
}

/**
 * Completes a trace, calculates execution latency, logs to trace queue, and dispatches events.
 * Preserves 100% of traces for errors, timeouts, and bulk actions; samples successful traces at 10%.
 */
export function endTrace(
  trace: ReturnType<typeof startTrace>,
  status: 'success' | 'error' | 'timeout',
  errorDetails?: string
): TraceLog {
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const duration = endTime - trace.startTime;
  
  const log: TraceLog = {
    traceId: trace.traceId,
    requestId: trace.requestId,
    duration,
    endpoint: trace.endpoint,
    userRole: trace.userRole,
    status,
    errorDetails,
    timestamp: trace.timestamp
  };

  // Structured trace logging for terminal logs and developer consoles
  console.log(`[Observability Trace] [${status.toUpperCase()}] ${trace.endpoint} - ${duration.toFixed(2)}ms (traceId: ${trace.traceId})`, log);

  if (typeof window !== 'undefined') {
    try {
      const isBulkAction = trace.endpoint.toLowerCase().includes('bulk') || trace.endpoint.toLowerCase().includes('export');
      const isErrorOrTimeout = status === 'error' || status === 'timeout';
      const shouldLog = isErrorOrTimeout || isBulkAction || Math.random() < 0.1;

      if (shouldLog) {
        let logs = JSON.parse(window.localStorage.getItem('tm_traces') || '[]');
        logs.push(log);
        
        // Prune traces older than 7 days
        logs = pruneOldTraces(logs);
        
        // Keep performance footprints small: keep last 500 traces (Gap C)
        if (logs.length > 500) {
          logs = logs.slice(-500);
        }
        
        window.localStorage.setItem('tm_traces', JSON.stringify(logs));
        
        // Dispatch event so layout banners or admin dashboards can listen to latency fluctuations
        window.dispatchEvent(new CustomEvent('observability:trace', { detail: log }));
      }
    } catch (err) {
      console.warn('Failed to store trace log in localStorage:', err);
    }
  }

  return log;
}

export interface OperationsMetrics {
  search_count: number;
  search_latency_sum: number;
  search_latency_count: number;
  bulk_actions: number;
  selection_count: number;
  abort_count: number;
  total_requests: number;
}

/**
 * Records client-side administrative operations metrics.
 * Applies a 10% sampling rate when recording 'search' counts and latencies.
 */
export function recordMetric(metricName: 'search' | 'bulk_action' | 'selection' | 'abort' | 'request', value: number) {
  if (typeof window === 'undefined') return;
  try {
    // 1. Get raw daily array
    const rawDaily = window.localStorage.getItem('tm_operations_metrics_daily');
    let dailyList: Array<{ date: string; metrics: OperationsMetrics }> = rawDaily ? JSON.parse(rawDaily) : [];

    // 2. Get today's date string (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // 3. Find or create today's record
    let todayRecord = dailyList.find(item => item.date === today);
    if (!todayRecord) {
      todayRecord = {
        date: today,
        metrics: {
          search_count: 0,
          search_latency_sum: 0,
          search_latency_count: 0,
          bulk_actions: 0,
          selection_count: 0,
          abort_count: 0,
          total_requests: 0
        }
      };
      dailyList.push(todayRecord);
    }

    // 4. Update the metric value
    if (metricName === 'search') {
      if (Math.random() < 0.1) {
        todayRecord.metrics.search_count += 1;
        todayRecord.metrics.search_latency_sum += value;
        todayRecord.metrics.search_latency_count += 1;
      }
    } else if (metricName === 'bulk_action') {
      todayRecord.metrics.bulk_actions += 1;
    } else if (metricName === 'selection') {
      todayRecord.metrics.selection_count = Math.max(todayRecord.metrics.selection_count, value);
    } else if (metricName === 'abort') {
      todayRecord.metrics.abort_count += 1;
    } else if (metricName === 'request') {
      todayRecord.metrics.total_requests += 1;
    }

    // 5. Retain only the last 30 days and prevent metrics growth (Gap C)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    dailyList = dailyList.filter(item => {
      try {
        return new Date(item.date).getTime() > thirtyDaysAgo;
      } catch {
        return false;
      }
    });

    // Sort dailyList and keep at most 30 daily records (Gap C)
    dailyList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (dailyList.length > 30) {
      dailyList = dailyList.slice(-30);
    }

    // 6. Save daily list to localStorage
    window.localStorage.setItem('tm_operations_metrics_daily', JSON.stringify(dailyList));

    // 7. Sum up all values from the last 30 days to produce the aggregated single object
    const aggregated: OperationsMetrics = {
      search_count: 0,
      search_latency_sum: 0,
      search_latency_count: 0,
      bulk_actions: 0,
      selection_count: 0,
      abort_count: 0,
      total_requests: 0
    };

    for (const item of dailyList) {
      aggregated.search_count += item.metrics.search_count;
      aggregated.search_latency_sum += item.metrics.search_latency_sum;
      aggregated.search_latency_count += item.metrics.search_latency_count;
      aggregated.bulk_actions += item.metrics.bulk_actions;
      aggregated.selection_count = Math.max(aggregated.selection_count, item.metrics.selection_count);
      aggregated.abort_count += item.metrics.abort_count;
      aggregated.total_requests += item.metrics.total_requests;
    }

    // 8. Save aggregated metrics to standard key (so reports page reads it seamlessly)
    window.localStorage.setItem('tm_operations_metrics', JSON.stringify(aggregated));

    // 9. Dispatch custom event for dashboard update
    window.dispatchEvent(new CustomEvent('observability:metric', { detail: aggregated }));
  } catch (err) {
    console.warn('Failed to record observability metric:', err);
  }
}
