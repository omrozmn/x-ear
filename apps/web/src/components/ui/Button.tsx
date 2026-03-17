import { Button as UIButton } from '@x-ear/ui-web';
import React from 'react';

type UIButtonProps = React.ComponentProps<typeof UIButton>;

type Props = Omit<UIButtonProps, 'variant'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'success' | 'danger' | 'default';
};

/**
 * Local Button wrapper that delegates to @x-ear/ui-web Button.
 * Maps variant names 1:1 so the design system stays consistent.
 */
export const Button: React.FC<Props> = ({ variant = 'primary', ...rest }) => {
  return <UIButton variant={variant} {...rest} />;
};

export default Button;
