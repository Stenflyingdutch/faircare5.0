import { ReviewScreen } from '@/app/review/ReviewScreen';
import { useRouter } from 'expo-router';

export default function ReviewTabRoute() {
  const router = useRouter();
  return <ReviewScreen onViewResults={() => router.push('/results/overview' as never)} />;
}
