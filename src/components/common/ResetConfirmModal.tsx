import React from 'react';
import { Modal } from './Modal';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reset calculation?',
  description = 'Are you sure you want to reset? All entered inputs and calculated results will be cleared. This action cannot be undone.',
  confirmLabel = 'Reset',
  cancelLabel = 'Cancel',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      confirmDestructive={true}
      onConfirm={onConfirm}
    >
      <div className="text-xs text-[var(--text-tertiary)] py-1">
        This action cannot be undone.
      </div>
    </Modal>
  );
};
