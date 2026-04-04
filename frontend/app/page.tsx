'use client';

import { useState } from 'react';
import FeedbackForm from '@/components/FeedbackForm';
import SuccessCard from '@/components/SuccessCard';
import './home.css';

export default function HomePage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="page-root">
      {/* Background grid texture */}
      <div className="bg-grid" aria-hidden="true" />

      {/* Floating accent blobs */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo-mark">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">FeedPulse</span>
          </div>
          <p className="tagline">Your voice shapes the product.</p>
        </header>

        {/* Card */}
        <div className="card">
          {submitted ? (
            <SuccessCard onReset={() => setSubmitted(false)} />
          ) : (
            <>
              <div className="card-header">
                <h1 className="card-title">Share Your Feedback</h1>
                <p className="card-subtitle">
                  Got a bug to report, a feature idea, or a suggestion?
                  We read every submission.
                </p>
              </div>
              <FeedbackForm onSuccess={() => setSubmitted(true)} />
            </>
          )}
        </div>

        <footer className="footer">
          <p>Built with care · FeedPulse © {new Date().getFullYear()}</p>
        </footer>
      </div>

    </main>
  );
}