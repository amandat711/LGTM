import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAvailableProfessors } from '../api/availabilities';
import Navbar from '../components/Navbar';

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
  const { userId } = useParams();
  const [query, setQuery] = useState('');
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfessors() {
      setLoading(true);
      setError('');
      try {
        const data = await getAvailableProfessors(query);
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
  }, [query]);

  const filteredProfessors = useMemo(() => professors, [professors]);

  return (
    <div className="dashboard-container">
      <Navbar
        title="Back to dashboard"
        onLeftClick={() => navigate(`/dashboard/student/${userId}`)}
        user={{ displayName: 'Booking discovery' }}
      />

      <div className="booking-page-content">
        <section className="booking-panel">
          <h1>Find a professor to book with</h1>
          <p className="booking-search-hint">
            Search professors by name, department, or email to view booking availability.
          </p>
          <input
            className="booking-search-input"
            type="search"
            placeholder="Search for a professor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <p style={{ marginTop: 12, color: '#666' }}>Loading professors...</p>}
          {error && <p style={{ marginTop: 12, color: '#d13434' }}>{error}</p>}
        </section>

        <section className="booking-results">
          {filteredProfessors.length === 0 ? (
            <p className="booking-empty-state">No matching professors found.</p>
          ) : (
            filteredProfessors.map((prof) => (
              <div key={prof.id} className="booking-card">
                <div>
                  <h2>{prof.name}</h2>
                  <p className="booking-card-subtitle">{prof.department}</p>
                  <p className="booking-card-email">{prof.email}</p>
                  <p className="booking-card-bio">{prof.bio}</p>
                </div>
                <button
                  className="booking-card-button"
                  onClick={() => navigate(`/booking/professor/${prof.id}?student=${userId}`)}
                >
                  View availability
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
