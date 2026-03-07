"use client";

/**
 * Challenges View
 * Shows: challenge list with points, photo submit modal
 * Data: /api/challenges, /api/challenges/complete
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "history">("available");

  useEffect(() => {
    setIsMounted(true);

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
          <LeafIcon className="w-4 h-4 text-green-600" />
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
  const completedToday = data?.challenges.filter((c) => c.is_completed) ?? [];
  const history = data?.completed_history ?? [];

  function getRelativeDayLabel(timestamp: string): string | null {
    const d = new Date(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfEntry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startOfToday.getTime() - startOfEntry.getTime()) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return null;
  }

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
            <p className="text-2xl font-bold text-sp-text leading-none">{completedToday.length}/{data.challenges.length}</p>
            <p className="pt-1 text-[12px] text-sp-text-secondary uppercase tracking-wide mt-1 leading-none">Completed</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-1 border border-gray-100">
        <button
          onClick={() => setActiveTab("available")}
          className={`py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "available" ? "bg-sp-chart text-sp-teal" : "text-sp-text-secondary"}`}
        >
          Available
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "history" ? "bg-sp-chart text-sp-teal" : "text-sp-text-secondary"}`}
        >
          History (7 days)
        </button>
      </div>

      {/* Available challenges */}
      {activeTab === "available" && (
        <div>
          <p className="text-sm font-semibold text-sp-text mb-2">Today&apos;s Challenges</p>
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
                  <p className="text-sm text-sp-text-secondary text-center py-4">All today&apos;s challenges completed!</p>
                </Card>
              )}
              {completedToday.length > 0 && (
                <Card>
                  <p className="text-sm text-sp-text-secondary text-center py-2">
                    Completed today: {completedToday.length}/{data?.challenges.length ?? 0}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div>
          <p className="text-sm font-semibold text-sp-text mb-2">Completed in the Past 7 Days</p>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingCard key={i} />)}</div>
          ) : history.length ? (
            <div className="space-y-3">
              {history.map((entry, idx) => (
                <Card key={`${entry.challenge_id}-${entry.completed_at}-${idx}`} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-sp-text">{entry.title}</p>
                      <p className="text-xs text-sp-text-secondary mt-1">
                        {getRelativeDayLabel(entry.completed_at) && (
                          <span className="font-semibold text-sp-teal mr-1">{getRelativeDayLabel(entry.completed_at)} · </span>
                        )}
                        {new Date(entry.completed_at).toLocaleString("en-SG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-sp-teal inline-flex items-center gap-1">
                      <span>+{entry.points_earned}</span>
                      <LeafIcon className="w-4 h-4 text-green-600" />
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-sp-text-secondary text-center py-4">No completed challenges in the past 7 days.</p>
            </Card>
          )}
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
      {isMounted && toast && createPortal(
        <div className="fixed inset-0 z-[90] pointer-events-none">
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md bg-sp-chart text-black text-sm font-medium px-4 py-3 rounded-2xl shadow-lg text-center"
            style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
          >
            {toast}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
