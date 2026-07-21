import { useEffect, useState } from "react";
import { SavedFilter } from "../types";

const STORAGE_KEY = "grantfox_saved_filters";

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] =
    useState<SavedFilter[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      setSavedFilters(JSON.parse(stored));
    }
  }, []);

  const saveFilter = (filter: SavedFilter) => {
    const updated = [...savedFilters, filter];

    setSavedFilters(updated);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  };

  return {
    savedFilters,
    saveFilter,
  };
}