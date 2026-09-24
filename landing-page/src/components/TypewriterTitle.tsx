import React, { useState, useEffect } from 'react';

interface TypewriterTitleProps {
  phrases: string[];
}

export const TypewriterTitle: React.FC<TypewriterTitleProps> = ({ phrases }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (phrases.length === 0) return;

    const currentPhrase = phrases[index % phrases.length];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && subIndex < currentPhrase.length) {
      timer = setTimeout(() => setSubIndex((prev) => prev + 1), 80);
    } else if (!isDeleting && subIndex === currentPhrase.length) {
      timer = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && subIndex > 0) {
      timer = setTimeout(() => setSubIndex((prev) => prev - 1), 45);
    } else if (isDeleting && subIndex === 0) {
      setIsDeleting(false);
      setIndex((prev) => prev + 1);
    }

    return () => clearTimeout(timer);
  }, [subIndex, isDeleting, index, phrases]);

  return (
    <span className="lp-gradient-text" style={{ display: 'inline-block', position: 'relative' }}>
      {phrases[index % phrases.length].substring(0, subIndex)}
      <span className="typewriter-blink-cursor">|</span>
    </span>
  );
};
