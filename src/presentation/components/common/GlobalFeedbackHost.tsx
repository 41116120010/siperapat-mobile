import React from 'react';
import { useFeedbackStore } from '../../store/useFeedbackStore';
import { FeedbackModal } from '../modals/FeedbackModal';
import { ToastNotification } from './ToastNotification';

export const GlobalFeedbackHost: React.FC = () => {
  const {
    modalVisible,
    modalConfig,
    hideModal,
    toastVisible,
    toastConfig,
    hideToast,
  } = useFeedbackStore();

  return (
    <>
      {modalConfig && (
        <FeedbackModal
          visible={modalVisible}
          onClose={hideModal}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          detail={modalConfig.detail}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          confirmVariant={modalConfig.confirmVariant}
          onConfirm={() => {
            modalConfig.onConfirm?.();
            hideModal();
          }}
          onCancel={() => {
            modalConfig.onCancel?.();
            hideModal();
          }}
        />
      )}

      {toastConfig && (
        <ToastNotification
          visible={toastVisible}
          type={toastConfig.type}
          message={toastConfig.message}
          duration={toastConfig.duration}
          onDismiss={hideToast}
        />
      )}
    </>
  );
};
