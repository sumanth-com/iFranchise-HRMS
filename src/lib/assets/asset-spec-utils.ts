export type AssetSpecFields = {
  chip?: string | null;
  memory?: string | null;
  storage?: string | null;
  operatingSystem?: string | null;
  accessories?: string | null;
  connectionType?: string | null;
};

const SPEC_PREFIX = "---asset-specs---";

export function buildAssetNotes(specs: AssetSpecFields, remarks?: string | null): string | null {
  const hasSpecs = Object.values(specs).some((v) => v?.trim());
  const parts: string[] = [];

  if (hasSpecs) {
    parts.push(
      `${SPEC_PREFIX}\n${JSON.stringify({
        chip: specs.chip?.trim() || null,
        memory: specs.memory?.trim() || null,
        storage: specs.storage?.trim() || null,
        operatingSystem: specs.operatingSystem?.trim() || null,
        accessories: specs.accessories?.trim() || null,
        connectionType: specs.connectionType?.trim() || null,
      })}`,
    );
  }

  if (remarks?.trim()) {
    parts.push(remarks.trim());
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function parseAssetSpecs(notes: string | null | undefined): AssetSpecFields {
  if (!notes?.trim()) return {};

  const markerIndex = notes.indexOf(SPEC_PREFIX);
  if (markerIndex >= 0) {
    const jsonPart = notes.slice(markerIndex + SPEC_PREFIX.length).trim();
    const jsonLine = jsonPart.split("\n").find((line) => line.trim().startsWith("{"));
    if (jsonLine) {
      try {
        const parsed = JSON.parse(jsonLine) as AssetSpecFields;
        return {
          chip: parsed.chip ?? null,
          memory: parsed.memory ?? null,
          storage: parsed.storage ?? null,
          operatingSystem: parsed.operatingSystem ?? null,
          accessories: parsed.accessories ?? null,
          connectionType: parsed.connectionType ?? null,
        };
      } catch {
        /* fall through */
      }
    }
  }

  if (notes.includes("Configuration:")) {
    return { accessories: notes.replace(/^Configuration:\s*/i, "").trim() || null };
  }

  return {};
}

export function parseAssetRemarks(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;

  let text = notes;
  const markerIndex = text.indexOf(SPEC_PREFIX);
  if (markerIndex >= 0) {
    text = text.slice(0, markerIndex).trim();
    const after = notes.slice(markerIndex + SPEC_PREFIX.length).trim();
    const afterLines = after.split("\n").filter((line) => !line.trim().startsWith("{"));
    if (afterLines.length) {
      text = [text, afterLines.join("\n").trim()].filter(Boolean).join("\n\n");
    }
  }

  if (text.startsWith("Configuration:")) return null;
  return text.trim() || null;
}
