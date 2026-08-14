import "server-only";

import type { Locale } from "@/types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const LOCALE_LABEL: Record<Locale, string> = {
  sq: "Albanian",
  en: "English",
};

export interface NewOrderNotification {
  orderId: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  itemCount: number;
  totalFormatted: string;
  locale: Locale;
  adminUrl: string;
  /**
   * The snapshotted image_url of the order's single line item — only ever
   * set by the caller when the order has exactly one distinct product line
   * (see src/lib/actions/checkout.ts). A multi-item order has no single
   * photo that represents it, so this stays text-only rather than sending
   * several images at once.
   */
  singleItemPhotoUrl?: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Telegram's HTML parse mode, not MarkdownV2 — MarkdownV2 requires escaping
// a long list of characters (., -, !, (, ) among them) that show up
// constantly in names/addresses/prices, making it easy to accidentally
// break message delivery. HTML only needs &, <, > escaped.
//
// Short lines, phone as a tappable tel: link near the top — this is read as
// a phone push notification, not a document.
function buildMessage(order: NewOrderNotification): string {
  const name = escapeHtml(`${order.firstName} ${order.lastName}`.trim());
  const phoneDisplay = escapeHtml(order.phone);
  // tel: hrefs don't need HTML-escaping the way visible text does, but the
  // phone number can still contain characters like & from a pasted/loosely
  // validated input (see validation/checkout.ts's plausibility check) — so
  // this still goes through the same escaper for the attribute value.
  const phoneHref = escapeHtml(order.phone);
  const city = escapeHtml(order.city);
  const country = escapeHtml(order.country);
  const itemLabel = order.itemCount === 1 ? "item" : "items";

  return [
    `🛎 <b>New order ${escapeHtml(order.orderNumber)}</b>`,
    ``,
    `<b>${name}</b>`,
    `📞 <a href="tel:${phoneHref}">${phoneDisplay}</a>`,
    `📍 ${city}, ${country}`,
    `🗣 ${LOCALE_LABEL[order.locale]}`,
    ``,
    `${order.itemCount} ${itemLabel} · <b>${escapeHtml(order.totalFormatted)}</b>`,
    ``,
    `<a href="${escapeHtml(order.adminUrl)}">Open in admin →</a>`,
  ].join("\n");
}

/**
 * Fire-and-forget by design — call this from checkout via `after()`
 * (src/lib/actions/checkout.ts), never `await` it on the customer-facing
 * path. A Telegram outage must never cost a sale: every failure mode here
 * is caught and logged, nothing ever throws out of this function.
 */
export async function sendNewOrderTelegramNotification(
  order: NewOrderNotification,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // Local dev shouldn't need a Telegram bot configured just to check out
    // — silent skip there. In production, either var missing means every
    // order notification silently vanishes from here on, which is a real
    // misconfiguration worth logging loudly (not just a "fine for now" gap
    // the way it is locally).
    if (process.env.VERCEL_ENV === "production") {
      console.error(
        "[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set — new-order notifications are disabled.",
      );
    }
    return;
  }

  async function post(endpoint: "sendPhoto" | "sendMessage", body: Record<string, unknown>) {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error(
        `[telegram] ${endpoint} failed for order ${order.orderNumber}: ${response.status} ${responseBody.slice(0, 300)}`,
      );
    }
    return response.ok;
  }

  // sendPhoto's caption has a 1024-char limit (vs. sendMessage's 4096) —
  // buildMessage's output is a handful of short lines, well within it.
  const textBody = {
    chat_id: chatId,
    text: buildMessage(order),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  try {
    if (order.singleItemPhotoUrl) {
      const photoSent = await post("sendPhoto", {
        chat_id: chatId,
        photo: order.singleItemPhotoUrl,
        caption: buildMessage(order),
        parse_mode: "HTML",
      });
      // A bad/unreachable snapshot URL must not cost the whole notification
      // — fall back to the plain text version rather than sending nothing.
      if (!photoSent) {
        await post("sendMessage", textBody);
      }
      return;
    }

    await post("sendMessage", textBody);
  } catch (error) {
    console.error(`[telegram] notification threw for order ${order.orderNumber}`, error);
  }
}
