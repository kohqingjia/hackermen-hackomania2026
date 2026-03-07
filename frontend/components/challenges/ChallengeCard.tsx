"use client";

import clsx from "clsx";
import type { Challenge } from "@/lib/types";

interface ChallengeCardProps {
  challenge: Challenge;
  onComplete: (challenge: Challenge) => void;
}

const TYPE_ICONS: Record<string, string> = {
  photo:     "📷",
  automatic: "⚡",
  weekly:    "📅",
};

export default function ChallengeCard({ challenge, onComplete }: ChallengeCardProps) {
  return (
    <div className={clsx(
      "bg-white rounded-2xl border p-4 flex items-start gap-3 transition-opacity",
      challenge.is_completed ? "opacity-60" : ""
    )}>
      {/* Icon circle */}
      <div className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0",
        challenge.is_completed ? "bg-green-50" : "bg-sp-chart"
      )}>
        {challenge.is_completed ? "✅" : TYPE_ICONS[challenge.challenge_type] || "🎯"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={clsx(
              "text-sm font-semibold",
              challenge.is_completed ? "text-sp-text-secondary line-through" : "text-sp-text"
            )}>
              {challenge.title}
            </p>
            <p className="text-xs text-sp-text-secondary mt-0.5 leading-relaxed">
              {challenge.description}
            </p>
          </div>
          {/* Points badge */}
          <span className={clsx(
            "flex-shrink-0 text-sm font-bold px-2 py-0.5 rounded-full",
            challenge.is_completed
              ? "bg-green-50 text-green-600"
              : "bg-sp-chart text-sp-teal-dark"
          )}>
            +{challenge.points}
          </span>
        </div>

        {/* CTA */}
        {!challenge.is_completed && (
          <button
            onClick={() => onComplete(challenge)}
            className="mt-3 text-xs font-semibold text-sp-teal border border-sp-mint rounded-lg px-3 py-1.5 hover:bg-sp-chart transition-colors"
          >
            {challenge.requires_photo ? "Submit Photo" : "Mark Complete"}
          </button>
        )}

        {challenge.is_completed && challenge.completed_at && (
          <p className="text-[10px] text-sp-text-secondary mt-2">
            Completed {new Date(challenge.completed_at).toLocaleDateString("en-SG")}
          </p>
        )}
      </div>
    </div>
  );
}
