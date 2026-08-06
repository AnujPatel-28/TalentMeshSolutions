import { ListSkeleton } from "@/components/ui/LoadingSkeletons";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <ListSkeleton title={true} action={false} count={8} />
    </div>
  );
}
