import React from 'react';
import WeekView from './WeekView';
import '../../styles/Calendar.css';

export default function Calendar({
  view = 'week',
  appointments,
  onEventClick,
  inlineEventPopup = false,
  renderInlineEventPopup = null,
}) {
  if (view === 'week') {
    return (
      <WeekView
        appointments={appointments}
        onEventClick={onEventClick}
        inlineEventPopup={inlineEventPopup}
        renderInlineEventPopup={renderInlineEventPopup}
      />
    );
  }

  return (
    <WeekView
      appointments={appointments}
      onEventClick={onEventClick}
      inlineEventPopup={inlineEventPopup}
      renderInlineEventPopup={renderInlineEventPopup}
    />
  );
}