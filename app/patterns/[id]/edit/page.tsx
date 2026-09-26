import { redirect } from 'next/navigation';

/** The form lives in a dialog on the pattern page now. */
export default async function EditPatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/patterns/${id}?edit`);
}
