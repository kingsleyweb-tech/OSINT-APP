import React, { useState, useEffect } from 'react';
import '../../styles/CoilingSnakeLoader.css';

interface CoilingSnakeLoaderProps {
  query: string;
  searchType: string;
}

const PROGRESS_STEPS = [
  'Initializing OSINT intelligence engine...',
  'Scanning public registries & social networks...',
  'Analyzing username matches & digital footprints...',
  'Cross-referencing identity databases...',
  'Mapping association graphs & connections...',
  'Compiling source intelligence & profiles...',
  'Synthesizing final target dossier...',
];

export const CoilingSnakeLoader: React.FC<CoilingSnakeLoaderProps> = ({ query, searchType }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(stepInterval);
  }, []);

  // Smooth progress animation
  useEffect(() => {
    const targetPercent = ((stepIndex + 1) / PROGRESS_STEPS.length) * 100;
    const animInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= targetPercent) {
          clearInterval(animInterval);
          return targetPercent;
        }
        return prev + 0.5;
      });
    }, 30);
    return () => clearInterval(animInterval);
  }, [stepIndex]);

  return (
    <div className="snake-fullpage-overlay">
      {/* Ambient background particles */}
      <div className="snake-bg-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`particle p-${(i % 5) + 1}`} style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }} />
        ))}
      </div>

      {/* Radar pulse rings (behind everything) */}
      <div className="snake-radar-rings">
        <div className="radar-ring r1" />
        <div className="radar-ring r2" />
        <div className="radar-ring r3" />
        <div className="radar-ring r4" />
      </div>

      {/* Main content */}
      <div className="snake-loader-content">
        {/* Giant Snake SVG */}
        <div className="snake-giant-container">
          <svg className="snake-giant-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6a00" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
              <linearGradient id="sg2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="sg3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c2652b" />
                <stop offset="100%" stopColor="#ff8c42" />
              </linearGradient>
              <filter id="snakeGlow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
            </defs>

            {/* Background track */}
            <circle cx="100" cy="100" r="85" className="snake-track" />
            <circle cx="100" cy="100" r="65" className="snake-track" />
            <circle cx="100" cy="100" r="45" className="snake-track" />

            {/* Glowing shadow coils */}
            <path d="M 100,15 A 85,85 0 1,1 15,100 A 85,85 0 0,1 100,15" className="snake-glow-path glow-1" filter="url(#snakeGlow)" />
            <path d="M 100,35 A 65,65 0 1,0 165,100 A 65,65 0 0,0 100,35" className="snake-glow-path glow-2" filter="url(#snakeGlow)" />

            {/* Main coil paths */}
            <path d="M 100,15 A 85,85 0 1,1 15,100 A 85,85 0 0,1 100,15" className="snake-main-coil coil-outer" />
            <path d="M 100,35 A 65,65 0 1,0 165,100 A 65,65 0 0,0 100,35" className="snake-main-coil coil-mid" />
            <path d="M 100,55 A 45,45 0 1,1 55,100 A 45,45 0 0,1 100,55" className="snake-main-coil coil-inner" />
            <path d="M 100,68 A 32,32 0 1,0 132,100 A 32,32 0 0,0 100,68" className="snake-main-coil coil-core" />

            {/* Snake head dots */}
            <circle cx="100" cy="15" r="5" className="snake-head head-1" />
            <circle cx="165" cy="100" r="4" className="snake-head head-2" />
            <circle cx="55" cy="100" r="3.5" className="snake-head head-3" />

            {/* Pulsating center eye */}
            <circle cx="100" cy="100" r="10" className="snake-eye-outer" />
            <circle cx="100" cy="100" r="5" className="snake-eye-inner" />
          </svg>
        </div>

        {/* Target info */}
        <div className="snake-target-info">
          <div className="snake-scanning-badge">
            <span className="scanning-dot" />
            <span>SCANNING TARGET</span>
          </div>
          <h2 className="snake-target-name">"{query}"</h2>
          <span className="snake-target-type">{searchType} Search</span>
        </div>

        {/* Progress section */}
        <div className="snake-progress-section">
          <div className="snake-progress-track">
            <div className="snake-progress-fill" style={{ width: `${progressPercent}%` }}>
              <div className="snake-progress-glow" />
            </div>
          </div>
          <div className="snake-progress-meta">
            <span className="snake-progress-percent">{Math.round(progressPercent)}%</span>
            <span className="snake-step-counter">Step {stepIndex + 1} of {PROGRESS_STEPS.length}</span>
          </div>
          <p className="snake-progress-text">
            {PROGRESS_STEPS[stepIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};
