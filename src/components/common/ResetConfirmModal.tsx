import React from 'react';
import { Modal } from './Modal';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reset calculation?',
  description = 'Are you sure you want to reset? All entered inputs and calculated results will be cleared. This action cannot be undone.',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      confirmText="Reset"
      confirmDestructive={true}
      onConfirm={onConfirm}
    >
      <div className="text-xs text-[var(--text-tertiary)] py-1">
        Clicking Reset will restore all fields to their default starting values.
      </div>
    </Modal>
  );
};
