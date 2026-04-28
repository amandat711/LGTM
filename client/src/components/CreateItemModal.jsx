// JOCELYNE LI (100% estimated contribution) => Feature implementation, integration work, and quality refinements
import React, { useMemo, useState } from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAppointmentForm from './CreateAppointmentForm';
import CreateAvailabilityForm from './CreateAvailabilityForm';
import { Modal } from './Modals';

export default function CreateItemModal({
  onClose,
  onCreateAvailability,
  onCreateDirectAppointment,
  defaultTab = 'event', // 'event' | 'availability'
  initialStartTime = null, // ISO string, used to prefill event/appointment forms
  initialEndTime = null, // ISO string, used to prefill event/appointment forms
  ownerUserId = null,
}) {
  const [tab, setTab] = useState(defaultTab === 'appointment' ? 'event' : defaultTab);

  const title = useMemo(() => {
    if (tab === 'availability') return 'Create availability';
    return 'Create event';
  }, [tab]);

  return (
    <Modal title={title} onClose={onClose} className="availability-modal create-item-modal">
      <div className="availability-tabs" role="tablist" aria-label="Create item type">
        <button
          type="button"
          className={`availability-tab-btn ${tab === 'event' ? 'active' : ''}`}
          onClick={() => setTab('event')}
        >
          Event
        </button>
        <button
          type="button"
          className={`availability-tab-btn ${tab === 'availability' ? 'active' : ''}`}
          onClick={() => setTab('availability')}
        >
          Availability
        </button>
      </div>

      <div className="availability-modal-body">
        {tab === 'availability' ? (
          <CreateAvailabilityForm
            onSubmit={onCreateAvailability}
            onCancel={onClose}
            initialStartTime={initialStartTime}
            initialEndTime={initialEndTime}
          />
        ) : (
          <CreateAppointmentForm
            mode="event"
            onSubmit={onCreateDirectAppointment}
            onCancel={onClose}
            initialStartTime={initialStartTime}
            initialEndTime={initialEndTime}
            ownerUserId={ownerUserId}
          />
        )}
      </div>
    </Modal>
  );
}

