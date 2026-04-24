import React from 'react';
import Sidebar from './Sidebar';
import { resolvePath } from '../auth/authUtils';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';

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
      iconComponent: CalendarMonthIcon,
      label: 'Calendar',
      onClick: () => navigate(resolvePath('dashboard', user)),
    },
    { id: 'courses', iconComponent: CollectionsBookmarkOutlinedIcon, label: 'Courses', onClick: () => navigate('/courses') },
    { id: 'search', iconComponent: SearchIcon, label: 'Search', onClick: () => navigate('/booking/search') },
  ];

  if (canCreate) {
    items.push({
      id: 'create',
      iconComponent: AddIcon,
      label: 'Create',
      onClick: onCreate || (() => navigate('/heatmap/professor/new')),
    });
  }

  return (
    <Sidebar
      activeId={activeId}
      items={items}
      bottomItems={[{ id: 'help', iconComponent: InfoIcon, label: 'Help', onClick: onHelp }]}
    />
  );
}
