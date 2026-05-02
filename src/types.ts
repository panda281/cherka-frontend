export type EventTier = {
  id: string;
  tierCode: string;
  tierName: string;
  price: string;
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
  };
  /** From POST /orders — optional early deep link with ?start=orderRef */
  telegramOpenBotUrl?: string | null;
  telegramNextStepHint?: string | null;
};

/** Body from POST /orders/:orderId/receipt (201) */
export type ReceiptSubmitResponse = {
  telegramOpenBotUrl?: string | null;
  telegramNextStepHint?: string | null;
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
