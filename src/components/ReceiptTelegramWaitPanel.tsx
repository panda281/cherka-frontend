import { useEffect, useMemo, useState } from "react";
import { RECEIPT_TELEGRAM_REDIRECT_SECONDS } from "../lib/telegramBot";

const ROTATE_MS = 2400;

const TIPS = [
  "Your receipt is saved - we are getting Telegram ready for you.",
  "Hang tight - this is quicker than the queue at the door.",
  "Next: tap Start in Telegram to grab your ticket.",
  "Almost there - connecting you to the Ticketr bot.",
  "Thanks for paying - almost time to celebrate."
];

export function ReceiptTelegramWaitPanel({
  secondsLeft,
  totalSeconds = RECEIPT_TELEGRAM_REDIRECT_SECONDS
}: {
  secondsLeft: number;
  totalSeconds?: number;
}) {
  const [tipIndex, setTipIndex] = useState(0);

  const progress = useMemo(() => {
    const elapsed = totalSeconds - secondsLeft;
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
  }, [secondsLeft, totalSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  return (
    <div className="pzm-wait" role="status" aria-live="polite">
      <div className="pzm-wait__glow" aria-hidden />
      <div className="pzm-wait__progressTrack" aria-hidden>
        <div className="pzm-wait__progressFill" style={{ width: `${progress}%` }} />
      </div>
      <p className="pzm-wait__eyebrow">Step into Telegram</p>
      <p className="pzm-wait__countdown">
        <span className="pzm-wait__countNum" key={secondsLeft}>
          {secondsLeft}
        </span>
        <span className="pzm-wait__countSuffix">seconds left</span>
      </p>
      <p className="pzm-wait__tip" key={tipIndex}>
        {TIPS[tipIndex]}
      </p>
      <div className="pzm-wait__dots" aria-hidden>
        <span className="pzm-wait__dot" />
        <span className="pzm-wait__dot" />
        <span className="pzm-wait__dot" />
      </div>
    </div>
  );
}
