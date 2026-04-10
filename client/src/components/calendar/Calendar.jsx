import React from 'react';
import WeekView from './WeekView';

export default function Calendar({ view = 'week', appointments, onEventClick }) {
  if (view === 'week') {
    return <WeekView appointments={appointments} onEventClick={onEventClick} />;
  }

  return <WeekView appointments={appointments} onEventClick={onEventClick} />;
}