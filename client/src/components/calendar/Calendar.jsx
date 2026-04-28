// JOCELYNE LI (45% estimated contribution) => Core calendar interactions, recurrence UX, and scheduling behavior
import React from 'react';
import WeekView from './WeekView';
import '../../styles/Calendar.css';

export default function Calendar({
  view = 'week',
  appointments,
  onEventClick,
  onSlotClick,
  onSlotSelect,
}) {
  if (view === 'week') {
    return (
      <WeekView
        appointments={appointments}
        onEventClick={onEventClick}
        onSlotClick={onSlotClick}
        onSlotSelect={onSlotSelect}
      />
    );
  }

  return (
    <WeekView
      appointments={appointments}
      onEventClick={onEventClick}
      onSlotClick={onSlotClick}
      onSlotSelect={onSlotSelect}
    />
  );
}