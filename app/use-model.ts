"use client";

// The one way a screen reads the personal model: on the client, after mount, so the server render
// never claims to know something only this device holds. `refresh` takes the record a store
// mutation returns, so a screen re-renders from the same object it just wrote.

import { useCallback, useEffect, useState } from "react";
import { deviceLearningStorage } from "@/learn/cursor";
import { readModel, type ModelRecord } from "@/model/store";

export function useModel(): { record: ModelRecord | null; refresh: (next?: ModelRecord) => void; storage: typeof deviceLearningStorage } {
  const [record, setRecord] = useState<ModelRecord | null>(null);
  const refresh = useCallback((next?: ModelRecord) => setRecord(next ?? readModel(deviceLearningStorage)), []);
  useEffect(() => {
    const sync = () => refresh();
    sync();
    window.addEventListener("adhdme:personalisation", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("adhdme:personalisation", sync); window.removeEventListener("storage", sync); };
  }, [refresh]);
  return { record, refresh, storage: deviceLearningStorage };
}
