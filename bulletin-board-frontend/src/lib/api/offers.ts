import type { Offer, OfferActionResponse } from "@/lib/types";
import { api } from "./client";

export async function createOffer(
  threadId: string,
  amount: string,
  note?: string,
): Promise<Offer> {
  return api.post<Offer>(`/api/v1/offers/threads/${threadId}`, {
    amount,
    note: note ?? "",
  });
}

export async function acceptOffer(
  offerId: string,
): Promise<OfferActionResponse> {
  return api.patch<OfferActionResponse>(`/api/v1/offers/${offerId}/accept`);
}

export async function declineOffer(
  offerId: string,
): Promise<OfferActionResponse> {
  return api.patch<OfferActionResponse>(`/api/v1/offers/${offerId}/decline`);
}

export async function counterOffer(
  offerId: string,
  amount: string,
  note?: string,
): Promise<Offer> {
  return api.post<Offer>(`/api/v1/offers/${offerId}/counter`, {
    amount,
    note: note ?? "",
  });
}

export async function getThreadOffers(
  threadId: string,
): Promise<Offer[]> {
  return api.get<Offer[]>(`/api/v1/offers/threads/${threadId}`);
}
