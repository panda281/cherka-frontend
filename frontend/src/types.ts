export type EventTier = {
  id: string;
  tierCode: string;
  tierName: string;
  /** Door / regular price (after early bird window). */
  price: string;
  /** Optional early-bird unit price while `earlyBirdEndsAt` is in the future. */
  earlyBirdPrice?: string | null;
  earlyBirdEndsAt?: string | null;
  active: boolean;
};

export type EventItem = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string | null;
  category?: string | null;
  eventImageUrl?: string | null;
  status: string;
  tiers: EventTier[];
};

export type OrderResponse = {
  order: { id: string; orderRef: string; expectedAmount: string };
  paymentInstruction: {
    receiverNumber: string;
    receiverName: string;
    exactAmount: string;
    note: string;
    unitPrice?: string;
    quantity?: number;
    subtotalEtb?: string;
    promoDiscountEtb?: string;
  };
};

export const CATEGORIES = [
  "All",
  "Music",
  "Festivals",
  "Arts",
  "Exhibitions",
  "Sports",
  "Tech"
] as const;

/** Row from `GET /admin/promo-codes` (organizer tool). */
export type PromoCodeRow = {
  id: string;
  name: string;
  code: string;
  eventId: string | null;
  discountType: "percent" | "fixed_total";
  discountValue: string;
  maxUses: number | null;
  usesCount: number;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePromoBatchResponse = {
  rows: PromoCodeRow[];
  count: number;
};
