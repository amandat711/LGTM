import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableProfessors } from '../api/availabilities';
import useAppShellSession from '../hooks/useAppShellSession';
import { isFacultyAdmin, resolvePath } from '../auth/authUtils';
import Navbar from '../components/Navbar';
import AppSidebar from '../components/AppSidebar';
import { logout } from '../api/auth';
import logo from '../assets/logo1.png';

function mapOwnerToProfessor(owner) {
  return {
    id: owner.user_id?.toString() ?? `${owner.first_name?.toLowerCase()}.${owner.last_name?.toLowerCase()}`,
    name: owner.first_name && owner.last_name ? `Prof. ${owner.first_name} ${owner.last_name}` : owner.staff_title || 'Professor',
    department: owner.department || owner.staff_title || 'Faculty',
    email: owner.mcgill_email || 'noreply@mail.mcgill.ca',
    bio: owner.staff_title
      ? `Available for meetings in ${owner.department || 'your area of study'}.`
      : 'Available for appointments.',
  };
}

export default function BookingDiscovery() {
  const navigate = useNavigate();
  const { user } = useAppShellSession();
  const canCreate = isFacultyAdmin(user.user_type);
  const [query, setQuery] = useState('');
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const initials = `${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`;

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
        const data = await getAvailableProfessors('');
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
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return professors;

    return professors.filter((prof) =>
      [prof.name, prof.department, prof.email, prof.bio]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [professors, query]);

  return (
    <div className="dashboard-page">
      <Navbar
        logo={logo}
        title="Booking"
        onLeftClick={() => navigate(resolvePath('dashboard', user))}
        user={{
          displayName: `${user?.last_name || ''}, ${user?.first_name || 'User'}`.trim(),
          role: canCreate ? 'professor' : 'student',
          initials,
        }}
        actions={[{ label: 'Log Out', onClick: handleLogout }]}
      />

      <div className="dashboard-layout">
        <AppSidebar
          activeId="search"
          user={user}
          navigate={navigate}
          canCreate={canCreate}
        />
        <div className="main-content">
          <div className="booking-page" style={{ width: '100%' }}>
            <section className="booking-box">
              <h1>Find a professor to book with</h1>
              <p className="booking-help-text">
                Search professors by name, department, or email to view booking availability.
              </p>
              <input
                className="booking-search-box"
                type="search"
                placeholder="Search for a professor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
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
