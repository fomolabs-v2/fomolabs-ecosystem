import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
export function requestOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = [
    "https://www.fomolabs.world",
    "https://fomolabs.world",
    "https://fomolabs-ecosystem.vercel.app",
  ];
  if (process.env.VERCEL_URL) allowed.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV !== "production")
    allowed.push("http://localhost:4210");
  if (!origin || !allowed.includes(origin))
    throw new Error("Open FomoLabs directly to approve this action.");
  return origin;
}
export async function boundedJSON(req: NextRequest, max = 12000) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new Error("JSON request required.");
  if (Number(req.headers.get("content-length") || 0) > max)
    throw new Error("Request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Request is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function communityError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join(" · "),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const message =
    error instanceof Error ? error.message : "Please try again shortly.";
  const safe =
    /wallet|approval|token|profile|callout|wait|capacity|request|sign|launch|name|symbol|description|image|website|control characters|JSON|Only the author|Hold this|FomoLabs/i.test(
      message,
    ) && !/blob|token=|secret|stack|https?:/i.test(message);
  return NextResponse.json(
    {
      error: safe
        ? message
        : "FOMOLAUNCH is temporarily unavailable. Please retry.",
    },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
