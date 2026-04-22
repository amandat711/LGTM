import React, { useMemo, useState } from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAppointmentForm from './CreateAppointmentForm';
import CreateAvailabilityForm from './CreateAvailabilityForm';

export default function CreateItemModal({
  onClose,
  onCreateAvailability,
  onCreateDirectAppointment,
  defaultTab = 'event', // 'event' | 'availability'
  initialStartTime = null, // ISO string, used to prefill event/appointment forms
  initialEndTime = null, // ISO string, used to prefill event/appointment forms
}) {
  const [tab, setTab] = useState(defaultTab === 'appointment' ? 'event' : defaultTab);

  const title = useMemo(() => {
    if (tab === 'availability') return 'Create availability';
    return 'Create event';
  }, [tab]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="availability-modal-overlay" onMouseDown={handleOverlayClick}>
      <div className="availability-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="availability-modal-header">
          <div className="availability-modal-header-content">
            <h2>{title}</h2>
            <div className="availability-tabs" role="tablist" aria-label="Create item type">
              <button
                type="button"
                className={`button button-outline button-small availability-tab-btn ${tab === 'event' ? 'active' : ''}`}
                onClick={() => setTab('event')}
              >
                Event
              </button>
              <button
                type="button"
                className={`button button-outline button-small availability-tab-btn ${tab === 'availability' ? 'active' : ''}`}
                onClick={() => setTab('availability')}
              >
                Availability
              </button>
            </div>
          </div>

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
          {tab === 'availability' ? (
            <CreateAvailabilityForm onSubmit={onCreateAvailability} onCancel={onClose} />
          ) : (
            <CreateAppointmentForm
              mode="event"
              onSubmit={onCreateDirectAppointment}
              onCancel={onClose}
              initialStartTime={initialStartTime}
              initialEndTime={initialEndTime}
            />
          )}
        </div>
      </div>
    </div>
  );
}

