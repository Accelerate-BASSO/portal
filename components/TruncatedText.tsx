"use client";

import { useState, useRef, useEffect } from "react";

interface TruncatedTextProps {
  text: string;
  className?: string;
}

export default function TruncatedText({ text, className = "" }: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [text]);

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={`text-sm leading-relaxed text-gray-text ${expanded ? "" : "line-clamp-5"}`}
      >
        {text}
      </p>
      {isTruncated && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1 text-xs text-accent-dark underline hover:text-accent-hover"
        >
          Show more
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-1 text-xs text-accent-dark underline hover:text-accent-hover"
        >
          Show less
        </button>
      )}
    </div>
  );
}
