import React from 'react';

interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchTerm,
  className = '',
  highlightClassName = 'bg-yellow-200 font-semibold'
}) => {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters in search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
  
  // Split text by matches
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part matches the search term (case-insensitive)
        const isMatch = regex.test(part);
        regex.lastIndex = 0; // Reset regex for next test
        
        return isMatch ? (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
};

interface FuzzySearchHighlightProps {
  text: string;
  matches: Array<{
    type: string;
    startIndex: number;
    endIndex: number;
    relevance: number;
  }>;
  className?: string;
  highlightClassName?: string;
}

export const FuzzySearchHighlight: React.FC<FuzzySearchHighlightProps> = ({
  text,
  matches,
  className = '',
  highlightClassName = 'bg-yellow-200 font-semibold'
}) => {
  if (!matches || matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort matches by start index
  const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMatches.forEach((match, index) => {
    // Add text before the match
    if (match.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, match.startIndex)}
        </span>
      );
    }

    // Add the highlighted match
    const matchText = text.slice(match.startIndex, match.endIndex + 1);
    const relevanceClass = getRelevanceHighlightClass(match.relevance);
    
    parts.push(
      <mark 
        key={`match-${index}`} 
        className={`${highlightClassName} ${relevanceClass}`}
        title={`Relevance: ${Math.round(match.relevance * 100)}%`}
      >
        {matchText}
      </mark>
    );

    lastIndex = match.endIndex + 1;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <span className={className}>{parts}</span>;
};

function getRelevanceHighlightClass(relevance: number): string {
  if (relevance >= 0.8) return 'bg-green-200 border-green-300';
  if (relevance >= 0.6) return 'bg-yellow-200 border-yellow-300';
  if (relevance >= 0.4) return 'bg-orange-200 border-orange-300';
  return 'bg-red-200 border-red-300';
}