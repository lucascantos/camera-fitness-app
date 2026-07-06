// Shared Save/Load (export/import) wiring for the whole app: the Save-Load bar
// under the header and the Data section in Settings both use this so the
// confirm-before-replace + reload behaviour stays identical.

import { useCallback, useRef, useState } from "react";
import { exportDataToFile, importDataFromText } from "@/data/transfer";

export interface DataTransferStatus {
  kind: "ok" | "err";
  msg: string;
}

export function useDataTransfer() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<DataTransferStatus | null>(null);

  const save = useCallback(async () => {
    try {
      await exportDataToFile();
      setStatus({ kind: "ok", msg: "Backup downloaded." });
    } catch {
      setStatus({ kind: "err", msg: "Couldn't create the backup." });
    }
  }, []);

  // Opens the file picker; the actual load happens in onFileChange.
  const pickFile = useCallback(() => fileRef.current?.click(), []);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!window.confirm(
      "Loading a backup will replace ALL current data (plans, history, settings) " +
      "with the contents of this file. This can't be undone. Continue?"
    )) return;
    try {
      await importDataFromText(await file.text());
      setStatus({ kind: "ok", msg: "Data loaded — reloading…" });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Load failed." });
    }
  }, []);

  return { fileRef, status, save, pickFile, onFileChange };
}
