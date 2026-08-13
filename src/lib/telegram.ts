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

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildMessage(order),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[telegram] sendMessage failed for order ${order.orderNumber}: ${response.status} ${body.slice(0, 300)}`,
      );
    }
  } catch (error) {
    console.error(`[telegram] sendMessage threw for order ${order.orderNumber}`, error);
  }
}
