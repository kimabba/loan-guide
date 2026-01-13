import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  favorites: string[];
  addFavorite: (itemCd: string) => void;
  removeFavorite: (itemCd: string) => void;
  toggleFavorite: (itemCd: string) => void;
  isFavorite: (itemCd: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (itemCd) =>
        set((state) => ({
          favorites: state.favorites.includes(itemCd)
            ? state.favorites
            : [...state.favorites, itemCd],
        })),
      removeFavorite: (itemCd) =>
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== itemCd),
        })),
      toggleFavorite: (itemCd) => {
        const { favorites } = get();
        if (favorites.includes(itemCd)) {
          set({ favorites: favorites.filter((id) => id !== itemCd) });
        } else {
          set({ favorites: [...favorites, itemCd] });
        }
      },
      isFavorite: (itemCd) => get().favorites.includes(itemCd),
    }),
    {
      name: "loan-guide-favorites",
    }
  )
);
