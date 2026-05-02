import { useCallback, useEffect, useRef, useState } from "react";
import { openTelegramBotUrl } from "../lib/telegramBot";

/**
 * After successful receipt submit: countdown then navigate to Telegram (same tab / new tab per openTelegramBotUrl).
 */
export function useTelegramReceiptRedirect() {
  const urlRef = useRef<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const cancelRedirect = useCallback(() => {
    urlRef.current = null;
    setSecondsLeft(null);
  }, []);

  const scheduleRedirect = useCallback((url: string, delaySeconds: number) => {
    urlRef.current = url;
    setSecondsLeft(delaySeconds);
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft === 0) {
      if (urlRef.current) openTelegramBotUrl(urlRef.current);
      urlRef.current = null;
      setSecondsLeft(null);
      return;
    }
    const id = window.setTimeout(() => {
      setSecondsLeft((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  return { secondsLeft, scheduleRedirect, cancelRedirect };
}
