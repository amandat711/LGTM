import { useEffect, useState } from 'react';
import { Modal } from './Modals';
import { getCalendarSyncFeed, rotateCalendarSyncFeed } from '../api/calendarSync';

export default function SyncCalendarModal({ open, onClose }) {
  const [busy, setBusy] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [requiresRotation, setRequiresRotation] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function load() {
      setBusy(true);
      setError('');
      setCopied(false);
      try {
        const data = await getCalendarSyncFeed();
        if (!mounted) return;
        setFeedUrl(data.feed_url || '');
        setRequiresRotation(Boolean(data.requires_rotation) || !data.feed_url);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Could not load sync link.');
      } finally {
        if (mounted) setBusy(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [open]);

  async function handleRotate() {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      const data = await rotateCalendarSyncFeed();
      setFeedUrl(data.feed_url || '');
      setRequiresRotation(false);
    } catch (e) {
      setError(e?.message || 'Could not regenerate sync link.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!feedUrl || busy) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy link. You can still copy it manually.');
    }
  }

  if (!open) return null;

  return (
    <Modal
      title="Sync Calendar"
      onClose={() => !busy && onClose()}
      className="sync-calendar-modal"
      footer={
        <>
          <button type="button" className="button button-ghost" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={handleRotate}
            disabled={busy}
            title="Generate a new private sync link"
          >
            {busy ? 'Working…' : requiresRotation ? 'Generate link' : 'Regenerate link'}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleCopy}
            disabled={busy || !feedUrl}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </>
      }
    >
      <p className="export-calendar-intro">
        Subscribe once in Google Calendar or Outlook and your LGTM appointments/events will update automatically
        when those providers refresh your feed.
      </p>

      <div className="sync-calendar-url-block">
        <p className="sync-calendar-url-label">Private calendar URL</p>
        <input className="copy-input sync-calendar-url-input" readOnly value={feedUrl || ''} placeholder={busy ? 'Loading link…' : 'No link yet'} />
      </div>

      <div className="sync-calendar-instructions">
        <p><strong>Google Calendar:</strong> Settings → Add calendar → From URL → paste link.</p>
        <p><strong>Outlook:</strong> Add calendar → Subscribe from web / Internet calendar → paste link.</p>
      </div>

      <p className="sync-calendar-note">
        Regenerating this link disables the old one. Provider sync is periodic and may not appear instantly.
      </p>

      {error ? <p className="export-calendar-error">{error}</p> : null}
    </Modal>
  );
}
