// Inline Save (export) / Load (import) controls for all app data, sitting in
// the header next to the logo. Same backup the Data section in Settings
// produces.

import { useDataTransfer } from "@/hooks/useDataTransfer";

export function SaveLoadBar() {
  const { fileRef, status, save, pickFile, onFileChange } = useDataTransfer();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={save}
        className="px-4 py-1.5 rounded-full text-sm font-semibold bg-accent text-on_accent hover:bg-accent-hov transition"
      >
        Save
      </button>
      <button
        onClick={pickFile}
        className="px-4 py-1.5 rounded-full text-sm font-semibold bg-panel-dark text-ink border border-border hover:bg-bg transition"
      >
        Load
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onFileChange}
        className="hidden"
      />
      {status && (
        <span className={"text-sm whitespace-nowrap " + (status.kind === "ok" ? "text-good" : "text-accent")}>
          {status.msg}
        </span>
      )}
    </div>
  );
}
