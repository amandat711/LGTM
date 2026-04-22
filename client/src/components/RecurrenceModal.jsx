import React, { useState, useEffect } from 'react';
import '../styles/RecurrenceModal.css';

const WEEKDAYS = [
  { code: 'MO', label: 'M' },
  { code: 'TU', label: 'T' },
  { code: 'WE', label: 'W' },
  { code: 'TH', label: 'T' },
  { code: 'FR', label: 'F' },
  { code: 'SA', label: 'S' },
  { code: 'SU', label: 'S' },
];

function dateToWeekdayCode(dateString) {
  // dateString is YYYY-MM-DD format
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const codeMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return codeMap[dayOfWeek];
}

export default function RecurrenceModal({
  isOpen,
  onClose,
  onSave,
  initialRecurrence = null,
  baseDate = null,
}) {
  const [recurrence, setRecurrence] = useState({
    enabled: false,
    frequency: 'weekly',
    interval: 1,
    byWeekdays: [],
    endType: 'never', // 'never' | 'on' | 'after'
    until: '',
    count: 13,
  });

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialRecurrence?.enabled) {
        setRecurrence(initialRecurrence);
      } else {
        // Initialize with base date's weekday pre-selected
        const defaultByWeekdays = baseDate
          ? [dateToWeekdayCode(baseDate)]
          : [];
        
        setRecurrence({
          enabled: false,
          frequency: 'weekly',
          interval: 1,
          byWeekdays: defaultByWeekdays,
          endType: 'never',
          until: '',
          count: 13,
        });
      }
      setValidationError('');
    }
  }, [isOpen, initialRecurrence, baseDate]);

  function toggleWeekday(code) {
    setRecurrence((prev) => {
      const newByWeekdays = prev.byWeekdays.includes(code)
        ? prev.byWeekdays.filter((c) => c !== code)
        : [...prev.byWeekdays, code];
      return { ...prev, byWeekdays: newByWeekdays };
    });
  }

  function handleIntervalChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setRecurrence((prev) => ({ ...prev, interval: val }));
    }
  }

  function handleCountChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setRecurrence((prev) => ({ ...prev, count: val }));
    }
  }

  function handleUntilChange(e) {
    setRecurrence((prev) => ({ ...prev, until: e.target.value }));
  }

  function handleEndTypeChange(endType) {
    setRecurrence((prev) => ({ ...prev, endType }));
  }

  function validateAndSave() {
    setValidationError('');

    // If recurrence is disabled, just save as-is
    if (!recurrence.enabled) {
      onSave({ ...recurrence, enabled: false });
      onClose();
      return;
    }

    // Validate enabled recurrence
    if (recurrence.byWeekdays.length === 0) {
      setValidationError('Select at least one weekday');
      return;
    }

    if (recurrence.interval < 1) {
      setValidationError('Interval must be at least 1');
      return;
    }

    if (recurrence.endType === 'on' && !recurrence.until) {
      setValidationError('Select an end date');
      return;
    }

    if (recurrence.endType === 'on') {
      const untilDate = new Date(recurrence.until + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (untilDate < today) {
        setValidationError('End date must be in the future');
        return;
      }
    }

    if (recurrence.endType === 'after' && recurrence.count < 1) {
      setValidationError('Occurrences must be at least 1');
      return;
    }

    onSave(recurrence);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="recurrence-modal-overlay" onClick={onClose}>
      <div className="recurrence-modal" onClick={(e) => e.stopPropagation()}>
        <div className="recurrence-modal-header">
          <h3>Custom recurrence</h3>
          <button
            type="button"
            className="recurrence-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="recurrence-modal-content">
          {/* Enable/Disable Recurrence */}
          <div className="recurrence-section">
            <label className="recurrence-checkbox-label">
              <input
                type="checkbox"
                checked={recurrence.enabled}
                onChange={(e) =>
                  setRecurrence((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />
              Repeat
            </label>
          </div>

          {recurrence.enabled && (
            <>
              {/* Repeat Interval */}
              <div className="recurrence-section">
                <div className="recurrence-repeat-row">
                  <label htmlFor="repeat-interval">Repeat every</label>
                  <input
                    id="repeat-interval"
                    type="number"
                    min="1"
                    value={recurrence.interval}
                    onChange={handleIntervalChange}
                    className="recurrence-interval-input"
                  />
                  <select disabled className="recurrence-frequency-select">
                    <option>week(s)</option>
                  </select>
                </div>
              </div>

              {/* Weekday Selection */}
              <div className="recurrence-section">
                <label className="recurrence-label">Repeat on</label>
                <div className="recurrence-weekday-chips">
                  {WEEKDAYS.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      className={`recurrence-weekday-chip ${
                        recurrence.byWeekdays.includes(code) ? 'selected' : ''
                      }`}
                      onClick={() => toggleWeekday(code)}
                      aria-pressed={recurrence.byWeekdays.includes(code)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* End Options */}
              <div className="recurrence-section">
                <label className="recurrence-label">Ends</label>

                <div className="recurrence-radio-group">
                  <label className="recurrence-radio-label">
                    <input
                      type="radio"
                      name="end-type"
                      value="never"
                      checked={recurrence.endType === 'never'}
                      onChange={() => handleEndTypeChange('never')}
                    />
                    Never
                  </label>

                  <label className="recurrence-radio-label">
                    <input
                      type="radio"
                      name="end-type"
                      value="on"
                      checked={recurrence.endType === 'on'}
                      onChange={() => handleEndTypeChange('on')}
                    />
                    On
                    {recurrence.endType === 'on' && (
                      <input
                        type="date"
                        value={recurrence.until}
                        onChange={handleUntilChange}
                        className="recurrence-date-input"
                        style={{ marginLeft: '8px' }}
                      />
                    )}
                  </label>

                  <label className="recurrence-radio-label">
                    <input
                      type="radio"
                      name="end-type"
                      value="after"
                      checked={recurrence.endType === 'after'}
                      onChange={() => handleEndTypeChange('after')}
                    />
                    After
                    {recurrence.endType === 'after' && (
                      <>
                        <input
                          type="number"
                          min="1"
                          value={recurrence.count}
                          onChange={handleCountChange}
                          className="recurrence-count-input"
                          style={{ marginLeft: '8px', width: '60px' }}
                        />
                        <span style={{ marginLeft: '8px' }}>occurrences</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="recurrence-error-message">{validationError}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="recurrence-modal-footer">
          <button
            type="button"
            className="recurrence-btn secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="recurrence-btn primary"
            onClick={validateAndSave}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
