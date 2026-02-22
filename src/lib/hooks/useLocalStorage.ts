import { useState, useEffect } from "react";

/**
 * A robust `localStorage` wrapper hook for managing state.
 * @param key The local storage key.
 * @param initialValue The default value if the key does not exist.
 * @returns [state, setState] analogous to useState.
 */
export function useLocalStorageState<T>(key: keyof typeof STORAGE_KEYS, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // Read initial value from window (if available) or use the fallback
    const [state, setState] = useState<T>(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(STORAGE_KEYS[key]);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${STORAGE_KEYS[key]}":`, error);
            return initialValue;
        }
    });

    // Sync back to local storage whenever state changes
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(state));
        } catch (error) {
            console.warn(`Error setting localStorage key "${STORAGE_KEYS[key]}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}

// Global Storage Keys mapping to ensure consistency
export const STORAGE_KEYS = {
    USER_LISTS: "vc_user_lists",
    SAVED_SEARCHES: "vc_saved_searches",
    NOTES: "vc_notes",
    ENRICHMENT_CACHE: "vc_enrichment_cache",
} as const;
