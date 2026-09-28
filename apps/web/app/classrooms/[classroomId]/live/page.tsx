"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useIsStandalone } from "@/lib/useStandalone";
import { useAuth } from "@/lib/auth-context";
import { PwaLiveSession } from "@/components/pwa/PwaLiveSession";
import { PwaLoading } from "@/components/pwa/shared";

// PWA-only route: the installed app's full-screen session control room.
// Nothing in the browser UI links here; anyone who lands on it outside the
// installed app is sent to the regular classroom page instead.
export default function ClassroomLivePage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const router = useRouter();
  const isStandalone = useIsStandalone();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (isStandalone === false) router.replace(`/classrooms/${classroomId}`);
  }, [isStandalone, classroomId, router]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=/classrooms/${classroomId}/live`);
  }, [loading, user, classroomId, router]);

  if (isStandalone === false) return null;
  if (isStandalone !== true || loading || !user) return <PwaLoading />;
  return <PwaLiveSession classroomId={classroomId} />;
}
