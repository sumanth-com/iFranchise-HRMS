import { AppRouteNotFound } from "@/components/common/app-route-not-found";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AppRouteNotFound />
    </div>
  );
}
