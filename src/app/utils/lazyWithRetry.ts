import { lazy, ComponentType, LazyExoticComponent } from "react";

/**
 * A wrapper around React.lazy that attempts to reload the page when a dynamic import fails.
 * This is crucial for handling chunk load errors caused by new deployments where the hashes of assets change.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasAlreadyReloaded = sessionStorage.getItem("page-has-already-reloaded");
    try {
      const component = await componentImport();
      sessionStorage.removeItem("page-has-already-reloaded");
      return component;
    } catch (error) {
      console.error("Dynamic import failed:", error);
      if (!pageHasAlreadyReloaded) {
        // First time error, set flag and reload page to fetch latest asset manifest
        sessionStorage.setItem("page-has-already-reloaded", "true");
        window.location.reload();
        // Return a pending promise so the UI doesn't crash or show error before reload
        return new Promise<{ default: T }>(() => {});
      }
      
      // If we already reloaded and it still fails, propagate the error
      throw error;
    }
  });
}
