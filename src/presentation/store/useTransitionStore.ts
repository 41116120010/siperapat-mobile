import { create } from 'zustand';

interface TransitionState {
  isTransitioning: boolean;
  duration: number;
  showTransition: (duration?: number) => void;
  hideTransition: () => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  isTransitioning: false,
  duration: 550,

  showTransition: (duration = 550) =>
    set({
      isTransitioning: true,
      duration,
    }),

  hideTransition: () =>
    set({
      isTransitioning: false,
    }),
}));

let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Global helper to trigger a smooth page transition overlay.
 * Automatically dismisses after the given duration (default 550ms).
 */
export const triggerPageTransition = (duration: number = 550): void => {
  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }

  useTransitionStore.getState().showTransition(duration);

  transitionTimeout = setTimeout(() => {
    useTransitionStore.getState().hideTransition();
    transitionTimeout = null;
  }, duration);
};
