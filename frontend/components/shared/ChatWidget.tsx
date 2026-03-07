"use client";

import { useEffect, useRef, useState } from "react";

const LIBRECHAT_URL =
  process.env.NEXT_PUBLIC_LIBRECHAT_URL ?? "http://localhost:3090";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
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

  function handleOpen() {
    setIframeLoaded(false);
    setIframeError(false);
    setOpen(true);
    // Sync the logged-in user to the backend so LibreChat reads their ClickHouse data
    const userId = localStorage.getItem("powerblock_user_id");
    if (userId) {
      fetch(`${API_URL}/api/session/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {});
    }
  }

  return (
    <div
      ref={popupRef}
      className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3"
    >
      {/* ── Popup panel ────────────────────────────────────────────── */}
      {open && (
        <div
          className="chat-popup-enter flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{
            width: "min(420px, calc(100vw - 2rem))",
            height: "min(620px, calc(100vh - 10rem))",
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
                <p className="text-[10px] text-white/75 leading-tight">Powered by your live energy data</p>
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

          {/* Body */}
          <div className="relative flex-1 bg-sp-bg">
            {/* Loading spinner */}
            {!iframeLoaded && !iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sp-bg z-10">
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "3px solid #9DE1D3", borderTopColor: "#2DB7A3" }} />
                <p className="text-xs text-sp-text-secondary">Connecting to AI Coach...</p>
              </div>
            )}

            {/* Error state — LibreChat not running */}
            {iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-sp-bg z-10 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-sp-mint flex items-center justify-center">
                  <svg className="w-6 h-6 text-sp-teal" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-sp-text mb-1">AI Coach not running</p>
                  <p className="text-xs text-sp-text-secondary">Start LibreChat with:</p>
                  <code className="text-xs bg-gray-100 rounded px-2 py-1 mt-1 inline-block">
                    docker compose -f docker-compose.librechat.yml up -d
                  </code>
                </div>
              </div>
            )}

            <iframe
              src={LIBRECHAT_URL}
              title="PowerBlock AI Coach"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
              className="w-full h-full border-0"
              allow="microphone; camera"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        </div>
      )}

      {/* ── Floating button ─────────────────────────────────────────── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label={open ? "Close AI Coach" : "Open AI Coach"}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-sp-teal hover:bg-opacity-90 active:scale-95 shadow-lg flex items-center justify-center transition-all duration-200"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
      </button>
    </div>
  );
}
