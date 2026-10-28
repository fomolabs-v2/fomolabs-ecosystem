import { readPrivate } from "@/lib/community-store";
import type { StoredMetadata } from "@/lib/launch-store";
import { validAddress } from "@/lib/validation";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ mint: string }> },
) {
  try {
    const { mint } = await params;
    if (!validAddress(mint)) return new Response("Not found", { status: 404 });
    const record = await readPrivate<StoredMetadata>(`metadata/${mint}.json`);
    if (!record) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(record.value.imageBase64, "base64"), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Unavailable", { status: 503 });
  }
}
