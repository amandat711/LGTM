import React from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAvailabilityForm from './CreateAvailabilityForm';
import { formatRecurrenceSubtitleLine } from './calendar/calendarUtils';

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

  const headerRecurrenceLine = formatRecurrenceSubtitleLine({
    recurrence_rule: initialData?.recurrence_rule,
    recurrence_group_id: initialData?.recurrence_group_id,
  });

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
            {headerRecurrenceLine ? (
              <p className="availability-modal-recurrence">{headerRecurrenceLine}</p>
            ) : null}
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