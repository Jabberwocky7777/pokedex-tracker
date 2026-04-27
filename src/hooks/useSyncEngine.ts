import { useEffect, useRef } from "react";
import { useDexStore } from "../store/useDexStore";
import { useIvStore } from "../store/useIvStore";
import { useBoxSlotStore } from "../store/useBoxSlotStore";
import { useDesignerStore } from "../store/useDesignerStore";
import { hasToken, pullData, pushData, buildPayload } from "../lib/sync";
import { useSyncStatus } from "./useSyncStatus";
import type { BackupData } from "../lib/backup";

const DEBOUNCE_MS  = 2_000;
const POLL_INTERVAL_MS = 30_000;

function applySnapshot(data: BackupData) {
  if (data?.tracker) {
    useDexStore.setState({
      caughtByGen: data.tracker.caughtByGen,
      pendingByGen: data.tracker.pendingByGen,
    });
  }
  if (data?.ivChecker) {
    useIvStore.setState({ savedSessions: data.ivChecker.savedSessions });
  }
  if (data?.boxSlots) {
    useBoxSlotStore.getState().setSlotsByGen(data.boxSlots);
  }
  if (Array.isArray(data?.designer)) {
    useDesignerStore.getState().setSlots(data.designer as ReturnType<typeof useDesignerStore.getState>["slots"]);
  }
}

export function useSyncEngine() {
  const { setSyncing, setLastSynced, setError, setForcePush } = useSyncStatus();

  const isPulling      = useRef(false);
  const hasPendingPush = useRef(false);
  const isFirstRender  = useRef(true);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pull on mount + every 30s (pauses when tab is hidden) ───────────────
  useEffect(() => {
    if (!hasToken()) return;

    async function doPull() {
      // Skip pull if the user is actively typing or has unsaved local changes
      const tag = document.activeElement?.tagName?.toLowerCase();
      const userIsTyping = tag === "input" || tag === "textarea" || tag === "select";
      if (userIsTyping || hasPendingPush.current) return;

      try {
        const result = await pullData();
        if (!result.ok) {
          setError("Sync failed — retrying…");
          return;
        }
        setError(null);
        if (result.data) {
          isPulling.current = true;
          applySnapshot(result.data);
          setLastSynced(new Date(result.savedAt!));
          setTimeout(() => { isPulling.current = false; }, 0);
        }
      } catch {
        setError("Sync failed — retrying…");
      }
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (timer !== null) return;
      timer = setInterval(doPull, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (timer !== null) { clearInterval(timer); timer = null; }
    }

    function handleVisibilityChange() {
      if (document.hidden) stopPolling();
      else startPolling();
    }

    doPull();
    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    setForcePush(async () => {
      setSyncing(true);
      try {
        const result = await pushData(buildPayload());
        if (result.ok) {
          setLastSynced(new Date(result.savedAt!));
          setError(null);
        } else {
          setError("Push failed");
        }
      } catch {
        setError("Push failed");
      } finally {
        setSyncing(false);
      }
    });

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setForcePush(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // one timer for the app lifetime

  // ── Push on state changes (debounced) ────────────────────────────────────
  const caughtByGen   = useDexStore((s) => s.caughtByGen);
  const pendingByGen  = useDexStore((s) => s.pendingByGen);
  const savedSessions = useIvStore((s) => s.savedSessions);
  const slotsByGen    = useBoxSlotStore((s) => s.slotsByGen);
  const designerSlots = useDesignerStore((s) => s.slots);

  useEffect(() => {
    if (isFirstRender.current || isPulling.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    hasPendingPush.current = true;
    setSyncing(true);

    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      if (!hasToken()) { hasPendingPush.current = false; setSyncing(false); return; }
      try {
        const result = await pushData(buildPayload());
        if (result.ok) {
          setLastSynced(new Date(result.savedAt!));
          setError(null);
        } else {
          setError("Push failed");
        }
      } catch {
        setError("Push failed");
      } finally {
        hasPendingPush.current = false;
        setSyncing(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [caughtByGen, pendingByGen, savedSessions, slotsByGen, designerSlots]); // eslint-disable-line react-hooks/exhaustive-deps
}
