import React from 'react';

export function getStatusColors(
  isError: boolean,
  isWarning: boolean
): {
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
} {
  if (isError) {
    return {
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-900',
      iconColor: 'text-rose-600',
    };
  }

  if (isWarning) {
    return {
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-700',
    };
  }

  return {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    iconColor: 'text-blue-700',
  };
}

// Note: This returns SVG *content* (e.g., <path />), not a full <svg>.
// AIFeatureWrapper renders it inside its own <svg>.
export function getStatusIcon(isError: boolean, isWarning: boolean): React.ReactElement {
  if (isError) {
    return (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-11a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zm0 9a1 1 0 100-2 1 1 0 000 2z"
      />
    );
  }

  if (isWarning) {
    return (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.593c.75 1.334-.213 3.008-1.742 3.008H3.48c-1.53 0-2.492-1.674-1.742-3.008L8.257 3.1zM10 6a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1zm0 9a1 1 0 100-2 1 1 0 000 2z"
      />
    );
  }

  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 10-1.5 0v.5a.75.75 0 001.5 0v-.5zM9 9a1 1 0 012 0v5a1 1 0 11-2 0V9z"
    />
  );
}

function baseIconProps() {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function InfoIcon(): React.ReactElement {
  return (
    <svg {...baseIconProps()} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function CloseIcon(): React.ReactElement {
  return (
    <svg {...baseIconProps()} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PendingIcon(): React.ReactElement {
  return (
    <svg {...baseIconProps()} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function CheckIcon(): React.ReactElement {
  return (
    <svg {...baseIconProps()} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
