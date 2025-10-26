// UI Components
export { Modal, useModal } from './Modal';
export { StatsCard, createPatientStats, createInventoryStats } from './StatsCard';
export { DataTable } from './DataTable';
export type { Column, TableAction, BulkAction } from './DataTable';
export { Button } from './Button';
export { Input } from './Input';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
export { Textarea } from './Textarea';
export { Badge } from './Badge';
export { Checkbox } from './Checkbox';
export { Radio, RadioGroup } from './Radio';
export { Spinner, Loading } from './Spinner';
export { DatePicker } from './DatePicker';
// Toast components and hooks
export { ToastProvider, useToast, useToastHelpers } from './Toast';
export type { Toast } from './Toast';

// Tabs components
export { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

// Autocomplete component
export { Autocomplete } from './Autocomplete';
export type { AutocompleteProps, AutocompleteOption } from './Autocomplete';

// MultiSelect component
export { MultiSelect } from './MultiSelect';
export type { MultiSelectProps, MultiSelectOption } from './MultiSelect';

// FileUpload component
export { FileUpload } from './FileUpload';
export type { FileUploadProps, FileUploadFile } from './FileUpload';

// SGK helpers
export { default as PdfPreviewModal } from './PdfPreviewModal';
export { default as SgkMultiUpload } from './SgkMultiUpload';

// Pagination components
export { Pagination, SimplePagination } from './Pagination';
export type { PaginationProps, SimplePaginationProps } from './Pagination';

// Additional UI Components
export { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
export { Alert, AlertDescription } from './Alert';
export { Tooltip } from './Tooltip';
export { Dropdown } from './Dropdown';
export { Box } from './Box';
export { Text } from './Text';
export { FormControl } from './FormControl';
export { FormLabel } from './FormLabel';
export { HStack, VStack } from './Stack';
export { SimpleGrid } from './Grid';
export { AlertIcon } from './AlertIcon';

// Dialog Components (using Modal as base)
export { Modal as Dialog } from './Modal';
export { Modal as DialogContent } from './Modal';
export { Modal as DialogHeader } from './Modal';
export { Modal as DialogTitle } from './Modal';

// Label Component
export { Label } from './Label';

// Layout Components
export { Header } from '../layout/Header';
export { Sidebar } from '../layout/Sidebar';
export { default as Layout } from '../layout/Layout';

// Form Components
export { DynamicForm } from '../forms/DynamicForm';
export type { FormField as DynamicFormField, FormSection as DynamicFormSection } from '../forms/DynamicForm';