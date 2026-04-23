import React from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAppointmentForm from './CreateAppointmentForm';

export default function CreateAppointmentModal({
  onClose,
  onSubmit,
  defaultVisibility = 'private',
  initialData = null,
  mode = 'create',
}) {
  function handleOverlayMouseDown(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="availability-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="availability-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="availability-modal-header">
          <h2>{mode === 'edit' ? 'Edit event' : 'Create event'}</h2>
          <button
            type="button"
            className="availability-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="availability-modal-body">
          <CreateAppointmentForm
            mode={mode}
            initialData={initialData}
            defaultVisibility={defaultVisibility}
            submitLabel={mode === 'edit' ? 'Save changes' : undefined}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
