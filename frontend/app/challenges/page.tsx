"use client";

/**
 * Challenges View
 * Shows: challenge list with points, photo submit modal
 * Data: /api/challenges, /api/challenges/complete
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Card, { LoadingCard } from "@/components/shared/Card";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import SubmitPhotoModal from "@/components/challenges/SubmitPhotoModal";
import LeafIcon from "@/components/shared/LeafIcon";
import { getChallenges, completeChallenge } from "@/lib/api";
import type { ChallengesResponse, Challenge } from "@/lib/types";

export default function ChallengesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<ChallengesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ReactNode | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem("powerblock_user_id");
    if (!uid) { router.replace("/onboarding"); return; }
    setUserId(uid);

    getChallenges(uid)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(challengeId: string, photoBase64?: string) {
    if (!userId) return;
    setSubmitting(true);
    try {
      const res = await completeChallenge({ user_id: userId, challenge_id: challengeId, photo_base64: photoBase64 });
      setToast(
        <span className="inline-flex items-center justify-center gap-1">
          <span>+{res.points_earned}</span>
          <LeafIcon className="w-4 h-4 text-green-200" />
          <span>{res.message}</span>
        </span>
      );
      setActiveChallenge(null);
      // Refresh challenges
      const updated = await getChallenges(userId);
      setData(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  const pending = data?.challenges.filter((c) => !c.is_completed) ?? [];
  const completed = data?.challenges.filter((c) => c.is_completed) ?? [];

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div>
        <p className="text-xs text-sp-text-secondary uppercase tracking-wide">Challenges</p>
        <h1 className="text-xl font-bold text-sp-text mt-0.5 inline-flex items-center gap-1">
          <span>Earn GreenUP</span>
          <LeafIcon className="w-5 h-5 text-green-600" />
        </h1>
        <p className="text-xs text-sp-text-secondary">Complete challenges to earn points for your block</p>
      </div>

      {/* Points summary */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center py-4 min-h-[88px] flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-sp-teal inline-flex items-center gap-1 justify-center leading-none">
              <span>{data.total_points}</span>
              <LeafIcon className="w-5 h-5 text-green-600" />
            </p>
            <p className="pt-1 text-[12px] text-sp-text-secondary uppercase tracking-wide mt-1 inline-flex items-center gap-1 justify-center leading-none">
              <span>Total</span>
            </p>
          </Card>
          <Card className="text-center py-4 min-h-[88px] flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-sp-text leading-none">{completed.length}/{data.challenges.length}</p>
            <p className="pt-1 text-[12px] text-sp-text-secondary uppercase tracking-wide mt-1 leading-none">Completed</p>
          </Card>
        </div>
      )}

      {/* Active challenges */}
      <div>
        <p className="text-sm font-semibold text-sp-text mb-2">Available</p>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingCard key={i} />)}</div>
        ) : (
          <div className="space-y-3">
            {pending.map((ch) => (
              <ChallengeCard
                key={ch.challenge_id}
                challenge={ch}
                onComplete={setActiveChallenge}
              />
            ))}
            {pending.length === 0 && (
              <Card>
                <p className="text-sm text-sp-text-secondary text-center py-4">All challenges completed!</p>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Completed challenges */}
      {completed.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-sp-text mb-2">Completed</p>
          <div className="space-y-3">
            {completed.map((ch) => (
              <ChallengeCard key={ch.challenge_id} challenge={ch} onComplete={() => {}} />
            ))}
          </div>
        </div>
      )}

      {/* Submit modal */}
      {activeChallenge && (
        <SubmitPhotoModal
          challenge={activeChallenge}
          onClose={() => setActiveChallenge(null)}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-sp-teal text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg text-center z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
