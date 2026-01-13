import { create } from "zustand";

interface CompareState {
  compareList: string[];
  maxCompare: number;
  addToCompare: (itemCd: string) => boolean;
  removeFromCompare: (itemCd: string) => void;
  clearCompare: () => void;
  isInCompare: (itemCd: string) => boolean;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  compareList: [],
  maxCompare: 3,
  addToCompare: (itemCd) => {
    const { compareList, maxCompare } = get();
    if (compareList.length >= maxCompare) {
      return false;
    }
    if (compareList.includes(itemCd)) {
      return true;
    }
    set({ compareList: [...compareList, itemCd] });
    return true;
  },
  removeFromCompare: (itemCd) =>
    set((state) => ({
      compareList: state.compareList.filter((id) => id !== itemCd),
    })),
  clearCompare: () => set({ compareList: [] }),
  isInCompare: (itemCd) => get().compareList.includes(itemCd),
}));
