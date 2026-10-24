// Checkout: bag, pickup, payment, one Pay button (docs/spec.md, screen 4). No bottom nav on this route.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  buttonClasses,
  EmptyState,
  PageHeader,
  Price,
  QtyStepper,
  toast,
} from "@/components/ui";
import { MENU } from "@/demo/data";
import { useBasket } from "@/hooks/useBasket";
import { useCarts } from "@/hooks/useCarts";
import { useSession } from "@/hooks/useSession";
import { quoteOrder, toApiError, type ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  getGuest,
  isValidPhone,
  rememberOrderToken,
  saveGuest,
} from "@/lib/guest";
import { formatCents } from "@/lib/money";
import { getPaymentProviders } from "@/lib/payments";
import { formatWindow } from "@/lib/time";
import type { Quote } from "@/types/app";
import { errorCopy } from "@/features/order/errors";
import { useHoldLeft } from "@/features/order/hooks";
import { formatCountdown } from "@/features/order/pickup";
import { bagTotal } from "@/features/order/OrderParts";
import { useDemoState } from "@/hooks/useDemo";

const PROVIDERS = getPaymentProviders();
const field =
  "mt-1 block min-h-12 w-full rounded-inner bg-raised px-4 text-base outline-none focus-visible:outline-3 focus-visible:outline-focus aria-invalid:bg-danger-bg";

