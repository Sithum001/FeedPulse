'use client';

interface SuccessCardProps {
  onReset: () => void;
}

export default function SuccessCard({ onReset }: SuccessCardProps) {
  return (
    <div className="success-wrap">
      <div className="success-icon-wrap">
        <span>✓</span>
      </div>

      <div>
        <h2 className="success-title">Feedback Received!</h2>
      </div>

      <p className="success-body">
        Thanks for taking the time to share your thoughts.
        Our AI is analyzing your submission right now — your input
        helps shape what we build next.
      </p>

      <div className="ai-badge">
        <span>⚡</span>
        <span>AI analysis running in the background</span>
      </div>

      <button className="btn-reset" onClick={onReset}>
        Submit another
      </button>
    </div>
  );
}