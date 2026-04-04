import React, { useState } from 'react';
import '../styles/Heatmap.css';

import { PersonalGrid, GroupGrid, HeatmapLegend } from '../components/HeatmapGrid';
import {
  ConfirmSlotModal,
  SlotDetailModal,
  DeleteConfirmModal,
  InviteURLModal,
} from '../components/Modals';

// ─── Sample data (replace with API calls) ────────────────────
const DAYS = [
  { short: 'Mon', date: 'Apr 7' },
  { short: 'Tue', date: 'Apr 8' },
  { short: 'Wed', date: 'Apr 9' },
  { short: 'Thu', date: 'Apr 10' },
  { short: 'Fri', date: 'Apr 11' },
];

const SAMPLE_PARTICIPANTS = [
  { name: 'Amanda', color: '#E31429', slots: [0,1,4,5,8,9,10,11,14,15,16,17] },
  { name: 'Priya',  color: '#c0842a', slots: [0,1,2,3,8,9,10,14,15,16,20,21] },
  { name: 'Marcus', color: '#2a8c5f', slots: [2,3,4,5,8,9,10,11,12,16,17,18] },
  { name: 'Lea',    color: '#5a4ab0', slots: [0,1,2,8,9,14,15,16,17,18,20,21] },
];

const SAMPLE_PEOPLE = [
  { name: 'Prof. Vybihal',   email: 'joseph.vybihal@mcgill.ca',       slots: 8 },
  { name: 'Amanda Chen',     email: 'amanda.chen@mail.mcgill.ca',     slots: 12 },
  { name: 'Priya Sharma',    email: 'priya.sharma@mail.mcgill.ca',    slots: 10 },
  { name: 'Marcus Tremblay', email: 'marcus.tremblay@mail.mcgill.ca', slots: 9 },
  { name: 'Lea Bouchard',    email: 'lea.bouchard@mail.mcgill.ca',    slots: 11 },
];

// Current user — replace with auth context
const CURRENT_USER = { name: 'Amanda Chen', email: 'amanda.chen@mail.mcgill.ca', isOwner: true };