function ErrorLine({ err }: { err: ApiError }) {
  const copy = errorCopy(err);
  return (
    <p
      role="alert"
      className="rounded-card bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger-ink"
    >
      {copy.text}
      {copy.fix && (
        <>
          {" "}
          <Link to={copy.fix.to} className="underline underline-offset-2">
            {copy.fix.label}
          </Link>
        </>
      )}
    </p>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const basket = useBasket();
  const { profile } = useSession();
  const { data: carts } = useCarts();
  const windows = useDemoState().windows;
  const leftMs = useHoldLeft();
  const ids = {
    name: useId(),
    phone: useId(),
    nameErr: useId(),
    phoneErr: useId(),
  };

  const saved = useMemo(() => getGuest(), []);
  const [asGuest, setAsGuest] = useState(false);
  const [guest, setGuest] = useState({
    name: saved?.name ?? "",
    phone: saved?.phone ?? "",
  });
  const [touched, setTouched] = useState(false);
  const [method, setMethod] = useState(PROVIDERS[0]?.id);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [paying, setPaying] = useState(false);
  const placed = useRef(false);

  const cart = carts?.find((c) => c.id === basket.cartId);
  const pickupWindow = windows.find((w) => w.id === basket.hold?.windowId);

  useEffect(() => {
    if (basket.lines.length === 0) return;
    let live = true;
    quoteOrder(basket.lines, { asGuest }).then(
      (q) => live && setQuote(q),
      (e) => live && setError(toApiError(e)),
    );
    return () => {
      live = false;
    };
  }, [basket.lines, asGuest]);

  // No hold, or it ran out: back to the time picker.
  useEffect(() => {
    if (placed.current || paying || basket.lines.length === 0) return;
    if (!basket.hold || leftMs === 0) {
      if (basket.hold) toast("Your held spot ran out. Pick a time again.");
      basket.setHold(null);
      navigate("/order/time", { replace: true });
    }
  }, [basket, leftMs, navigate, paying]);

  if (basket.lines.length === 0) {
    return (
      <>
        <PageHeader title="Checkout" back="/order" />
        <EmptyState
          title="Your bag is empty"
          action={
            <Link to="/order" className={buttonClasses("primary")}>
              See the menu
            </Link>
          }
        />
      </>
    );
  }

  const nameBad = asGuest && !guest.name.trim();
  const phoneBad = asGuest && !isValidPhone(guest.phone);
  const total = quote?.totalCents ?? bagTotal(basket.lines);

  const pay = async () => {
    setTouched(true);
    setError(null);
    const provider = PROVIDERS.find((p) => p.id === method);
    if (nameBad || phoneBad || !provider || !basket.holdId) return;
    setPaying(true);
    const g = asGuest
      ? { name: guest.name.trim(), phone: guest.phone }
      : undefined;
    const result = await provider.pay({
      holdId: basket.holdId,
      lines: basket.lines,
      guest: g,
      totalCents: total,
    });
    if (!result.ok) {
      setPaying(false);
      setError(result.error);
      return;
    }
    placed.current = true;
    if (g) saveGuest(g);
    rememberOrderToken(result.order.accessToken);
    navigate(`/orders/${result.order.accessToken}`, { replace: true });
    basket.clear();
  };

  return (
    <>
      <PageHeader title="Checkout" back="/order/time" />

      <section
        aria-labelledby="bag-title"
        className="rounded-card bg-surface p-5"
      >
        <h2 id="bag-title" className="text-base font-semibold">
          Your bag
        </h2>
        <ul className="mt-2">
          {basket.lines.map((l) => {
            const item = MENU.find((m) => m.id === l.menuItemId);
            const name = item?.name ?? "Dish";
            return (
              <li
                key={`${l.menuItemId}-${l.variant ?? ""}`}
                className="flex items-center gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{name}</p>
                  <p className="num text-[13px] text-muted">
                    {l.variant ? `${l.variant} · ` : ""}
                    {formatCents((item?.price_cents ?? 0) * l.qty)}
                  </p>
                </div>
                <QtyStepper
                  value={l.qty}
                  label={l.variant ? `${name}, ${l.variant}` : name}
                  onChange={(q) => basket.setQty(l.menuItemId, q, l.variant)}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {cart && pickupWindow && leftMs != null && (
        <section
          aria-labelledby="pickup-title"
          className={cn(
            "mt-3 flex items-center justify-between gap-4 rounded-card p-5",
            leftMs <= 60_000 ? "bg-warning-bg text-warning-ink" : "bg-surface",
          )}
        >
          <div>
            <h2
              id="pickup-title"
              className="text-[13px] font-semibold opacity-80"
            >
              Pickup
            </h2>
            <p className="num text-base font-semibold">
              {formatWindow(pickupWindow.starts_at, pickupWindow.ends_at)}
            </p>
            <p className="text-[13px]">
              {cart.name} · {cart.spot?.name}
            </p>
          </div>
          <p className="text-right">
            <span className="num block text-xl font-bold" role="timer">
              {formatCountdown(leftMs)}
            </span>
            <span className="text-[13px] whitespace-nowrap opacity-80">
              spot held
            </span>
          </p>
        </section>
      )}

      <section
        aria-labelledby="who-title"
        className="mt-3 rounded-card bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="who-title" className="text-base font-semibold">
              {asGuest
                ? "Ordering as a guest"
                : `Ordering as ${profile.display_name}`}
            </h2>
            <p className="text-[13px] text-muted">
              {asGuest
                ? "No punches or rewards on guest orders."
                : "Punches go on your card."}
            </p>
          </div>
          <span className="flex flex-none items-center gap-2">
            <span aria-hidden className="text-[13px] font-semibold text-muted">
              Guest
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={asGuest}
              aria-label="Order as guest"
              onClick={() => setAsGuest((v) => !v)}
              className={cn(
                "relative h-8 w-14 flex-none rounded-full transition-colors",
                asGuest ? "bg-primary" : "bg-raised",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1 left-1 size-6 rounded-full bg-surface transition-transform duration-200",
                  asGuest && "translate-x-6",
                )}
              />
            </button>
          </span>
        </div>
        {asGuest && (
          <div className="mt-4 space-y-3">
            <label
              htmlFor={ids.name}
              className="block text-[13px] font-semibold text-muted"
            >
              Name
              <input
                id={ids.name}
                className={field}
                autoComplete="name"
                value={guest.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                aria-invalid={touched && nameBad}
                aria-describedby={touched && nameBad ? ids.nameErr : undefined}
              />
            </label>
            {touched && nameBad && (
              <p
                id={ids.nameErr}
                className="text-[13px] font-semibold text-danger-ink"
              >
                Add the name we&rsquo;ll call out.
              </p>
            )}
            <label
              htmlFor={ids.phone}
              className="block text-[13px] font-semibold text-muted"
            >
              Phone
              <input
                id={ids.phone}
                className={cn(field, "num")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={guest.phone}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                aria-invalid={touched && phoneBad}
                aria-describedby={
                  touched && phoneBad ? ids.phoneErr : undefined
                }
              />
            </label>
            {touched && phoneBad && (
              <p
                id={ids.phoneErr}
                className="text-[13px] font-semibold text-danger-ink"
              >
                Enter a 10-digit phone number.
              </p>
            )}
          </div>
        )}
      </section>

      <fieldset className="mt-3 rounded-card bg-surface p-5">
        <legend className="float-left mb-3 text-base font-semibold">
          Pay with
        </legend>
        <div className="clear-left grid gap-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className="flex min-h-12 cursor-pointer items-center justify-between rounded-inner bg-raised px-4 text-[15px] font-semibold has-checked:bg-ink has-checked:text-surface has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              {p.label}
              <input
                type="radio"
                name="payment"
                className="sr-only"
                checked={method === p.id}
                onChange={() => setMethod(p.id)}
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Demo payment, no card charged.
        </p>
      </fieldset>

      <section
        aria-labelledby="total-title"
        className="mt-3 rounded-card bg-surface p-5"
      >
        <h2 id="total-title" className="sr-only">
          Total
        </h2>
        <dl className="space-y-1 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Food</dt>
            <dd className="num">
              {formatCents(quote?.subtotalCents ?? bagTotal(basket.lines))}
            </dd>
          </div>
          {quote?.loyaltyApplied && (
            <div className="flex justify-between font-semibold text-positive-ink">
              <dt>Free meal applied</dt>
              <dd className="num">−{formatCents(quote.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd>
              <Price cents={total} className="font-bold" />
            </dd>
          </div>
        </dl>
        <p className="mt-1 text-[13px] text-muted">
          No fees, no tip screen. That&rsquo;s the price.
        </p>
      </section>

      {error && (
        <div className="mt-3" aria-live="assertive">
          <ErrorLine err={error} />
        </div>
      )}

      <div aria-hidden className="h-24" />
      <div className="glass-bar fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-[480px] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button size="lg" loading={paying} disabled={!quote} onClick={pay}>
            {paying ? "Paying…" : `Pay ${formatCents(total)}`}
          </Button>
        </div>
      </div>
    </>
  );
}
