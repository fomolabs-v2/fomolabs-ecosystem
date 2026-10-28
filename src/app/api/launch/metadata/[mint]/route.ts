import { NextResponse } from "next/server";
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
    const { name, symbol, description, image, external_url } = record.value;
    return NextResponse.json(
      {
        name,
        symbol,
        description,
        image,
        external_url,
        attributes: [],
        properties: {
          files: [{ uri: image, type: "image/webp" }],
          category: "image",
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response("Unavailable", { status: 503 });
  }
}
