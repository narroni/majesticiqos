import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export interface CartItemSnapshot {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Effective price at the moment this was added — the cart page compares
   * this against live data and flags a diff rather than overwriting it. */
  priceCents: number;
}

export interface CartItem extends CartItemSnapshot {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  hasHydrated: boolean;
  addItem: (snapshot: CartItemSnapshot, quantity: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setHasHydrated: (value: boolean) => void;
}

/**
 * A memory-backed fallback that never throws. Instagram's in-app browser and
 * Safari private mode both let `localStorage` exist but throw on read/write
 * (quota errors, blocked storage) — every operation here is wrapped so the
 * cart keeps working for the session even when persistence silently fails.
 */
const memoryFallback = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name) ?? memoryFallback.get(name) ?? null;
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memoryFallback.set(name, value);
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Persistence failed — the in-memory copy above keeps the cart usable
      // for the rest of this session.
    }
  },
  removeItem: (name) => {
    memoryFallback.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Nothing to do — there was never anything durable to remove.
    }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      hasHydrated: false,

      addItem: (snapshot, quantity) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.productId === snapshot.productId,
          );

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === snapshot.productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }

          return { items: [...state.items, { ...snapshot, quantity }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.productId !== productId)
              : state.items.map((item) =>
                  item.productId === productId ? { ...item, quantity } : item,
                ),
        })),

      clear: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "cart:v1",
      storage: createJSONStorage(() => safeStorage),
      // Hydration is triggered manually (see CartHydration) so the very
      // first client render matches the server's empty-cart render exactly,
      // instead of flashing persisted content and mismatching.
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
