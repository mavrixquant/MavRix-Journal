import { useEffect, useRef, useState } from 'react';
import {
  Bug,
  X,
  Upload,
  ImagePlus,
  Trash2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useSubmitBugReport } from '@/shared/api/bugReport';
import './BugReportModal.css';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const CATEGORIES = [
  { value: 'bug',         label: 'Bug' },
  { value: 'feature',     label: 'Feature request' },
  { value: 'performance', label: 'Performance issue' },
  { value: 'other',       label: 'Other' },
];

const SEVERITIES = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function BugReportModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('medium');
  const [image, setImage] = useState(null); // { dataUrl, base64, name, size }
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const submitMutation = useSubmitBugReport();
  const submitting = submitMutation.isPending;

  // Reset state on open
  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setCategory('bug');
    setSeverity('medium');
    setImage(null);
    setError('');
    setSuccess(false);
    setDragOver(false);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, submitting, onClose]);

  // Global paste capture while the modal is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((i) => i.type && i.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) processImageFile(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [isOpen]);

  if (!isOpen) return null;

  function processImageFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported image type. Use PNG, JPG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)} MB or smaller.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      const comma = dataUrl.indexOf(',');
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : '';
      if (!base64) {
        setError('Could not read the image.');
        return;
      }
      setImage({
        dataUrl,
        base64,
        name: file.name || 'pasted-image.png',
        size: file.size,
      });
      setError('');
    };
    reader.onerror = () => setError('Could not read the image.');
    reader.readAsDataURL(file);
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processImageFile(file);
  };
  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeImage = () => setImage(null);

  const canSubmit =
    !submitting &&
    title.trim().length >= 3 &&
    description.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');

    try {
      await submitMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        image: image ? { base64: image.base64, name: image.name } : null,
      });
      setSuccess(true);
      toast.success('Bug report submitted. Thank you!');
      setTimeout(() => onClose(), 1400);
    } catch (err) {
      setError(err?.message || 'Could not submit the report.');
    }
  };

  return (
    <Portal>
      <div
        className="bugr-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
      >
        <form
          className="bugr-modal"
          onSubmit={handleSubmit}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bugr-title"
        >
          <div className="bugr-head">
            <div className="bugr-head-icon">
              <Bug size={18} />
            </div>
            <div className="bugr-head-meta">
              <h2 id="bugr-title" className="bugr-title">Report a bug</h2>
              <p className="bugr-sub">
                Your report is emailed to the team and stored for review.
                Screenshots are emailed only — never saved on the server.
              </p>
            </div>
            <button
              type="button"
              className="bugr-close"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="bugr-body">
            {error && <div className="bugr-error">{error}</div>}
            {success && (
              <div className="bugr-success">
                <CheckCircle2 size={13} />
                <span>Thanks! Your report was submitted.</span>
              </div>
            )}

            <div className="bugr-field">
              <label className="bugr-label" htmlFor="bugr-title-input">
                <span>Title</span>
                <span className="bugr-label-hint">{title.length}/200</span>
              </label>
              <input
                id="bugr-title-input"
                className="bugr-input"
                type="text"
                value={title}
                maxLength={200}
                disabled={submitting || success}
                autoFocus
                placeholder="Brief summary of the issue"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="bugr-grid-2">
              <div className="bugr-field">
                <label className="bugr-label" htmlFor="bugr-category">
                  <span>Category</span>
                </label>
                <select
                  id="bugr-category"
                  className="bugr-select"
                  value={category}
                  disabled={submitting || success}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="bugr-field">
                <label className="bugr-label" htmlFor="bugr-severity">
                  <span>Severity</span>
                </label>
                <select
                  id="bugr-severity"
                  className="bugr-select"
                  value={severity}
                  disabled={submitting || success}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bugr-field">
              <label className="bugr-label" htmlFor="bugr-description">
                <span>Description</span>
                <span className="bugr-label-hint">{description.length}/5000</span>
              </label>
              <textarea
                id="bugr-description"
                className="bugr-textarea"
                value={description}
                maxLength={5000}
                disabled={submitting || success}
                placeholder="What did you expect? What actually happened? Steps to reproduce…"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="bugr-field">
              <div className="bugr-label">
                <span>Screenshot</span>
                <span className="bugr-label-hint">optional · 4 MB max · not saved</span>
              </div>

              {!image && (
                <div
                  className={`bugr-drop${dragOver ? ' is-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !submitting && !success && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div className="bugr-drop-icon">
                    <Upload size={20} />
                  </div>
                  <div className="bugr-drop-title">
                    Drag &amp; drop an image, or click to browse
                  </div>
                  <div className="bugr-drop-hint">
                    You can also <b>paste</b> from your clipboard (Ctrl+V / ⌘V).
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    style={{ display: 'none' }}
                    onChange={handleFilePick}
                  />
                </div>
              )}

              {image && (
                <div className="bugr-preview">
                  <img
                    src={image.dataUrl}
                    alt="Screenshot preview"
                    className="bugr-preview-img"
                  />
                  <div className="bugr-preview-meta">
                    <span className="bugr-preview-name" title={image.name}>
                      <ImagePlus size={11} /> {image.name}
                    </span>
                    <span className="bugr-preview-size">
                      {(image.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="bugr-preview-remove"
                    onClick={removeImage}
                    disabled={submitting || success}
                    aria-label="Remove screenshot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bugr-foot">
            <button
              type="button"
              className="bugr-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bugr-btn bugr-btn-primary"
              disabled={!canSubmit || success}
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="bugr-spinner" />
                  <span>Submitting…</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Submitted</span>
                </>
              ) : (
                <>
                  <Bug size={12} />
                  <span>Submit report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}