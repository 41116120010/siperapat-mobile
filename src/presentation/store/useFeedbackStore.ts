import { create } from 'zustand';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface FeedbackModalOptions {
  type: FeedbackType;
  title: string;
  message: string;
  detail?: string | Record<string, string>;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'destructive';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface FeedbackState {
  // Modal state
  modalVisible: boolean;
  modalConfig: FeedbackModalOptions | null;
  showModal: (config: FeedbackModalOptions) => void;
  hideModal: () => void;

  // Toast state
  toastVisible: boolean;
  toastConfig: ToastOptions | null;
  showToast: (config: ToastOptions) => void;
  hideToast: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  modalVisible: false,
  modalConfig: null,

  showModal: (config) =>
    set({
      modalVisible: true,
      modalConfig: config,
    }),

  hideModal: () =>
    set({
      modalVisible: false,
      modalConfig: null,
    }),

  toastVisible: false,
  toastConfig: null,

  showToast: (config) =>
    set({
      toastVisible: true,
      toastConfig: config,
    }),

  hideToast: () =>
    set({
      toastVisible: false,
      toastConfig: null,
    }),
}));

// Convenience helper methods for backend / service calls
export const showGlobalModal = (config: FeedbackModalOptions) =>
  useFeedbackStore.getState().showModal(config);

export const showGlobalToast = (config: ToastOptions) =>
  useFeedbackStore.getState().showToast(config);

export const hideGlobalModal = () =>
  useFeedbackStore.getState().hideModal();

export const hideGlobalToast = () =>
  useFeedbackStore.getState().hideToast();