// ─────────────────────────────────────────────────────────────
export default function Heatmap() {
  const [tab, setTab]             = useState('submit');

  // Personal grid
  const [selected, setSelected]   = useState(new Set());

  // Group grid
  const [activeNames, setActive]  = useState(new Set(SAMPLE_PARTICIPANTS.map((p) => p.name)));
  const [groupKey, setGroupKey]   = useState(null);
  const [groupMeta, setGroupMeta] = useState(null);

  // Search
  const [query, setQuery]         = useState('');

  // Modals
  const [modal, setModal]         = useState(null); // 'confirm' | 'detail' | 'delete' | 'invite'
  const [activeAppt, setActiveAppt] = useState(null);

  // ── handlers ──────────────────────────────────────────────
  function toggleParticipant(name) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function handleGroupSelect(key, meta) {
    setGroupKey(key);
    setGroupMeta(meta);
  }

  function openConfirmModal() {
    if (!groupKey) return;
    setModal('confirm');
  }

  function handleConfirmSlot() {
    // TODO: POST /api/appointments — create confirmed appointment
    setGroupKey(null);
    setGroupMeta(null);
    setModal(null);
  }

  function openSlotDetail(appt) {
    setActiveAppt(appt);
    setModal('detail');
  }

  function openDeleteConfirm() {
    setModal('delete');
  }

  function handleDelete() {
    // TODO: DELETE /api/appointments/:id
    setActiveAppt(null);
    setModal(null);
  }

  function saveAvailability() {
    // TODO: POST /api/heatmap/availability  { slots: [...selected] }
    alert(`Saved ${selected.size} slots!`);
  }

  const searchResults = SAMPLE_PEOPLE.filter(
    (p) =>
      query.length > 0 &&
      (p.name.toLowerCase().includes(query.toLowerCase()) ||
       p.email.toLowerCase().includes(query.toLowerCase()))
  );

  const activeParticipants = SAMPLE_PARTICIPANTS.filter((p) => activeNames.has(p.name));

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="heatmap-page">
      {/* Header */}
      <div className="heatmap-header">
        <h2>COMP 307 Project Check-in</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {CURRENT_USER.isOwner && (
            <button className="btn btn-outline" onClick={() => setModal('invite')}>
              Share invite link
            </button>
          )}
          <div className="tabs">
            {['submit', 'group', 'search'].map((t) => (
              <button
                key={t}
                className={`tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'submit' ? 'My availability' : t === 'group' ? 'Group view' : 'Find people'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── My availability ─────────────────────────────────── */}
      {tab === 'submit' && (
        <>
          <p className="section-label">Click or drag to mark when you're free</p>
          <PersonalGrid days={DAYS} selected={selected} setSelected={setSelected} />
          <div className="confirm-bar">
            <button className="btn btn-primary" onClick={saveAvailability}>
              Save availability
            </button>
            <button className="btn btn-outline" onClick={() => setSelected(new Set())}>
              Clear all
            </button>
            <span className="selected-info">
              <strong>{selected.size}</strong> slot{selected.size !== 1 ? 's' : ''} selected
            </span>
          </div>
        </>
      )}

      {/* ── Group heatmap ────────────────────────────────────── */}
      {tab === 'group' && (
        <>
          <p className="section-label">Participants</p>
          <div className="participants">
            {SAMPLE_PARTICIPANTS.map((p) => (
              <div
                key={p.name}
                className={`chip ${activeNames.has(p.name) ? 'active' : 'inactive'}`}
                onClick={() => toggleParticipant(p.name)}
              >
                <span className="chip-dot" style={{ background: p.color }} />
                {p.name}
              </div>
            ))}
          </div>

          <HeatmapLegend max={activeParticipants.length} />
          <p className="section-label">Hover cells to see who's free</p>

          <GroupGrid
            days={DAYS}
            participants={SAMPLE_PARTICIPANTS}
            activeNames={activeNames}
            selectedKey={groupKey}
            onSelectKey={handleGroupSelect}
          />

          <div className="confirm-bar">
            <button
              className="btn btn-primary"
              onClick={openConfirmModal}
              disabled={!groupKey}
            >
              Confirm selected slot
            </button>
            <span className="selected-info">
              {groupMeta ? (
                <>
                  <strong>{groupMeta.timeLabel}</strong> on {groupMeta.dayShort} —{' '}
                  {groupMeta.count}/{groupMeta.max} free
                </>
              ) : (
                'Click a cell to select it'
              )}
            </span>
          </div>
        </>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      {tab === 'search' && (
        <>
          <div className="search-row">
            <input
              className="search-input"
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {searchResults.map((p) => (
            <div key={p.email} className="result-card">
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{p.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#888' }}>{p.slots} open slots</span>
                <button
                  className="btn btn-outline"
                  style={{ padding: '5px 14px', fontSize: 12 }}
                  onClick={() =>
                    openSlotDetail({
                      title: `Meeting with ${p.name}`,
                      day: 'Mon Apr 7',
                      time: '10:00 AM',
                      owner: p.name,
                      ownerEmail: p.email,
                      bookedBy: CURRENT_USER.name,
                    })
                  }
                >
                  View slots
                </button>
              </div>
            </div>
          ))}
          {query.length > 0 && searchResults.length === 0 && (
            <p style={{ fontSize: 13, color: '#888' }}>No results found.</p>
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {modal === 'confirm' && groupMeta && (
        <ConfirmSlotModal
          slot={{ day: `${groupMeta.dayShort} ${groupMeta.fullDate}`, time: groupMeta.timeLabel }}
          attendees={groupMeta.who}
          onConfirm={handleConfirmSlot}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'detail' && activeAppt && (
        <SlotDetailModal
          appointment={activeAppt}
          isOwner={CURRENT_USER.isOwner}
          onDelete={openDeleteConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'delete' && activeAppt && (
        <DeleteConfirmModal
          appointment={{
            ...activeAppt,
            notifyEmail: CURRENT_USER.isOwner ? activeAppt.ownerEmail : activeAppt.ownerEmail,
          }}
          onConfirm={handleDelete}
          onClose={() => setModal('detail')}
        />
      )}

      {modal === 'invite' && (
        <InviteURLModal
          ownerEmail={CURRENT_USER.email}
          eventTitle="COMP 307 Project Check-in"
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
