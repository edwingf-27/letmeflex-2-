import { redirect } from "next/navigation";

export default function DashboardGeneratePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category;
  if (category) {
    redirect(`/generate?category=${encodeURIComponent(category)}`);
  }
  redirect("/generate");
}
