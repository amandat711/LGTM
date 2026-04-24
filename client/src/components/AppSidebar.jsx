import React, { useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { isFacultyAdmin, resolvePath } from '../auth/authUtils';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import { HelpGuideModal } from './Modals';
import { DASHBOARD_HELP_GUIDES } from '../data/helpGuides';

export default function AppSidebar({
  activeId,
  user,
  navigate,
  canCreate = false,
  onCreate,
  onHelp,
  helpGuide,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const roleKey = useMemo(
    () => (isFacultyAdmin(user?.user_type) ? 'professor' : 'student'),
    [user?.user_type]
  );

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

  function handleHelpClick() {
    if (onHelp) {
      onHelp();
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <Sidebar
        activeId={activeId}
        items={items}
        bottomItems={[{ id: 'help', iconComponent: InfoIcon, label: 'Help', onClick: handleHelpClick }]}
      />
      {showHelp && (
        <HelpGuideModal
          guide={helpGuide || DASHBOARD_HELP_GUIDES[roleKey]}
          onClose={() => setShowHelp(false)}
        />
      )}
    </>
  );
}
