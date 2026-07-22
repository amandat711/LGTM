// JOCELYNE LI (66% estimated contribution) => Feature implementation, integration work, and quality refinements
// SHIRLEY DING, 39.4% contribution
import React from 'react';
import '../styles/CreateAvailabilityModal.css';
import { Modal } from './Modals';
import CreateAppointmentForm from './CreateAppointmentForm';

export default function CreateAppointmentModal({
  onClose,
  onSubmit,
  defaultVisibility = 'public',
  initialData = null,
  mode = 'create',
  forcedCourse = null,
}) {
  return (
    <Modal
      title={mode === 'edit' ? 'Edit appointment' : 'Create appointment'}
      onClose={onClose}
      className="availability-modal create-item-modal"
    >
      <CreateAppointmentForm
        mode="event"
        onSubmit={onSubmit}
        onCancel={onClose}
        defaultVisibility={defaultVisibility}
        submitLabel={mode === 'edit' ? 'Save changes' : 'Create appointment'}
        initialData={initialData}
        ownerUserId={null}
        forcedCourse={forcedCourse}
      />
    </Modal>
  );
}
