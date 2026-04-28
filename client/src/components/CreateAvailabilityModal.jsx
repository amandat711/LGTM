// SHIRLEY DING, 3.7% contribution
import React from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAvailabilityForm from './CreateAvailabilityForm';
import { Modal } from './Modals';
import { formatRecurrenceSubtitleLine } from './calendar/calendarUtils';

export default function CreateAvailabilityModal({
  onClose,
  onSubmit,
  defaultVisibility = 'private',
  title = 'Create availability',
  submitLabel = 'Create slot',
  initialData = null,
}) {
  const courseMetaLabel = initialData?.course_code ?? initialData?.courseCode ?? null;

  function handleModalClose() {
    onClose();
  }

  const headerRecurrenceLine = formatRecurrenceSubtitleLine({
    recurrence_rule: initialData?.recurrence_rule,
    recurrence_group_id: initialData?.recurrence_group_id,
  });

  return (
    <Modal
      title={title}
      onClose={handleModalClose}
      className="availability-modal create-item-modal"
      meta={
        <>
          <span className="modal-kind-pill modal-kind-pill--availability">Availability</span>
          {courseMetaLabel ? (
            <span className="modal-kind-pill modal-kind-pill--course">Course: {courseMetaLabel}</span>
          ) : null}
        </>
      }
    >
      <p className="availability-modal-subtitle">Create a time slot students can book.</p>
      {headerRecurrenceLine ? (
        <p className="availability-modal-recurrence">{headerRecurrenceLine}</p>
      ) : null}
      <CreateAvailabilityForm
        onSubmit={onSubmit}
        onCancel={handleModalClose}
        defaultVisibility={defaultVisibility}
        submitLabel={submitLabel}
        initialData={initialData}
      />
    </Modal>
  );
}