'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

interface FormData {
  title: string;
  description: string;
  category: string;
  submitterName: string;
  submitterEmail: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  submitterEmail?: string;
}

interface FeedbackFormProps {
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const DESC_MAX = 1000;
const DESC_MIN = 20;

export default function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    submitterName: '',
    submitterEmail: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Validation ---
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (form.title.trim().length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters';
    }

    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (form.description.trim().length < DESC_MIN) {
      newErrors.description = `Description must be at least ${DESC_MIN} characters`;
    }

    if (!form.category) {
      newErrors.category = 'Please select a category';
    }

    if (form.submitterEmail && !/^\S+@\S+\.\S+$/.test(form.submitterEmail)) {
      newErrors.submitterEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handlers ---
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setApiError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError('');

    try {
      await axios.post(`${API_URL}/api/feedback`, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        submitterName: form.submitterName.trim() || undefined,
        submitterEmail: form.submitterEmail.trim() || undefined,
      });

      onSuccess();
    } catch (err: unknown) {
      if (
        axios.isAxiosError(err) &&
        err.response?.data?.message
      ) {
        setApiError(err.response.data.message);
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Character counter state
  const descLen = form.description.length;
  const counterClass =
    descLen < DESC_MIN
      ? 'char-counter'
      : descLen > DESC_MAX * 0.9
      ? 'char-counter warn'
      : 'char-counter good';

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Title */}
      <div className="field">
        <label className="label" htmlFor="title">
          Title <span className="required">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className={`input${errors.title ? ' error-field' : ''}`}
          placeholder="e.g. Dashboard takes too long to load"
          value={form.title}
          onChange={handleChange}
          maxLength={120}
          autoComplete="off"
        />
        <div className="field-footer">
          {errors.title && (
            <span className="error-msg">⚠ {errors.title}</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="field">
        <label className="label" htmlFor="description">
          Description <span className="required">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          className={`textarea${errors.description ? ' error-field' : ''}`}
          placeholder="Describe the issue or idea in detail. The more context, the better."
          value={form.description}
          onChange={handleChange}
          maxLength={DESC_MAX}
          rows={5}
        />
        <div className="field-footer">
          {errors.description ? (
            <span className="error-msg">⚠ {errors.description}</span>
          ) : (
            <span />
          )}
          <span className={counterClass}>
            {descLen} / {DESC_MAX}
            {descLen > 0 && descLen < DESC_MIN && (
              <span style={{ color: 'var(--error)' }}>
                {' '}(min {DESC_MIN})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Category */}
      <div className="field">
        <label className="label" htmlFor="category">
          Category <span className="required">*</span>
        </label>
        <div className="select-wrap">
          <select
            id="category"
            name="category"
            className={`select${errors.category ? ' error-field' : ''}`}
            value={form.category}
            onChange={handleChange}
          >
            <option value="" disabled>Select a category…</option>
            <option value="Bug">🐛 Bug</option>
            <option value="Feature Request">✨ Feature Request</option>
            <option value="Improvement">🔧 Improvement</option>
            <option value="Other">💬 Other</option>
          </select>
        </div>
        {errors.category && (
          <div className="field-footer">
            <span className="error-msg">⚠ {errors.category}</span>
          </div>
        )}
      </div>

      {/* Optional: Name + Email */}
      <div className="row">
        <div className="field">
          <label className="label" htmlFor="submitterName">
            Your Name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="submitterName"
            name="submitterName"
            type="text"
            className="input"
            placeholder="Jane Doe"
            value={form.submitterName}
            onChange={handleChange}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="submitterEmail">
            Email <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="submitterEmail"
            name="submitterEmail"
            type="email"
            className={`input${errors.submitterEmail ? ' error-field' : ''}`}
            placeholder="jane@example.com"
            value={form.submitterEmail}
            onChange={handleChange}
          />
          {errors.submitterEmail && (
            <div className="field-footer">
              <span className="error-msg">⚠ {errors.submitterEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div className="api-error">
          <span>⚠</span>
          <span>{apiError}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="btn-submit"
        disabled={loading}
      >
        <span className="btn-inner">
          {loading ? (
            <>
              <span className="spinner" />
              Submitting…
            </>
          ) : (
            <>
              <span>Send Feedback</span>
              <span>→</span>
            </>
          )}
        </span>
      </button>
    </form>
  );
}