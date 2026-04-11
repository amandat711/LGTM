import React from 'react';
import WeekView from './WeekView';
import '../../styles/Calendar.css';

export default function Calendar({ view = 'week', appointments, onEventClick }) {
  if (view === 'week') {
    return <WeekView appointments={appointments} onEventClick={onEventClick} />;
  }

  return <WeekView appointments={appointments} onEventClick={onEventClick} />;
}