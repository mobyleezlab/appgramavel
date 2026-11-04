import type { Event } from "@sentry/react";

// Only technical diagnostics survive; arbitrary text and payloads can contain PII.
export function sanitizeMonitoringEvent<T extends Event>(event: T): T {
  const trace = event.contexts?.trace;
  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    environment: event.environment,
    release: event.release,
    type: event.type,
    start_timestamp: event.start_timestamp,
    transaction: event.transaction ? "app" : undefined,
    contexts: trace ? { trace: { trace_id: trace.trace_id, span_id: trace.span_id, op: trace.op, status: trace.status } } : undefined,
    user: event.user?.id ? { id: event.user.id } : undefined,
    exception: event.exception ? {
      values: event.exception.values?.map((exception) => ({
        type: exception.type,
        value: "[redacted]",
        stacktrace: exception.stacktrace ? {
          frames: exception.stacktrace.frames?.map((frame) => ({
            filename: frame.filename?.split(/[?#]/)[0],
            function: frame.function,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        } : undefined,
      })),
    } : undefined,
  } as T;
}

export function sanitizeAnalyticsUrl<T extends { url: string }>(event: T): T {
  const url = new URL(event.url, window.location.origin);
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}