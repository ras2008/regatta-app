"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function SailCamera({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (sail: string, mode: "camera" | "live_beta") => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [hint, setHint] = useState<string>("Aim at the sail numbers. Good light helps a lot.");
  const [lastGuess, setLastGuess] = useState<string>("");

  const canUse = useMemo(() => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia, []);

  useEffect(() => {
    if (!open) return;

    (async () => {
      if (!canUse) {
        setHint("Camera not available in this browser/device.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setHint("Camera permission denied. Allow camera access in Safari/Chrome settings.");
      }
    })();

    return () => {
      setLive(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, canUse]);

  useEffect(() => {
    if (!open || !live) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const sail = await captureAndOCR();
      if (cancelled) return;

      if (sail && sail.length >= 4) {
        setHint(`Found: ${sail}`);
        onResult(sail, "live_beta");
        setLive(false);
        onClose();
        return;
      }

      // throttle
      setTimeout(tick, 900);
    };

    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, open]);

  async function captureAndOCR(): Promise<string> {
    if (!videoRef.current || !canvasRef.current) return "";
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return "";

    // Capture a center crop (numbers usually centered-ish)
    const vw = v.videoWidth || 1280;
    const vh = v.videoHeight || 720;

    const cropW = Math.floor(vw * 0.72);
    const cropH = Math.floor(vh * 0.30);
    const sx = Math.floor((vw - cropW) / 2);
    const sy = Math.floor((vh - cropH) / 2);

    c.width = cropW;
    c.height = cropH;
    ctx.drawImage(v, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    try {
      const { data } = await Tesseract.recognize(c, "eng", {
        // @ts-ignore
        tessedit_char_whitelist: "0123456789",
      });

      const raw = (data?.text ?? "").replace(/\s+/g, "");
      const digits = raw.replace(/[^0-9]/g, "");
      const cleaned = digits.slice(0, 7); // typical sail length range
      setLastGuess(cleaned || "");
      return cleaned || "";
    } catch {
      return "";
    }
  }

  async function handleCapture() {
    setBusy(true);
    setHint("Reading…");
    const sail = await captureAndOCR();
    if (sail) {
      setHint(`Captured: ${sail}`);
      onResult(sail, "camera");
      onClose();
    } else {
      setHint("Couldn’t read. Try closer / better light / steadier frame.");
    }
    setBusy(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm">
      <div className="mx-auto mt-6 w-[92%] max-w-3xl rounded-3xl border border-white/10 bg-slate-950 p-4 ring-1 ring-white/5">
        <div className="flex items-start justify-between gap-3 p-2">
          <div>
            <div className="text-lg font-semibold">Scan Sail Number</div>
            <div className="mt-1 text-sm text-slate-300">{hint}</div>
            {lastGuess ? <div className="mt-1 text-xs text-slate-400">Last guess: {lastGuess}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <video ref={videoRef} className="h-[55vh] w-full object-cover" playsInline muted />
          {/* target box */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[22%] w-[72%] rounded-2xl border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            disabled={busy}
            onClick={handleCapture}
            className={cn(
              "w-full rounded-2xl bg-white px-4 py-4 text-base font-semibold text-slate-950 ring-1 ring-white/10 active:scale-[0.99] md:w-auto",
              busy && "opacity-60"
            )}
          >
            {busy ? "Reading…" : "Capture"}
          </button>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 ring-1 ring-white/5">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              disabled={busy}
              className="h-4 w-4"
            />
            Live Scan (beta)
            <span className="text-xs text-slate-400">(tries every ~1s)</span>
          </label>

          <div className="text-xs text-slate-400 md:text-right">
            If OCR fails, just type the sail number manually.
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}