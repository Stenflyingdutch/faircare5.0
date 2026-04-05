import { redirect } from 'next/navigation';

export default function QuizStartPage() {
  redirect('/quiz/filter');
}
