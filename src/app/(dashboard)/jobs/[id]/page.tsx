import { JobDetails } from "@/components/data-views";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetails id={id} />;
}
