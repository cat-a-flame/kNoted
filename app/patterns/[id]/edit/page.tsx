import { PatternEditor } from '@/components/patterns/PatternEditor';

export default async function EditPatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatternEditor patternId={id} />;
}
