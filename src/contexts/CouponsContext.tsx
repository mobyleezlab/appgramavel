import React, { createContext, useContext, useReducer, useMemo, useEffect } from "react";
import { getUserCoupons, saveCoupon, unsaveCoupon, useCouponService } from "@/services/coupons";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type State = { savedCoupons: string[]; usedCoupons: string[]; loaded: boolean };

type Action =
  | { type: "INIT"; savedCoupons: string[]; usedCoupons: string[] }
  | { type: "TOGGLE_COUPON"; id: string }
  | { type: "USE_COUPON"; id: string }
  | { type: "UNDO_USE_COUPON"; id: string };

function couponsReducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { savedCoupons: action.savedCoupons, usedCoupons: action.usedCoupons, loaded: true };
    case "TOGGLE_COUPON": {
      const isUsed = state.usedCoupons.includes(action.id);
      const isSaved = state.savedCoupons.includes(action.id);
      if (isUsed) return state;
      return {
        ...state,
        savedCoupons: isSaved
          ? state.savedCoupons.filter((i) => i !== action.id)
          : [...state.savedCoupons, action.id],
      };
    }
    case "USE_COUPON": {
      const isUsed = state.usedCoupons.includes(action.id);
      const isSaved = state.savedCoupons.includes(action.id);
      if (isUsed || !isSaved) return state;
      return {
        ...state,
        usedCoupons: [...state.usedCoupons, action.id],
      };
    }
    case "UNDO_USE_COUPON":
      return { ...state, usedCoupons: state.usedCoupons.filter((i) => i !== action.id) };
    default:
      return state;
  }
}

interface CouponsContextType {
  savedCoupons: string[];
  usedCoupons: string[];
  toggleCoupon: (id: string) => void;
  useCoupon: (id: string) => void;
  isCouponSaved: (id: string) => boolean;
  isCouponUsed: (id: string) => boolean;
  loaded: boolean;
}

const CouponsContext = createContext<CouponsContextType | null>(null);

export function CouponsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(couponsReducer, {
    savedCoupons: [],
    usedCoupons: [],
    loaded: false,
  });

  const savedSet = useMemo(() => new Set(state.savedCoupons), [state.savedCoupons]);
  const usedSet = useMemo(() => new Set(state.usedCoupons), [state.usedCoupons]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        dispatch({ type: "INIT", savedCoupons: [], usedCoupons: [] });
        return;
      }
      const { data } = await getUserCoupons(user.id);
      if (cancelled) return;
      const saved: string[] = [];
      const used: string[] = [];
      data?.forEach((uc) => {
        if (uc.status === "used") used.push(uc.coupon_id);
        else saved.push(uc.coupon_id);
      });
      dispatch({ type: "INIT", savedCoupons: saved, usedCoupons: used });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const value = useMemo(() => ({
    savedCoupons: state.savedCoupons,
    usedCoupons: state.usedCoupons,
    loaded: state.loaded,
    toggleCoupon: async (id: string) => {
      const wasSaved = savedSet.has(id);
      dispatch({ type: "TOGGLE_COUPON", id });
      const result = wasSaved ? await unsaveCoupon(id) : await saveCoupon(id);
      if (result.error) {
        dispatch({ type: "TOGGLE_COUPON", id }); // revert
        toast.error("Não foi possível salvar o cupom. Tente novamente.");
      }
    },
    useCoupon: async (id: string) => {
      dispatch({ type: "USE_COUPON", id });
      const result = await useCouponService(id);
      if (result.error) {
        dispatch({ type: "UNDO_USE_COUPON", id }); // revert
        const err = result.error as { code?: string; message?: string };
        if (err.code === "P0001" && err.message) toast.warning(err.message);
        else toast.error("Não foi possível usar o cupom. Tente novamente.");
        return;
      }
      toast.success("Cupom utilizado!");
    },
    isCouponSaved: (id: string) => savedSet.has(id),
    isCouponUsed: (id: string) => usedSet.has(id),
  }), [state, savedSet, usedSet]);

  return (
    <CouponsContext.Provider value={value}>
      {children}
    </CouponsContext.Provider>
  );
}

export function useCoupons() {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error("useCoupons must be used within CouponsProvider");
  return ctx;
}
