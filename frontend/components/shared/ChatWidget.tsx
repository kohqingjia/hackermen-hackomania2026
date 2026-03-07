"use client";

import { useEffect, useRef, useState } from "react";

const LIBRECHAT_URL =
  process.env.NEXT_PUBLIC_LIBRECHAT_URL ?? "http://localhost:3080";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (open && popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Prevent body scroll on mobile when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Reset loading state each time popup opens
  function handleOpen() {
    setIframeLoaded(false);
    setOpen(true);
  }

  return (
    // Wrapper sits above the bottom NavBar (NavBar = 64px = bottom-16, add 16px gap → bottom-20)
    <div
      ref={popupRef}
      className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3"
    >
      {/* ── Popup panel ────────────────────────────────────────────── */}
      {open && (
        <div
          className="chat-popup-enter flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{
            width: "min(360px, calc(100vw - 2rem))",
            height: "min(520px, calc(100vh - 12rem))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-sp-teal flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">PowerBlock AI Coach</p>
                <p className="text-[10px] text-white/75 leading-tight">Ask how to save energy</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body — iframe + loading overlay */}
          <div className="relative flex-1 bg-sp-bg">
            {/* Loading spinner */}
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sp-bg z-10">
                <div className="w-8 h-8 border-3 border-sp-mint border-t-sp-teal rounded-full animate-spin" style={{ borderWidth: 3 }} />
                <p className="text-xs text-sp-text-secondary">Connecting to AI Coach...</p>
              </div>
            )}
            <iframe
              src={LIBRECHAT_URL}
              title="PowerBlock AI Coach"
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full border-0"
              allow="microphone; camera"
            />
          </div>
        </div>
      )}

      {/* ── Floating button ─────────────────────────────────────────── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label={open ? "Close AI Coach" : "Open AI Coach"}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-sp-teal hover:bg-sp-teal-dark active:scale-95 shadow-lg flex items-center justify-center transition-all duration-200"
      >
        {open ? (
          // X icon when open
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Chat bubble icon when closed
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
      </button>
    </div>
  );
}
