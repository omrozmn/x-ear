import { Button as UIButton } from '@x-ear/ui-web';
import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<Props> = ({ variant = 'primary', children, ...rest }) => {
  const base = 'px-3 py-1 rounded text-sm';
  const cls =
    variant === 'primary'
      ? `${base} bg-blue-600 text-white hover:bg-blue-700`
      : variant === 'secondary'
      ? `${base} bg-gray-100 text-gray-900`
      : `${base} bg-transparent`;
  return (
    <UIButton className={cls} {...rest} variant='default'>
      {children}
    </UIButton>
  );
};

export default Button;
