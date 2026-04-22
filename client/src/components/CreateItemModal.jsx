import React, { useMemo, useState } from 'react';
import '../styles/CreateAvailabilityModal.css';
import CreateAppointmentForm from './CreateAppointmentForm';
import CreateAvailabilityForm from './CreateAvailabilityForm';

export default function CreateItemModal({
  onClose,
  onCreateAvailability,
  onCreateDirectAppointment,
  defaultTab = 'event', // 'event' | 'appointment' | 'availability'
}) {
  const [tab, setTab] = useState(defaultTab);

  const title = useMemo(() => {
    if (tab === 'availability') return 'Create availability';
    if (tab === 'appointment') return 'Create appointment';
    return 'Create event';
  }, [tab]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="availability-modal-overlay" onMouseDown={handleOverlayClick}>
      <div className="availability-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="availability-modal-header">
          <div>
            <h2>{title}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className={`button button-outline button-small ${tab === 'event' ? 'active' : ''}`}
                onClick={() => setTab('event')}
              >
                Event
              </button>
              <button
                type="button"
                className={`button button-outline button-small ${tab === 'appointment' ? 'active' : ''}`}
                onClick={() => setTab('appointment')}
              >
                Appointment
              </button>
              <button
                type="button"
                className={`button button-outline button-small ${tab === 'availability' ? 'active' : ''}`}
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

        {tab === 'availability' ? (
          <CreateAvailabilityForm onSubmit={onCreateAvailability} onCancel={onClose} />
        ) : (
          <CreateAppointmentForm
            mode={tab}
            onSubmit={onCreateDirectAppointment}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}

