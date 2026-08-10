// Export/import (Save/Load) the full app database as a JSON file. Import
// replaces all data and reloads so the in-memory store caches rehydrate.
// Shares its wiring with the Save/Load bar under the header.

import { useDataTransfer } from "@/hooks/useDataTransfer";

export function DataSection() {
  const { fileRef, status, save, pickFile, onFileChange } = useDataTransfer();

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="font-bold mb-1">Data</div>
      <p className="text-sm text-gray-dark mb-3">
        Your data lives only in this browser. Save a backup to keep it or move
        it to another device, then load it back here.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={save}
          className="px-4 py-2 rounded-2xl text-sm font-semibold bg-accent text-on_accent hover:bg-accent-hov transition"
        >
          Save data
        </button>
        <button
          onClick={pickFile}
          className="px-4 py-2 rounded-2xl text-sm font-semibold bg-panel-dark text-ink border border-border hover:bg-bg transition"
        >
          Load data
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          className="hidden"
        />
      </div>
      {status && (
        <div className={"text-sm mt-3 " + (status.kind === "ok" ? "text-good" : "text-accent")}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
