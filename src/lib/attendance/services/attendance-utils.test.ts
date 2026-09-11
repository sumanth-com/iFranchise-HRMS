import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toDisplayAttendanceNotes } from "@/lib/attendance/services/attendance-utils";

describe("toDisplayAttendanceNotes", () => {
  it("hides excel sheet sync identifiers from employee-facing remarks", () => {
    assert.equal(toDisplayAttendanceNotes("excel-sept-2026-sheet-sync"), null);
    assert.equal(toDisplayAttendanceNotes("excel-2026-09-sheet-sync"), null);
    assert.equal(toDisplayAttendanceNotes("Excel Sept 2026 Sheet Sync"), null);
  });

  it("hides provenance / import metadata tags", () => {
    assert.equal(toDisplayAttendanceNotes("src:P|import:batch-1"), null);
    assert.equal(toDisplayAttendanceNotes("excel-import-2026-09"), null);
    assert.equal(toDisplayAttendanceNotes("migration-2026-09-attendance"), null);
  });

  it("keeps genuine human remarks", () => {
    assert.equal(toDisplayAttendanceNotes("Client visit ran late"), "Client visit ran late");
    assert.equal(
      toDisplayAttendanceNotes("excel-sept-2026-sheet-sync|Approved late arrival"),
      "Approved late arrival",
    );
    assert.equal(
      toDisplayAttendanceNotes("src:P|Traffic delay"),
      "Traffic delay",
    );
  });

  it("returns null for empty notes so UI can show —", () => {
    assert.equal(toDisplayAttendanceNotes(null), null);
    assert.equal(toDisplayAttendanceNotes("   "), null);
  });
});
