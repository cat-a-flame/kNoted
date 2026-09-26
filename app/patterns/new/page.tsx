import { redirect } from 'next/navigation';

/** The form lives in a dialog on /patterns now. */
export default function NewPatternPage() {
  redirect('/patterns?new');
}
