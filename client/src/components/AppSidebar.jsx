import React from 'react';
import Sidebar from './Sidebar';
import { resolvePath } from '../auth/authUtils';
import calendarIcon from '../assets/calendarIcon.png';
import coursesIcon from '../assets/courseIcon.png';
import searchIcon from '../assets/searchIcon.png';
import InfoIcon from '../assets/infoIcon.png';
import createAvailabilityIcon from '../assets/createAvailabilityIcon.png';

export default function AppSidebar({
  activeId,
  user,
  navigate,
  canCreate = false,
  onCreate,
  onHelp,
}) {
  const items = [
    {
      id: 'calendar',
      icon: calendarIcon,
      label: 'Calendar',
      onClick: () => navigate(resolvePath('dashboard', user)),
    },
    { id: 'courses', icon: coursesIcon, label: 'Courses', onClick: () => navigate('/courses') },
    { id: 'search', icon: searchIcon, label: 'Search', onClick: () => navigate('/booking/search') },
  ];

  if (canCreate) {
    items.push({
      id: 'create',
      icon: createAvailabilityIcon,
      label: '+ Create',
      onClick: onCreate || (() => navigate('/heatmap/professor/new')),
    });
  }

  return (
    <Sidebar
      activeId={activeId}
      items={items}
      bottomItems={[{ id: 'help', icon: InfoIcon, label: 'Help', onClick: onHelp }]}
    />
  );
}
