// JOCELYNE LI (68% estimated contribution) => Feature implementation, integration work, and quality refinements
import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import '../styles/RecurrenceModal.css';
import { Modal } from './Modals';

const WEEKDAYS = [
  { code: 'MO', label: 'M', full: 'Monday' },
  { code: 'TU', label: 'T', full: 'Tuesday' },
  { code: 'WE', label: 'W', full: 'Wednesday' },
  { code: 'TH', label: 'T', full: 'Thursday' },
  { code: 'FR', label: 'F', full: 'Friday' },
  { code: 'SA', label: 'S', full: 'Saturday' },
  { code: 'SU', label: 'S', full: 'Sunday' },
];

function dateToWeekdayCode(dateString) {
  if (!dateString) return 'MO';
  const date = new Date(`${dateString}T00:00:00`);
  const dayOfWeek = date.getDay();
  const codeMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return codeMap[dayOfWeek];
}

function buildDefaultRecurrence(baseDate) {
  const weekday = dateToWeekdayCode(baseDate);

  return {
    enabled: true,
    frequency: 'weekly',
    interval: 1,
    byWeekdays: [weekday],
    endType: 'never',
    until: '',
    count: 13,
  };
}

export default function RecurrenceModal({
  isOpen,
  onClose,
  onSave,
  onRemove,
  initialRecurrence = null,
  baseDate = null,
}) {
  const [recurrence, setRecurrence] = useState(buildDefaultRecurrence(baseDate));
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (initialRecurrence?.enabled) {
      const currentDays =
        Array.isArray(initialRecurrence.byWeekdays) && initialRecurrence.byWeekdays.length > 0
          ? initialRecurrence.byWeekdays
          : [dateToWeekdayCode(baseDate)];

      setRecurrence({
        enabled: true,
        frequency: 'weekly',
        interval: Number(initialRecurrence.interval) || 1,
        byWeekdays: currentDays,
        endType: initialRecurrence.endType || 'never',
        until: initialRecurrence.until || '',
        count: Number(initialRecurrence.count) || 13,
      });
    } else {
      setRecurrence(buildDefaultRecurrence(baseDate));
    }

    setValidationError('');
  }, [isOpen, initialRecurrence, baseDate]);

  function toggleWeekday(code) {
    setRecurrence((prev) => {
      const exists = prev.byWeekdays.includes(code);

      if (exists) {
        return {
          ...prev,
          byWeekdays: prev.byWeekdays.filter((day) => day !== code),
        };
      }

      return {
        ...prev,
        byWeekdays: [...prev.byWeekdays, code],
      };
    });
  }

  function handleIntervalChange(e) {
    const raw = e.target.value;
    setRecurrence((prev) => ({
      ...prev,
      interval: raw === '' ? '' : Number(raw),
    }));
  }

  function handleCountChange(e) {
    const raw = e.target.value;
    setRecurrence((prev) => ({
      ...prev,
      count: raw === '' ? '' : Number(raw),
    }));
  }

  function handleUntilChange(e) {
    setRecurrence((prev) => ({
      ...prev,
      until: e.target.value,
    }));
  }

  function handleEndTypeChange(endType) {
    setRecurrence((prev) => ({
      ...prev,
      endType,
    }));
  }

  function validateAndSave() {
    setValidationError('');

    if (!recurrence.byWeekdays || recurrence.byWeekdays.length === 0) {
      setValidationError('Select at least one weekday.');
      return;
    }

    if (!Number.isInteger(Number(recurrence.interval)) || Number(recurrence.interval) < 1) {
      setValidationError('Repeat interval must be at least 1.');
      return;
    }

    if (recurrence.endType === 'on') {
      if (!recurrence.until) {
        setValidationError('Select an end date.');
        return;
      }

      if (baseDate) {
        const start = new Date(`${baseDate}T00:00:00`);
        const until = new Date(`${recurrence.until}T00:00:00`);

        if (until < start) {
          setValidationError('End date must be on or after the selected date.');
          return;
        }
      }
    }

    if (recurrence.endType === 'after') {
      if (!Number.isInteger(Number(recurrence.count)) || Number(recurrence.count) < 1) {
        setValidationError('Occurrences must be at least 1.');
        return;
      }
    }

    onSave({
      enabled: true,
      frequency: 'weekly',
      interval: Number(recurrence.interval),
      byWeekdays: recurrence.byWeekdays,
      endType: recurrence.endType,
      until: recurrence.endType === 'on' ? recurrence.until : '',
      count: recurrence.endType === 'after' ? Number(recurrence.count) : 13,
    });
  }

  if (!isOpen) return null;

  return (
    <Modal
      title="Custom recurrence"
      onClose={onClose}
      className="modal--recurrence"
      meta={<span className="modal-kind-pill modal-kind-pill--event">Recurring rule</span>}
      footer={
        <div className="recurrence-modal-footer-actions">
          <Button type="button" variant="text" color="error" onClick={onRemove}>
            Remove recurrence
          </Button>
          <Button type="button" variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="contained" className="recurrence-btn footer" onClick={validateAndSave}>
            Save
          </Button>
        </div>
      }
    >
      {/* <p className="recurrence-modal-subtitle">
        Set how this availability repeats.
      </p> */}
      <div className="recurrence-modal-content">
        <div className="recurrence-section">
          <label className="recurrence-label">Repeat every</label>
          <div className="recurrence-repeat-row">
            <input
              id="repeat-interval"
              type="number"
              min="1"
              value={recurrence.interval}
              onChange={handleIntervalChange}
              className="recurrence-interval-input"
            />
            <span className="recurrence-inline-label">week(s)</span>
          </div>
        </div>

        <div className="recurrence-section">
          <label className="recurrence-label">Repeat on</label>
          <div className="recurrence-weekday-chips">
            {WEEKDAYS.map(({ code, label, full }) => {
              const selected = recurrence.byWeekdays.includes(code);

              return (
                <button
                  key={code}
                  type="button"
                  className={`recurrence-weekday-chip ${selected ? 'selected' : ''}`}
                  onClick={() => toggleWeekday(code)}
                  aria-pressed={selected}
                  title={full}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="recurrence-section">
          <label className="recurrence-label">Ends</label>

          <div className="recurrence-radio-group">
            <label className="recurrence-radio-row">
              <input
                type="radio"
                name="end-type"
                value="never"
                checked={recurrence.endType === 'never'}
                onChange={() => handleEndTypeChange('never')}
              />
              <span>Never</span>
            </label>

            <label className="recurrence-radio-row">
              <input
                type="radio"
                name="end-type"
                value="on"
                checked={recurrence.endType === 'on'}
                onChange={() => handleEndTypeChange('on')}
              />
              <span>On</span>
              <input
                type="date"
                value={recurrence.until}
                onChange={handleUntilChange}
                className="recurrence-date-input"
                disabled={recurrence.endType !== 'on'}
              />
            </label>

            <label className="recurrence-radio-row">
              <input
                type="radio"
                name="end-type"
                value="after"
                checked={recurrence.endType === 'after'}
                onChange={() => handleEndTypeChange('after')}
              />
              <span>After</span>
              <input
                type="number"
                min="1"
                value={recurrence.count}
                onChange={handleCountChange}
                className="recurrence-count-input"
                disabled={recurrence.endType !== 'after'}
              />
              <span className="recurrence-inline-label">occurrence(s)</span>
            </label>
          </div>
        </div>

        {validationError && (
          <div className="recurrence-error-message">{validationError}</div>
        )}
      </div>
    </Modal>
  );
}