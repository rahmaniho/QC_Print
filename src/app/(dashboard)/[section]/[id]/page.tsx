import { notFound } from "next/navigation";
import { InspectionDetails } from "@/components/data-views";

export default async function DetailPage({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  if (section !== "inspections") notFound();
  return <InspectionDetails id={id} />;
}
