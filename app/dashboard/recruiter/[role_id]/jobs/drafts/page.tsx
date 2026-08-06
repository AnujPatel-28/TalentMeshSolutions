import { redirect } from 'next/navigation';

export default async function DraftJobsRedirect({ params }: { params: Promise<{ role_id: string }> }) {
    const { role_id } = await params;
    redirect(`/dashboard/recruiter/${role_id}/jobs?tab=drafts`);
}
