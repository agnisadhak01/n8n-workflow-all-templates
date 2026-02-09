import JSZip from "jszip";
import type { IndexTemplate } from "@/types/browse";

export async function downloadAsZip(templates: IndexTemplate[]) {
  const zip = new JSZip();
  for (const t of templates) {
    try {
      const res = await fetch(t.rawUrl);
      const blob = await res.blob();
      zip.file(t.filename, blob);
    } catch {
      // Skip failed fetches
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `n8n-templates-${templates.length}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
