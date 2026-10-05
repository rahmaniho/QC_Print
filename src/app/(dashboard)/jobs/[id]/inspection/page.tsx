import { InspectionWizard } from "@/components/inspection-wizard";

export default async function NewInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InspectionWizard jobId={id} />;
}
