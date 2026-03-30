import { redirect } from "next/navigation";

export default function ReferralRedirect({
  params,
}: {
  params: { code: string };
}) {
  redirect(`/register?ref=${params.code}`);
}
