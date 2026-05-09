import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { requestEvents } from "../lib/api";
import {
  createPromoBatch,
  getStoredOrganizerApiKey,
  listPromoCodes,
  patchPromoCode,
  setStoredOrganizerApiKey
} from "../lib/promoAdminApi";
import type { EventItem, PromoCodeRow } from "../types";

const defaultApiUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function formatDiscount(row: PromoCodeRow): string {
  if (row.discountType === "percent") {
    return `${row.discountValue}% off subtotal`;
  }
  return `ETB ${row.discountValue} off total`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function OrganizerPromosPage() {
  const apiBaseUrl = defaultApiUrl;
  const [apiKey, setApiKey] = useState(() => getStoredOrganizerApiKey());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [promos, setPromos] = useState<PromoCodeRow[]>([]);
  const [filterEventId, setFilterEventId] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [message, setMessage] = useState("");
  const [lastCreated, setLastCreated] = useState<PromoCodeRow[] | null>(null);

  const [promoName, setPromoName] = useState("");
  const [count, setCount] = useState(5);
  const [batchEventId, setBatchEventId] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed_total">("percent");
  const [discountValue, setDiscountValue] = useState(10);
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [batchActive, setBatchActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const eventNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) m.set(e.id, e.name);
    return m;
  }, [events]);

  const refreshPromos = useCallback(async () => {
    const key = apiKey.trim();
    if (!key) {
      setPromos([]);
      return;
    }
    setLoadingPromos(true);
    setMessage("");
    try {
      const rows = await listPromoCodes(apiBaseUrl, key, filterEventId || undefined);
      setPromos(rows);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load promos.");
      setPromos([]);
    } finally {
      setLoadingPromos(false);
    }
  }, [apiBaseUrl, apiKey, filterEventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEvents(true);
      try {
        const list = await requestEvents(apiBaseUrl);
        if (!cancelled) setEvents(list);
      } catch {
        if (!cancelled) setMessage("Could not load events for dropdowns.");
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    void refreshPromos();
  }, [refreshPromos]);

  function saveKey() {
    setStoredOrganizerApiKey(apiKey);
    setMessage("API key saved for this browser session.");
    void refreshPromos();
  }

  function clearKey() {
    setApiKey("");
    setStoredOrganizerApiKey("");
    setPromos([]);
    setMessage("API key cleared.");
  }

  async function onCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setMessage("Enter your organizer API key first.");
      return;
    }
    const name = promoName.trim();
    if (!name) {
      setMessage("Promo campaign name is required.");
      return;
    }
    const n = Math.min(200, Math.max(1, Math.floor(Number(count)) || 1));
    setCreating(true);
    setMessage("");
    setLastCreated(null);
    try {
      const vf = validFrom.trim() ? new Date(validFrom).toISOString() : null;
      const vu = validUntil.trim() ? new Date(validUntil).toISOString() : null;
      const mu = maxUses.trim() ? Math.max(1, parseInt(maxUses, 10)) : null;
      if (maxUses.trim() && !Number.isFinite(mu)) {
        setMessage("Max uses must be a positive integer.");
        return;
      }
      const result = await createPromoBatch(apiBaseUrl, key, {
        promoName: name,
        count: n,
        eventId: batchEventId.trim() || null,
        discountType,
        discountValue,
        maxUses: mu,
        validFrom: vf,
        validUntil: vu,
        active: batchActive
      });
      setLastCreated(result.rows);
      setMessage(`Created ${result.count} code(s). They appear in the table below.`);
      void refreshPromos();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(row: PromoCodeRow) {
    const key = apiKey.trim();
    if (!key) return;
    setMessage("");
    try {
      const updated = await patchPromoCode(apiBaseUrl, key, row.id, { active: !row.active });
      setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Could not copy — select the text manually.");
    }
  }

  const createdCodesText = lastCreated?.length ? lastCreated.map((r) => r.code).join("\n") : "";

  return (
    <main className="pzm-section pzm-organizer">
      <div className="pzm-section__head">
        <div>
          <h1 className="pzm-section__title">Organizer · Promo codes</h1>
          <p className="pzm-section__subtitle">
            Create batches of codes tied to a discount. Shoppers enter a code at checkout on the event page or home.
            Requires the same <code className="pzm-code">SCANNER_API_KEY</code> as your backend (header{" "}
            <code className="pzm-code">x-scanner-api-key</code>).
          </p>
        </div>
        <Link to="/" className="pzm-section__link">
          ← Back to site
        </Link>
      </div>

      <section className="pzm-panel">
        <h2 className="pzm-panel__title">API access</h2>
        <p className="pzm-muted pzm-panel__hint">
          Key is kept in <strong>session storage</strong> only (this browser tab/session). Do not share your screen while
          it is visible.
        </p>
        <div className="pzm-field-row">
          <label className="pzm-field pzm-field--grow">
            <span>Organizer API key</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(ev) => setApiKey(ev.target.value)}
              placeholder="Paste SCANNER_API_KEY"
            />
          </label>
          <div className="pzm-field-actions">
            <button type="button" className="pzm-btn pzm-btn--dark" onClick={saveKey}>
              Save session
            </button>
            <button type="button" className="pzm-btn pzm-btn--outline" onClick={clearKey}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="pzm-panel">
        <h2 className="pzm-panel__title">Create batch</h2>
        <form className="pzm-promo-form" onSubmit={onCreateBatch}>
          <label className="pzm-field">
            <span>Campaign name (label for you)</span>
            <input value={promoName} onChange={(ev) => setPromoName(ev.target.value)} placeholder="e.g. Teddy ML launch" />
          </label>
          <div className="pzm-field-row">
            <label className="pzm-field">
              <span>Number of codes (1–200)</span>
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(ev) => setCount(parseInt(ev.target.value, 10) || 1)}
              />
            </label>
            <label className="pzm-field">
              <span>Restrict to event (optional)</span>
              <select value={batchEventId} onChange={(ev) => setBatchEventId(ev.target.value)} disabled={loadingEvents}>
                <option value="">All events (global code)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="pzm-field-row">
            <label className="pzm-field">
              <span>Discount type</span>
              <select value={discountType} onChange={(ev) => setDiscountType(ev.target.value as "percent" | "fixed_total")}>
                <option value="percent">Percent off subtotal</option>
                <option value="fixed_total">Fixed ETB off subtotal</option>
              </select>
            </label>
            <label className="pzm-field">
              <span>{discountType === "percent" ? "Percent (1–100)" : "Amount (ETB)"}</span>
              <input
                type="number"
                min={0.01}
                step={discountType === "percent" ? 1 : 0.01}
                max={discountType === "percent" ? 100 : undefined}
                value={discountValue}
                onChange={(ev) => setDiscountValue(parseFloat(ev.target.value) || 0)}
              />
            </label>
          </div>
          <div className="pzm-field-row">
            <label className="pzm-field">
              <span>Max uses per code (optional)</span>
              <input
                value={maxUses}
                onChange={(ev) => setMaxUses(ev.target.value)}
                placeholder="Unlimited if empty"
                inputMode="numeric"
              />
            </label>
            <label className="pzm-field">
              <span>Valid from (optional)</span>
              <input type="datetime-local" value={validFrom} onChange={(ev) => setValidFrom(ev.target.value)} />
            </label>
            <label className="pzm-field">
              <span>Valid until (optional)</span>
              <input type="datetime-local" value={validUntil} onChange={(ev) => setValidUntil(ev.target.value)} />
            </label>
          </div>
          <label className="pzm-field pzm-field--checkbox">
            <input type="checkbox" checked={batchActive} onChange={(ev) => setBatchActive(ev.target.checked)} />
            <span>Active immediately</span>
          </label>
          <button type="submit" className="pzm-btn pzm-btn--dark" disabled={creating}>
            {creating ? "Creating…" : "Generate codes"}
          </button>
        </form>

        {createdCodesText ? (
          <div className="pzm-created-codes">
            <div className="pzm-created-codes__head">
              <span>New codes</span>
              <button type="button" className="pzm-btn pzm-btn--outline pzm-btn--sm" onClick={() => copyText(createdCodesText)}>
                Copy all
              </button>
            </div>
            <textarea readOnly className="pzm-created-codes__textarea" rows={Math.min(12, lastCreated!.length)} value={createdCodesText} />
          </div>
        ) : null}
      </section>

      <section className="pzm-panel">
        <div className="pzm-panel__head-row">
          <h2 className="pzm-panel__title">Existing codes</h2>
          <div className="pzm-field-row pzm-field-row--narrow">
            <label className="pzm-field">
              <span>Filter by event</span>
              <select value={filterEventId} onChange={(ev) => setFilterEventId(ev.target.value)} disabled={loadingEvents}>
                <option value="">All promos</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} (+ global)
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pzm-btn pzm-btn--outline" onClick={() => void refreshPromos()} disabled={loadingPromos || !apiKey.trim()}>
              {loadingPromos ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {!apiKey.trim() ? (
          <p className="pzm-muted">Save an API key above to load promos.</p>
        ) : loadingPromos && promos.length === 0 ? (
          <p className="pzm-muted">Loading…</p>
        ) : promos.length === 0 ? (
          <p className="pzm-muted">No promo codes yet (or none match this filter).</p>
        ) : (
          <div className="pzm-table-wrap">
            <table className="pzm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Campaign</th>
                  <th>Discount</th>
                  <th>Event</th>
                  <th>Uses</th>
                  <th>Valid</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promos.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code className="pzm-code">{row.code}</code>
                    </td>
                    <td>{row.name || "—"}</td>
                    <td>{formatDiscount(row)}</td>
                    <td>{row.eventId ? eventNameById.get(row.eventId) ?? row.eventId.slice(0, 8) : "Global"}</td>
                    <td>
                      {row.usesCount}
                      {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                    </td>
                    <td className="pzm-table__dates">
                      {shortDate(row.validFrom)} → {shortDate(row.validUntil)}
                    </td>
                    <td>{row.active ? "Yes" : "No"}</td>
                    <td className="pzm-table__actions">
                      <button type="button" className="pzm-btn pzm-btn--outline pzm-btn--sm" onClick={() => copyText(row.code)}>
                        Copy
                      </button>
                      <button type="button" className="pzm-btn pzm-btn--outline pzm-btn--sm" onClick={() => void toggleActive(row)}>
                        {row.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {message ? <p className="pzm-toast">{message}</p> : null}
    </main>
  );
}
