import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { eventRoutePath } from "../lib/eventRoutes";
import type { EventItem } from "../types";
import { formatEventDate, eventCategory, eventCoverImageUrl, isSoldOut, minPriceEtb } from "../lib/eventUtils";

type Props = {
  event: EventItem;
  featured?: boolean;
  delayMs?: number;
};

export function EventCard({ event, featured, delayMs = 0 }: Props) {
  const eventPath = eventRoutePath(event);
  const cardRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const soldOut = isSoldOut(event);
  const minPrice = minPriceEtb(event);
  const category = eventCategory(event);
  const locationLabel = event.location?.trim() || "TBA";

  return (
    <article
      ref={cardRef}
      className={`pzm-card ${featured ? "pzm-card--featured" : ""} ${isVisible ? "pzm-card--visible" : ""}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <Link to={eventPath} className="pzm-card__mediaLink">
        <div className="pzm-card__media">
          <img src={eventCoverImageUrl(event)} alt={event.name} className="pzm-card__img" loading="lazy" />
          <span className="pzm-card__badge">{category}</span>
          {event.featured ? <span className="pzm-card__featuredTag">Featured</span> : null}
          {soldOut ? (
            <span className={`pzm-card__soldOut ${event.featured ? "pzm-card__soldOut--featured" : ""}`}>
              Sold Out
            </span>
          ) : null}
        </div>
      </Link>
      <div className="pzm-card__body">
        <Link to={eventPath} className="pzm-card__titleLink">
          <h3 className="pzm-card__title">{event.name}</h3>
        </Link>
        <p className="pzm-card__meta">
          {formatEventDate(event.startsAt)}
          <span className="pzm-card__dot" />
          {locationLabel}
        </p>
        <div className="pzm-card__row">
          {minPrice != null ? (
            <span className="pzm-card__price">From {minPrice.toLocaleString()} ETB</span>
          ) : (
            <span className="pzm-card__price pzm-card__price--muted">—</span>
          )}
          {soldOut ? (
            <span className="pzm-btn pzm-btn--ghost pzm-btn--sm" aria-disabled="true">
              Sold Out
            </span>
          ) : (
            <Link to={eventPath} className="pzm-btn pzm-btn--dark pzm-btn--sm">
              Get Tickets
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
