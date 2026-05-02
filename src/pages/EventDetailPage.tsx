import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { requestEvents } from "../lib/api";
import {
  formatEventDate,
  formatEventTimeRange,
  eventCategory,
  eventCoverImageUrl,
  isSoldOut,
  minPriceEtb,
  publishedEvents
} from "../lib/eventUtils";
import {
  fetchTelegramDeepLink,
  openTelegramBotUrl,
  readReceiptSubmitBody,
  telegramFallbackMessage
} from "../lib/telegramBot";
import type { EventItem, OrderResponse } from "../types";

function DetailIconCalendar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function DetailIconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function DetailIconPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

const defaultApiUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const userBotLink = import.meta.env.VITE_USER_BOT_LINK ?? "https://t.me/ticketr_user_demo_bot";

/** Shown when API omits receiverNumber; override with VITE_PAYMENT_PHONE */
const defaultPaymentPhone =
  String(import.meta.env.VITE_PAYMENT_PHONE ?? "").trim() || "947360468";

function resolvePaymentPhone(order: OrderResponse | null): string {
  const fromApi = order?.paymentInstruction.receiverNumber?.trim();
  if (fromApi) return fromApi;
  return defaultPaymentPhone;
}

function feedbackTone(text: string): "success" | "error" | "warn" {
  if (text.startsWith("Order created")) return "success";
  if (text === "Opening Telegram again…") return "success";
  if (
    text.includes("Set up the ticket bot") ||
    text.includes("No Telegram deep link") ||
    text.includes("/claim ")
  ) {
    return "warn";
  }
  if (
    text.includes("Open Telegram") ||
    text.includes("Tap Start") ||
    text.includes("continue with your ticket")
  ) {
    return "success";
  }
  return "error";
}

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const apiBaseUrl = defaultApiUrl;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [buying, setBuying] = useState(false);
  const [orderResponse, setOrderResponse] = useState<OrderResponse | null>(null);
  const [receiptNo, setReceiptNo] = useState("");
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [recoveringTelegram, setRecoveringTelegram] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await requestEvents(apiBaseUrl);
        if (!cancelled) {
          setEvents(payload);
          setSelectedTierId("");
          setOrderResponse(null);
        }
      } catch {
        if (!cancelled) setMessage("Could not load event.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, eventId]);

  useEffect(() => {
    setPhoneCopied(false);
  }, [orderResponse?.order.id]);

  useEffect(() => {
    if (!message || !feedbackRef.current) return;
    feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message]);

  const event = events.find((e) => e.id === eventId);
  const pub = publishedEvents(events);
  const eventPublished = event && pub.some((e) => e.id === event.id);
  const tiers = event?.tiers.filter((t) => t.active) ?? [];
  const soldOut = event ? isSoldOut(event) : true;
  const minPrice = event ? minPriceEtb(event) : null;

  async function buyTicket() {
    if (!event?.id || !selectedTierId) {
      setMessage("Select a tier to continue.");
      return;
    }
    setBuying(true);
    setMessage("");
    setOrderResponse(null);
    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tierId: selectedTierId })
      });
      if (!response.ok) throw new Error("Could not create order. Try again.");
      const payload = (await response.json()) as OrderResponse;
      setOrderResponse(payload);
      setReceiptNo("");
      setMessage("Order created. Complete payment, then submit your receipt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setBuying(false);
    }
  }

  async function copyPaymentPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      setPhoneCopied(true);
      window.setTimeout(() => setPhoneCopied(false), 2000);
    } catch {
      setMessage("Could not copy automatically. Select the number and copy manually.");
    }
  }

  async function submitReceipt() {
    if (!orderResponse?.order.id) {
      setMessage("Create an order first.");
      return;
    }
    if (!receiptNo.trim()) {
      setMessage("Enter receipt number before submitting.");
      return;
    }
    setSubmittingReceipt(true);
    setMessage("");
    const orderRef = orderResponse.order.orderRef;
    try {
      const formData = new FormData();
      formData.append("receiptNo", receiptNo.trim());
      const response = await fetch(`${apiBaseUrl}/orders/${orderResponse.order.id}/receipt`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("Failed to submit receipt.");

      const receiptData = await readReceiptSubmitBody(response);

      const tgUrl = receiptData.telegramOpenBotUrl;
      const nextHint = receiptData.telegramNextStepHint?.trim();

      setOrderResponse((prev) =>
        prev
          ? {
              ...prev,
              telegramOpenBotUrl:
                typeof tgUrl === "string" && tgUrl.length > 0 ? tgUrl : prev.telegramOpenBotUrl,
              telegramNextStepHint:
                nextHint && nextHint.length > 0 ? nextHint : prev.telegramNextStepHint
            }
          : prev
      );

      if (typeof tgUrl === "string" && tgUrl.length > 0) {
        openTelegramBotUrl(tgUrl);
        setMessage(
          nextHint && nextHint.length > 0
            ? nextHint
            : "Open Telegram, then tap Start to continue with your ticket."
        );
      } else {
        setMessage(telegramFallbackMessage(orderRef));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setSubmittingReceipt(false);
    }
  }

  async function recoverTelegramLink() {
    if (!orderResponse?.order.id) return;
    setRecoveringTelegram(true);
    setMessage("");
    try {
      const url = await fetchTelegramDeepLink(apiBaseUrl, orderResponse.order.id);
      if (url) {
        setOrderResponse((prev) => (prev ? { ...prev, telegramOpenBotUrl: url } : prev));
        openTelegramBotUrl(url);
        setMessage("Opening Telegram again…");
      } else {
        setMessage(telegramFallbackMessage(orderResponse.order.orderRef));
      }
    } catch {
      setMessage(telegramFallbackMessage(orderResponse.order.orderRef));
    } finally {
      setRecoveringTelegram(false);
    }
  }

  if (loading) {
    return (
      <main className="pzm-detail">
        <p className="pzm-muted pzm-detail__loading">Loading…</p>
      </main>
    );
  }

  if (!event || !eventPublished) {
    return (
      <main className="pzm-detail">
        <p className="pzm-muted">This event isn&apos;t available.</p>
        <Link to="/" className="pzm-btn pzm-btn--dark pzm-detail__back">
          Back to events
        </Link>
      </main>
    );
  }

  const category = eventCategory(event);
  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const priceNum = (p: string) => {
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <main className="pzm-detail">
      <div className="pzm-detail__hero">
        <img src={eventCoverImageUrl(event)} alt={event.name} className="pzm-detail__heroImg" fetchPriority="high" />
        <div className="pzm-detail__heroScrim" />
        <div className="pzm-detail__heroBar" aria-hidden>
          <span className="pzm-detail__heroBarInner" />
        </div>
      </div>

      <div className="pzm-detail__layout">
        <article className="pzm-detail__main">
          <Link to="/" className="pzm-detail__crumb">
            <span className="pzm-detail__crumbIcon" aria-hidden>
              ←
            </span>{" "}
            All events
          </Link>
          <div className="pzm-detail__head">
            <span className="pzm-detail__badge">{category}</span>
            <h1 className="pzm-detail__title">{event.name}</h1>
            <ul className="pzm-detail__factList">
              <li className="pzm-detail__fact">
                <span className="pzm-detail__factIcon">
                  <DetailIconCalendar />
                </span>
                <span>
                  <span className="pzm-detail__factLabel">Date</span>
                  {formatEventDate(event.startsAt)}
                </span>
              </li>
              <li className="pzm-detail__fact">
                <span className="pzm-detail__factIcon">
                  <DetailIconClock />
                </span>
                <span>
                  <span className="pzm-detail__factLabel">Time</span>
                  {formatEventTimeRange(event.startsAt, event.endsAt)}
                </span>
              </li>
              <li className="pzm-detail__fact">
                <span className="pzm-detail__factIcon">
                  <DetailIconPin />
                </span>
                <span>
                  <span className="pzm-detail__factLabel">Venue</span>
                  {event.location ?? "TBA"}
                </span>
              </li>
            </ul>
          </div>
          {event.description?.trim() ? (
            <div className="pzm-detail__about">
              <h2 className="pzm-detail__aboutTitle">About this event</h2>
              <div className="pzm-detail__prose">
                {event.description.split("\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <aside className="pzm-detail__aside">
          {message ? (
            <div
              ref={feedbackRef}
              role="status"
              aria-live="polite"
              className={
                "pzm-detail__feedback pzm-detail__feedback--" + feedbackTone(message)
              }
            >
              {message}
            </div>
          ) : null}
          <div className="pzm-ticketCard">
            <div className="pzm-ticketCard__accent" aria-hidden />
            <div className="pzm-ticketCard__intro">
              <h2 className="pzm-ticketCard__heading">Tickets</h2>
              {soldOut ? (
                <p className="pzm-ticketCard__soldOut">Sold out</p>
              ) : minPrice != null ? (
                <p className="pzm-ticketCard__from">
                  From <strong>{minPrice.toLocaleString()} ETB</strong>
                </p>
              ) : null}
            </div>

            {!soldOut && tiers.length > 0 ? (
              <div className="pzm-ticketCard__tiers">
                <p className="pzm-ticketCard__tierLabel" id="tier-picker-label">
                  Choose your tier
                </p>
                <div
                  className="pzm-tierPicker"
                  role="radiogroup"
                  aria-labelledby="tier-picker-label"
                >
                  {tiers.map((tier) => {
                    const selected = selectedTierId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={
                          "pzm-tierOption" + (selected ? " pzm-tierOption--selected" : "")
                        }
                        onClick={() => setSelectedTierId(tier.id)}
                      >
                        <span className="pzm-tierOption__radio" aria-hidden />
                        <span className="pzm-tierOption__body">
                          <span className="pzm-tierOption__name">{tier.tierName}</span>
                          {tier.tierCode ? (
                            <span className="pzm-tierOption__code">{tier.tierCode}</span>
                          ) : null}
                        </span>
                        <span className="pzm-tierOption__price">
                          <span className="pzm-tierOption__currency">ETB</span>
                          <span className="pzm-tierOption__amount">
                            {priceNum(tier.price).toLocaleString()}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedTier ? (
                  <p className="pzm-ticketCard__selectionHint">
                    <strong>{selectedTier.tierName}</strong>
                    <span className="pzm-ticketCard__selectionDot" aria-hidden />
                    {priceNum(selectedTier.price).toLocaleString()} ETB
                  </p>
                ) : (
                  <p className="pzm-ticketCard__selectionHint pzm-ticketCard__selectionHint--mute">
                    Tap a tier to continue
                  </p>
                )}
                <button
                  type="button"
                  className="pzm-btn pzm-btn--cta pzm-btn--block"
                  onClick={buyTicket}
                  disabled={buying || !selectedTierId}
                >
                  {buying ? "Processing…" : "Continue to payment"}
                </button>
              </div>
            ) : null}

            {orderResponse ? (
              <div className="pzm-order pzm-order--compact">
                <div className="pzm-order__accent" aria-hidden />
                <h3 className="pzm-order__title">Complete payment</h3>
                <p className="pzm-order__steps">
                  Send the exact amount to the number below, then enter your Telebirr receipt number and
                  submit.
                </p>
                <div className="pzm-order__refBox">
                  <span className="pzm-order__refLabel">Order ref</span>
                  <code className="pzm-order__ref">{orderResponse.order.orderRef}</code>
                </div>
                <div className="pzm-order__phoneBox">
                  <span className="pzm-order__phoneLabel">Send payment to this number</span>
                  <div className="pzm-order__phoneRow">
                    <code className="pzm-order__phone">{resolvePaymentPhone(orderResponse)}</code>
                    <button
                      type="button"
                      className="pzm-order__copyBtn"
                      aria-label={phoneCopied ? "Phone number copied" : "Copy phone number"}
                      onClick={() => copyPaymentPhone(resolvePaymentPhone(orderResponse))}
                    >
                      {phoneCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <p className="pzm-order__amountLine">
                  Pay{" "}
                  <strong className="pzm-order__amount">
                    ETB {orderResponse.paymentInstruction.exactAmount}
                  </strong>{" "}
                  <span className="pzm-order__receiver">
                    to {orderResponse.paymentInstruction.receiverName}
                  </span>
                </p>
                {typeof orderResponse.telegramOpenBotUrl === "string" &&
                orderResponse.telegramOpenBotUrl.length > 0 ? (
                  <div className="pzm-order__earlyTg">
                    <button
                      type="button"
                      className="pzm-btn pzm-btn--outline pzm-btn--block"
                      onClick={() => openTelegramBotUrl(orderResponse.telegramOpenBotUrl!)}
                    >
                      Get ticket in Telegram
                    </button>
                    {orderResponse.telegramNextStepHint ? (
                      <p className="pzm-order__tgHint">{orderResponse.telegramNextStepHint}</p>
                    ) : (
                      <p className="pzm-order__tgHint pzm-order__tgHint--muted">
                        Opens Telegram with your order reference.
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="pzm-order__receipt">
                  <label className="pzm-field pzm-field--tight">
                    <span>Receipt number</span>
                    <input
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      placeholder="Telebirr receipt"
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="button"
                    className="pzm-btn pzm-btn--outline pzm-btn--block"
                    onClick={submitReceipt}
                    disabled={submittingReceipt}
                  >
                    {submittingReceipt ? "…" : "Submit receipt"}
                  </button>
                </div>
                <div className="pzm-order__telegramFoot">
                  <button
                    type="button"
                    className="pzm-btn pzm-btn--outline pzm-btn--block"
                    onClick={recoverTelegramLink}
                    disabled={recoveringTelegram || submittingReceipt}
                  >
                    {recoveringTelegram ? "Loading…" : "Get Telegram link again"}
                  </button>
                  <p className="pzm-order__footNote">
                    Fetches the link from the server if you closed the app or need another try.
                  </p>
                  {typeof orderResponse.telegramOpenBotUrl === "string" &&
                  orderResponse.telegramOpenBotUrl.length > 0 ? (
                    <p className="pzm-order__hint">
                      <a
                        href={orderResponse.telegramOpenBotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Telegram (same link)
                      </a>
                    </p>
                  ) : (
                    <p className="pzm-order__hint pzm-order__hint--fallback">
                      No deep link yet — after the server is configured, use{" "}
                      <a href={userBotLink} target="_blank" rel="noreferrer">
                        User Bot
                      </a>{" "}
                      with <code className="pzm-order__inlineRef">/claim {orderResponse.order.orderRef}</code>
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
