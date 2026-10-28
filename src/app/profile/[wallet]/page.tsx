import { notFound } from "next/navigation";
import { validAddress } from "@/lib/validation";
import { PublicProfile } from "@/components/launch-community";
export const metadata = { title: "Community profile · FomoLabs" };
export default async function Page({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  if (!validAddress(wallet)) notFound();
  return <PublicProfile address={wallet} />;
}
