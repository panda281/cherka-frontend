import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createOrder, requestEvents } from "../lib/api";
import {
  formatEventDate,
  formatEventTimeRange,
  eventCategory,
  eventCoverImageUrl,
  effectiveUnitPriceEtb,
  formatTierPriceLabel,
  isSoldOut,
  minPriceEtb,
  publishedEvents
} from "../lib/eventUtils";
import type { EventItem, OrderResponse } from "../types";

const defaultApiUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const userBotLink = import.meta.env.VITE_USER_BOT_LINK ?? "https://t.me/ticketr_user_demo_bot";

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const apiBaseUrl = defaultApiUrl;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [orderResponse, setOrderResponse] = useState<OrderResponse | null>(null);
  const [receiptNo, setReceiptNo] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await requestEvents(apiBaseUrl);
        if (!cancelled) {
          setEvents(payload);
          setSelectedTierId("");
          setQuantity(1);
          setOrderResponse(null);
          setPromoCode("");
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

  const event = events.find((e) => e.id === eventId);
  const pub = publishedEvents(events);
  const eventPublished = event && pub.some((e) => e.id === event.id);
  const tiers = event?.tiers.filter((t) => t.active) ?? [];
  const soldOut = event ? isSoldOut(event) : true;
  const minPrice = event ? minPriceEtb(event) : null;
  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;
  const estimatedUnit = selectedTier ? effectiveUnitPriceEtb(selectedTier) : null;

  async function buyTicket() {
    if (!event?.id || !selectedTierId) {
      setMessage("Select a tier to continue.");
      return;
    }
    const qty = Number.isFinite(quantity) ? Math.max(1, Math.floor(Number(quantity))) : 1;
    setBuying(true);
    setMessage("");
    setOrderResponse(null);
    try {
      const payload = await createOrder(apiBaseUrl, {
        eventId: event.id,
        tierId: selectedTierId,
        quantity: qty,
        promoCode: promoCode.trim() || undefined
      });
      setOrderResponse(payload);
      setReceiptNo("");
      setMessage("Order created. Complete payment, then submit your receipt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setBuying(false);
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
    try {
      const formData = new FormData();
      formData.append("receiptNo", receiptNo.trim());
      const response = await fetch(`${apiBaseUrl}/orders/${orderResponse.order.id}/receipt`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("Failed to submit receipt.");
      setMessage("Receipt submitted. Open User Bot: /status then /claim with your order ref.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setSubmittingReceipt(false);
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

  return (
    <main className="pzm-detail">
      <div className="pzm-detail__hero">
        <img src={eventCoverImageUrl(event)} alt={event.name} className="pzm-detail__heroImg" fetchPriority="high" />
        <div className="pzm-detail__heroScrim" />
      </div>

      <div className="pzm-detail__layout">
        <article className="pzm-detail__main">
          <Link to="/" className="pzm-detail__crumb">
            ← All events
          </Link>
          <span className="pzm-detail__badge">{category}</span>
          <h1 className="pzm-detail__title">{event.name}</h1>
          <p className="pzm-detail__meta">
            {formatEventDate(event.startsAt)}
            <span className="pzm-card__dot" />
            {formatEventTimeRange(event.startsAt, event.endsAt)}
            <span className="pzm-card__dot" />
            {event.location ?? "TBA"}
          </p>
          {event.description?.trim() ? (
            <div className="pzm-detail__prose">
              {event.description.split("\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : null}
        </article>

        <aside className="pzm-detail__aside">
          <div className="pzm-ticketCard">
            {soldOut ? (
              <p className="pzm-ticketCard__soldOut">Sold out</p>
            ) : minPrice != null ? (
              <p className="pzm-ticketCard__from">From {minPrice.toLocaleString()} ETB</p>
            ) : null}

            {!soldOut ? (
              <>
                <label className="pzm-field">
                  <span>Ticket tier</span>
                  <select
                    value={selectedTierId}
                    onChange={(e) => {
                      setSelectedTierId(e.target.value);
                      setQuantity(1);
                      setOrderResponse(null);
                    }}
                  >
                    <option value="">Choose tier</option>
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {formatTierPriceLabel(tier)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="pzm-field pzm-qty">
                  <span>Quantity</span>
                  <div className="pzm-qty__controls">
                    <button
                      type="button"
                      className="pzm-qty__step"
                      aria-label="Decrease quantity"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={999}
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setQuantity(Number.isFinite(v) && v >= 1 ? Math.min(999, v) : 1);
                      }}
                    />
                    <button
                      type="button"
                      className="pzm-qty__step"
                      aria-label="Increase quantity"
                      disabled={quantity >= 999}
                      onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
                {estimatedUnit != null && selectedTierId ? (
                  <p className="pzm-muted pzm-ticketCard__estimate">
                    1 ticket before promo: <strong>ETB {estimatedUnit.toLocaleString()}</strong>
                    {promoCode.trim() ? " — total may be lower with promo." : null}
                  </p>
                ) : null}
                <label className="pzm-field">
                  <span>Promo code (optional)</span>
                  <input
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      setOrderResponse(null);
                    }}
                    placeholder="Promo code"
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="pzm-btn pzm-btn--dark pzm-btn--block"
                  onClick={buyTicket}
                  disabled={buying || !selectedTierId}
                >
                  {buying ? "Processing…" : "Get tickets"}
                </button>
              </>
            ) : null}

            {orderResponse ? (
              <div className="pzm-order pzm-order--compact">
                <h3 className="pzm-order__title">Payment</h3>
                <p className="pzm-order__small">
                  <strong>Ref:</strong> {orderResponse.order.orderRef}
                </p>
                <p className="pzm-order__small">
                  Pay <strong>ETB {orderResponse.paymentInstruction.exactAmount}</strong> to{" "}
                  {orderResponse.paymentInstruction.receiverName}
                </p>
                {orderResponse.paymentInstruction.subtotalEtb ? (
                  <p className="pzm-order__small">
                    Subtotal ETB {orderResponse.paymentInstruction.subtotalEtb}
                    {orderResponse.paymentInstruction.promoDiscountEtb
                      ? ` · promo −ETB ${orderResponse.paymentInstruction.promoDiscountEtb}`
                      : ""}
                  </p>
                ) : null}
                <div className="pzm-order__receipt">
                  <label className="pzm-field">
                    <span>Receipt #</span>
                    <input
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      placeholder="Telebirr receipt"
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
                <p className="pzm-order__hint">
                  <a href={userBotLink} target="_blank" rel="noreferrer">
                    Open User Bot
                  </a>
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {message ? <p className="pzm-toast pzm-toast--detail">{message}</p> : null}
    </main>
  );
}
