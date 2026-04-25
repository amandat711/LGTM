// AMANDA TRAN
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProfessors } from '../api/users';
import { logout } from '../api/auth';
import useAppShellSession from '../hooks/useAppShellSession';
import { isFacultyAdmin, resolvePath } from '../auth/authUtils';
import Navbar from '../components/Navbar';
import AppSidebar from '../components/AppSidebar';
import { PAGE_HELP_GUIDES } from '../data/helpGuides';
import logo from '../assets/LGTMLogo2.png';
import '../styles/Dashboard.css';

function mapOwnerToProfessor(owner) {
  const firstName = owner.firstName ?? owner.first_name ?? '';
  const lastName = owner.lastName ?? owner.last_name ?? '';
  const department = owner.department ?? '';
  const staffTitle = owner.staffTitle ?? owner.staff_title ?? '';
  const email = owner.email ?? owner.mcgill_email ?? 'noreply@mail.mcgill.ca';

  return {
    id: owner.id?.toString() ?? owner.user_id?.toString() ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    name: firstName && lastName ? `${firstName} ${lastName}` : staffTitle || 'Professor',
    department: department || staffTitle || 'Faculty',
    email,
  };
}

export default function BookingDiscovery() {
  const navigate = useNavigate();
  const { user } = useAppShellSession();
  const currentUserId = user?.user_id != null ? String(user.user_id) : '';
  const [query, setQuery] = useState('');
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const firstName = user?.first_name || 'User';
  const lastName = user?.last_name || '';
  const userRole = isFacultyAdmin(user?.user_type) ? 'professor' : 'student';
  const initials = `${firstName?.[0] || 'U'}${lastName?.[0] || ''}`;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  }

  useEffect(() => {
    let active = true;

    async function loadProfessors() {
      setLoading(true);
      setError('');
      try {
        const data = await getAllProfessors('');
        if (!active) return;

        setProfessors(Array.isArray(data) ? data.map(mapOwnerToProfessor) : []);
      } catch (err) {
        if (!active) return;
        setProfessors([]);
        setError('Unable to load professors from backend.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfessors();
    return () => {
      active = false;
    };
  }, []);

  const filteredProfessors = useMemo(() => {
    const otherProfessors = professors.filter((prof) => String(prof.id) !== currentUserId);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return otherProfessors;

    return otherProfessors.filter((prof) =>
      [prof.name, prof.department, prof.email, prof.bio]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [professors, query, currentUserId]);

  return (
    <div className="dashboard-page">
      <Navbar
        logo={logo}
        title="Search"
        onLeftClick={() => navigate(resolvePath('dashboard', user))}
        user={{
          displayName: `${lastName}, ${firstName}`,
          role: userRole,
          initials,
        }}
        actions={[{ label: 'Log Out', onClick: handleLogout }]}
      />

      <div className="dashboard-layout">
        <AppSidebar
          activeId="search"
          user={user}
          navigate={navigate}
          canCreate={false}
          helpGuide={PAGE_HELP_GUIDES.bookingSearch}
        />
        <div className="main-content">
          <div className="booking-page">
            <section className="booking-box">
              <h1>Find a professor to book with</h1>
              <p className="booking-help-text">
                Search professors by name, department, or email to view booking availability.
              </p>
              <div className={`booking-search-wrap${query.trim() ? ' booking-search-wrap--has-value' : ''}`}>
                <input
                  className="booking-search-box"
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Search for a professor"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search for a professor"
                />
                {query.trim() ? (
                  <button
                    type="button"
                    className="booking-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}
              </div>
              {loading && <p style={{ marginTop: 12, color: '#666' }}>Loading professors...</p>}
              {error && <p style={{ marginTop: 12, color: '#d13434' }}>{error}</p>}
            </section>

            <section className="professor-list">
              {filteredProfessors.length === 0 ? (
                <p className="booking-empty-message">No matching professors found.</p>
              ) : (
                filteredProfessors.map((prof) => (
                  <div key={prof.id} className="professor-card">
                    <div>
                      <h2>{prof.name}</h2>
                      <p className="professor-card-subtitle">{prof.department}</p>
                      <p className="professor-card-email">{prof.email}</p>
                      <p className="professor-card-description">{prof.bio}</p>
                    </div>
                    <button
                      className="professor-card-button"
                      onClick={() => navigate(`/booking/professor/${prof.id}`)}
                    >
                      View availability
                    </button>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
