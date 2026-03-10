import { Button as UIButton } from '@x-ear/ui-web';
import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<Props> = ({ variant = 'primary', size = 'md', children, style, className = '', ...rest }) => {
  const base = 'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none';

  const sizeCls =
    size === 'sm' ? 'px-2 py-1 text-xs' :
      size === 'lg' ? 'px-6 py-3 text-base' :
        'px-4 py-2 text-sm';

  const variantCls =
    variant === 'primary' ? 'premium-gradient tactile-press text-white' :
      variant === 'secondary' ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' :
        variant === 'outline' ? 'border border-gray-200 bg-transparent hover:bg-gray-50 text-gray-700' :
          variant === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
            'bg-transparent hover:bg-gray-100 text-gray-600';

  const cls = `${base} ${sizeCls} ${variantCls} ${className}`;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <UIButton className={cls} {...rest} style={style as any} variant='default'>
      {children}
    </UIButton>
  );
};

export default Button;
