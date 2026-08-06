import { ListSkeleton } from '@/components/ui/LoadingSkeletons';

export default function Loading() {
  return <ListSkeleton title={true} action={false} count={4} />;
}
