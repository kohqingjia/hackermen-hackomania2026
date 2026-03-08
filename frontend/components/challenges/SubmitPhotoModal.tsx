"use client";

import { useRef, useState } from "react";
import type { Challenge } from "@/lib/types";
import LeafIcon from "@/components/shared/LeafIcon";

interface SubmitPhotoModalProps {
  challenge: Challenge;
  onClose: () => void;
  onSubmit: (challengeId: string, photoBase64?: string) => void;
  loading: boolean;
}

export default function SubmitPhotoModal({
  challenge,
  onClose,
  onSubmit,
  loading,
}: SubmitPhotoModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    onSubmit(challenge.challenge_id, preview ?? undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-bold text-sp-text">{challenge.title}</h3>
            <p className="text-xs text-sp-text-secondary mt-0.5">{challenge.description}</p>
          </div>
          <button onClick={onClose} className="text-sp-text-secondary p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Photo upload */}
        {challenge.requires_photo && (
          <div className="mb-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />

            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-2xl" />
                <button
                  onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1"
                >
                  <svg className="w-4 h-4 text-sp-text" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-sp-mint rounded-2xl flex flex-col items-center justify-center gap-2 text-sp-text-secondary hover:bg-sp-chart/30 transition-colors"
              >
                <svg className="w-8 h-8 stroke-sp-mint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <span className="text-sm font-medium">Take or upload a photo</span>
                <span className="text-xs">Proof of completion</span>
              </button>
            )}
          </div>
        )}

        {/* Points summary */}
        <div className="bg-sp-chart rounded-xl p-3 flex justify-between items-center mb-4">
          <span className="text-sm text-sp-text">Earned</span>
          <span className="text-lg font-bold text-sp-teal inline-flex items-center gap-1">
            <span>+{challenge.points}</span>
            <LeafIcon className="w-5 h-5 text-green-600" />
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || (challenge.requires_photo && !preview)}
          className="w-full bg-sp-teal text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
