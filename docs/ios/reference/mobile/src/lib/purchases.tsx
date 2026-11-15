import { useQueryClient } from '@tanstack/react-query';
import {
  createPurchaseFlow,
  deepLinkToSubscriptions,
  describePurchaseFlowStatus,
  isUserCancelledError,
  toPurchaseConfirmationRequest,
  useIAP,
  type ProductSubscription,
  type PurchaseConfirmation,
  type PurchaseFlowGuidanceKey,
} from 'expo-iap';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth';
import { keys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

/*
  App Store subscriptions (StoreKit 2 through expo-iap).

  The rule that keeps this honest: the app never decides that someone is Pro.
  After StoreKit reports a purchase, the signed transaction goes to our
  `iap-confirm` Edge Function, which asks Apple what it really is and records
  it. Only when the server answers `entitled` is the transaction finished;
  until then StoreKit keeps redelivering it, so a crash or a dead connection
  mid-purchase cannot lose a payment. What the UI shows as "Pro" is always
  read back from Postgres (useEntitlement), never from the device.
*/

/** Must match App Store Connect and the IAP_PRODUCT_IDS function secret. */
export const PRODUCT_IDS = {
  monthly: 'com.bbiom.app.pro.monthly',
  yearly: 'com.bbiom.app.pro.yearly',
} as const;

const SKUS: string[] = Object.values(PRODUCT_IDS);

type PurchasesState = {
  /** Store connection is up and products have been requested. */
  ready: boolean;
  products: ProductSubscription[];
  /** A purchase or restore is in flight. */
  busy: boolean;
  /** Outcome of the last purchase/restore, as a key the UI maps to copy. */
  notice: PurchaseFlowGuidanceKey | 'store_unavailable' | 'nothing_to_restore' | null;
  buy: (sku: string) => Promise<void>;
  restore: () => Promise<void>;
  manage: () => Promise<void>;
  clearNotice: () => void;
};

const PurchasesContext = createContext<PurchasesState | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<PurchasesState['notice']>(null);

  // One flow per signed-in account; disposed when the account changes.
  const flow = useMemo(() => {
    if (!userId) return undefined;
    return createPurchaseFlow({
      isConsumable: () => false,
      confirmWithBackend: async (purchase): Promise<PurchaseConfirmation> => {
        const { data, error } = await supabase.functions.invoke('iap-confirm', {
          body: toPurchaseConfirmationRequest(purchase),
        });
        // Network or server trouble is never a rejection: leave the
        // transaction unfinished and try again later.
        if (error || !data?.status) return { status: 'verification_delayed', retryAfterMs: 30_000 };
        return data as PurchaseConfirmation;
      },
    });
  }, [userId]);

  useEffect(() => () => flow?.dispose(), [flow]);

  const iap = useIAP({
    purchaseFlow: flow,
    onPurchaseFlowOutcome: (outcome) => {
      setBusy(false);
      setNotice(describePurchaseFlowStatus(outcome.status).key);
      client.invalidateQueries({ queryKey: keys.entitlement });
    },
    onPurchaseError: (error) => {
      setBusy(false);
      if (!isUserCancelledError(error)) setNotice('try_again_later');
    },
  });

  const { connected, fetchProducts } = iap;
  useEffect(() => {
    if (connected) fetchProducts({ skus: SKUS, type: 'subs' });
  }, [connected, fetchProducts]);

  const value: PurchasesState = {
    ready: connected,
    // Yearly first: it is the better price and the one we lead with.
    products: [...iap.subscriptions].sort((a, b) => SKUS.indexOf(b.id) - SKUS.indexOf(a.id)),
    busy,
    notice,
    clearNotice: () => setNotice(null),

    async buy(sku) {
      if (!userId || !connected) {
        setNotice('store_unavailable');
        return;
      }
      setBusy(true);
      setNotice(null);
      try {
        await iap.requestPurchase({
          // appAccountToken ties the transaction to this bbiom account, so
          // the server can refuse to grant it to anyone else.
          request: { apple: { sku, appAccountToken: userId } },
          type: 'subs',
        });
        // The result arrives through onPurchaseFlowOutcome / onPurchaseError.
      } catch (error) {
        setBusy(false);
        if (!isUserCancelledError(error as never)) setNotice('try_again_later');
      }
    },

    async restore() {
      if (!flow) return;
      setBusy(true);
      setNotice(null);
      try {
        const outcomes = await flow.recoverPurchases({ includeFinished: true });
        const best = outcomes.find((o) => o.status.status === 'entitled') ?? outcomes[0];
        setNotice(best ? describePurchaseFlowStatus(best.status).key : 'nothing_to_restore');
        client.invalidateQueries({ queryKey: keys.entitlement });
      } catch {
        setNotice('try_again_later');
      } finally {
        setBusy(false);
      }
    },

    async manage() {
      await deepLinkToSubscriptions({});
    },
  };

  return <PurchasesContext value={value}>{children}</PurchasesContext>;
}

export function usePurchases(): PurchasesState {
  const ctx = use(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used inside <PurchasesProvider>');
  return ctx;
}

/** Plain-language copy for each outcome. Never tells someone who may have paid to buy again. */
export const NOTICE_COPY: Record<NonNullable<PurchasesState['notice']>, string> = {
  access_granted: 'You are on Pro. Thank you.',
  access_pending: 'Your purchase went through. Pro will switch on in a moment.',
  payment_pending: 'Your payment is waiting for approval. Pro switches on as soon as it clears.',
  change_pending: 'Your plan change takes effect at the next renewal.',
  verification_delayed: 'We could not confirm the purchase yet. You have not lost it: we will keep trying.',
  owned_by_another_account:
    'This Apple subscription already belongs to a different bbiom account. Sign in to that account to use it.',
  test_purchase_not_accepted: 'Test purchases are not accepted here.',
  purchase_not_valid: 'The App Store could not confirm this purchase.',
  try_again_later: 'Something went wrong on the way to the App Store. Please try again.',
  store_unavailable: 'The App Store is not reachable right now. Please try again in a moment.',
  nothing_to_restore: 'No earlier purchase was found for this Apple Account.',
};
