import { multiplyQuantityByUnitPrice } from "@/lib/money";
import type { CurrencyCode } from "@/config/currencies";
import type { ValuationType } from "@/config/categories";
import { isMarketDataError, type MarketDataError, type Quote } from "@/services/market-data/types";
import type { MarketDataService } from "@/services/market-data/market-data-service";

export interface ValuationInput {
  valuationType: ValuationType;
  currency: CurrencyCode;
  manualValueCents: number | null;
  quantity: string | null;
  ticker: string | null;
}

export type ValuationResult =
  | {
      status: "MANUAL";
      currentValueCents: number;
      unitPriceCents: null;
      valuedAt: Date | null;
      quote: null;
    }
  | {
      status: "MARKET";
      currentValueCents: number;
      unitPriceCents: number;
      valuedAt: Date;
      quote: Quote;
    }
  | {
      status: "UNAVAILABLE";
      reason: MarketDataError["code"] | "MISSING_INPUT" | "CURRENCY_MISMATCH";
      fallbackValueCents: number | null;
    };

/**
 * ValuationService: decides an asset's current value. MANUAL uses the user's
 * figure; MARKET multiplies quantity by a quote in the asset's currency and
 * reports UNAVAILABLE (never a guess) when the quote cannot be trusted.
 */
export async function valueAsset(
  input: ValuationInput,
  market: MarketDataService,
): Promise<ValuationResult> {
  if (input.valuationType === "MANUAL") {
    return {
      status: "MANUAL",
      currentValueCents: input.manualValueCents ?? 0,
      unitPriceCents: null,
      valuedAt: null,
      quote: null,
    };
  }
  if (!input.ticker || !input.quantity)
    return {
      status: "UNAVAILABLE",
      reason: "MISSING_INPUT",
      fallbackValueCents: input.manualValueCents,
    };
  const quote = await market.getQuote(input.ticker);
  if (isMarketDataError(quote))
    return {
      status: "UNAVAILABLE",
      reason: quote.code,
      fallbackValueCents: input.manualValueCents,
    };
  if (quote.currency !== input.currency)
    return {
      status: "UNAVAILABLE",
      reason: "CURRENCY_MISMATCH",
      fallbackValueCents: input.manualValueCents,
    };
  const value = multiplyQuantityByUnitPrice(input.quantity, quote.priceCents);
  if (value == null)
    return {
      status: "UNAVAILABLE",
      reason: "MISSING_INPUT",
      fallbackValueCents: input.manualValueCents,
    };
  return {
    status: "MARKET",
    currentValueCents: value,
    unitPriceCents: quote.priceCents,
    valuedAt: quote.timestamp,
    quote,
  };
}
