import { useEffect, useRef, useState } from "react";

export type JobKey =
  | "generate_photos"
  | "generate_lyrics"
  | "generate_voice"
  | "generate_song"
  | "generate_video"
  | "generate_transcripts";

export type JobStatusValue = string | null;

export type JobStatusResponse = Record<JobKey, JobStatusValue>;

type Options = {
  enabled?: boolean;
  intervalMs?: number;
  endpoint?: string; // default: "/api/job-status"
};

export function useJobStatus(options: Options = {}) {
  const {
    enabled = true,
    intervalMs = 1000,
    endpoint = "/api/job-status",
  } = options;

  const [jobs, setJobs] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchOnce = async () => {
      try {
        setError(null);

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await fetch(endpoint, { signal: abortRef.current.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `GET ${endpoint} failed: ${res.status}`);
        }

        const data = (await res.json()) as JobStatusResponse;
        setJobs(data);
      } catch (e: unknown) {
        // ignore abort errors
        const msg =
          e instanceof Error ? e.message : "Failed to fetch job status";
        if (!msg.toLowerCase().includes("aborted")) setError(msg);
      }
    };

    // run immediately
    fetchOnce();

    // poll
    timerRef.current = window.setInterval(fetchOnce, intervalMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [enabled, intervalMs, endpoint]);

  return { jobs, error };
}


