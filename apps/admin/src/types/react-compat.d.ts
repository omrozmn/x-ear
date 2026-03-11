/**
 * React 19 Type Compatibility Shim
 * 
 * This file provides type compatibility for UI components that haven't been
 * updated to React 19 yet. This is a temporary solution until the @x-ear/ui-web
 * package is updated with React 19 compatible types.
 */

declare module '@x-ear/ui-web' {
  import { FC, ForwardRefExoticComponent, RefAttributes } from 'react';

  // Button component
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'link' | 'destructive' | 'outline' | 'success' | 'danger';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    fullWidth?: boolean;
  }
  export const Button: FC<ButtonProps>;

  // Input component
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    error?: string;
    fullWidth?: boolean;
  }
  export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;

  // Select component
  export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options?: Array<{ value: string; label: string; disabled?: boolean }>;
    error?: string;
    fullWidth?: boolean;
    placeholder?: string;
  }
  export const Select: ForwardRefExoticComponent<SelectProps & RefAttributes<HTMLSelectElement>>;

  // Textarea component
  export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
  export const Textarea: ForwardRefExoticComponent<TextareaProps & RefAttributes<HTMLTextAreaElement>>;

  // Badge component
  export interface BadgeProps {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger';
    className?: string;
    children?: React.ReactNode;
  }
  export const Badge: FC<BadgeProps>;

  // Card components
  export interface CardProps {
    className?: string;
    children?: React.ReactNode;
  }
  export const Card: FC<CardProps>;
  
  export interface CardHeaderProps {
    className?: string;
    children?: React.ReactNode;
  }
  export const CardHeader: FC<CardHeaderProps>;
  
  export interface CardTitleProps {
    className?: string;
    children?: React.ReactNode;
  }
  export const CardTitle: FC<CardTitleProps>;
  
  export interface CardContentProps {
    className?: string;
    children?: React.ReactNode;
  }
  export const CardContent: FC<CardContentProps>;

  // Spinner component
  export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  export const Spinner: FC<SpinnerProps>;

  // Alert components
  export interface AlertProps {
    variant?: 'default' | 'destructive';
    className?: string;
    children?: React.ReactNode;
  }
  export const Alert: FC<AlertProps>;
  
  export interface AlertDescriptionProps {
    className?: string;
    children?: React.ReactNode;
  }
  export const AlertDescription: FC<AlertDescriptionProps>;

  // DatePicker component
  export interface DatePickerProps {
    value?: Date | null | undefined;
    onChange?: (date: Date | null | undefined) => void;
    placeholder?: string;
    className?: string;
  }
  export const DatePicker: FC<DatePickerProps>;

  // Pagination component
  export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
  }
  export const Pagination: FC<PaginationProps>;

  // Additional exports
  export interface Column<T = unknown> {
    key: string;
    title: string | React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: unknown, record: T, index: number) => React.ReactNode;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    fixed?: 'left' | 'right';
  }

  export interface DataTableProps<T = unknown> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    pagination?: {
      current: number;
      pageSize: number;
      total: number;
      showSizeChanger?: boolean;
      pageSizeOptions?: number[];
      onChange: (page: number, pageSize: number) => void;
    };
    rowKey?: string | ((record: T) => string | number);
    emptyText?: string;
    size?: 'small' | 'medium' | 'large';
    bordered?: boolean;
    striped?: boolean;
    hoverable?: boolean;
    className?: string;
    onRowClick?: (record: T) => void;
    responsive?: boolean;
    sortable?: boolean;
    onSort?: (key: string, direction: 'asc' | 'desc' | null) => void;
  }
  export const DataTable: <T extends Record<string, unknown>>(props: DataTableProps<T>) => React.ReactElement | null;

  export interface LabelProps {
    htmlFor?: string;
    className?: string;
    children?: React.ReactNode;
  }
  export const Label: FC<LabelProps>;
}
