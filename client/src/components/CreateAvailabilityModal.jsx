import React from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAvailabilityForm from './CreateAvailabilityForm';

export default function CreateAvailabilityModal({
  onClose,
  onSubmit,
  defaultVisibility = 'private',
  title = 'Create availability',
  submitLabel = 'Create slot',
  initialData = null,
}) {
  function handleModalClose() {
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      handleModalClose();
    }
  }

  return (
    <div
      className="availability-modal-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className="availability-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="availability-modal-header">
          <div>
            <h2>{title}</h2>
            <p className="availability-modal-subtitle">
              Create a time slot students can book.
            </p>
          </div>

          <button
            type="button"
            className="availability-close-btn"
            onClick={handleModalClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <CreateAvailabilityForm
          onSubmit={onSubmit}
          onCancel={handleModalClose}
          defaultVisibility={defaultVisibility}
          submitLabel={submitLabel}
          initialData={initialData}
        />
      </div>
    </div>
  );
}