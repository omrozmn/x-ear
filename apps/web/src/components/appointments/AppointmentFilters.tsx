import React, { useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  DatePicker,
  Badge,
  VStack,
  HStack,
} from '@x-ear/ui-web';
import { AppointmentStatus, AppointmentType, AppointmentFilters as IAppointmentFilters } from '../../types/appointment';

// Filter schema for validation
const filterSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'])).optional(),
  type: z.array(z.enum(['consultation', 'follow-up', 'hearing-test', 'device-trial'])).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clinician: z.string().optional(),
  branchId: z.string().optional(),
  patientId: z.string().optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

interface AppointmentFiltersProps {
  onFiltersChange: (filters: IAppointmentFilters) => void;
  initialFilters?: IAppointmentFilters;
  isLoading?: boolean;
  className?: string;
}

// Status options with labels and colors
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: 'default' },
  { value: 'confirmed', label: 'Confirmed', color: 'success' },
  { value: 'completed', label: 'Completed', color: 'secondary' },
  { value: 'cancelled', label: 'Cancelled', color: 'danger' },
  { value: 'no_show', label: 'No Show', color: 'warning' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'warning' },
] as const;

// Type options with labels
const TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow Up' },
  { value: 'hearing-test', label: 'Hearing Test' },
  { value: 'device-trial', label: 'Device Trial' },
] as const;

// Mock clinician options (in real app, this would come from API)
const CLINICIAN_OPTIONS = [
  { value: 'dr-smith', label: 'Dr. Smith' },
  { value: 'dr-johnson', label: 'Dr. Johnson' },
  { value: 'dr-williams', label: 'Dr. Williams' },
  { value: 'dr-brown', label: 'Dr. Brown' },
] as const;

// Mock branch options (in real app, this would come from API)
const BRANCH_OPTIONS = [
  { value: 'main', label: 'Main Branch' },
  { value: 'north', label: 'North Branch' },
  { value: 'south', label: 'South Branch' },
  { value: 'east', label: 'East Branch' },
] as const;

export const AppointmentFilters: React.FC<AppointmentFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  isLoading = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>(
    initialFilters.status ? [initialFilters.status] : []
  );
  const [selectedTypes, setSelectedTypes] = useState<AppointmentType[]>(
    initialFilters.type ? [initialFilters.type] : []
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: initialFilters.search || '',
      status: initialFilters.status ? [initialFilters.status] : [],
      type: initialFilters.type ? [initialFilters.type] : [],
      startDate: initialFilters.startDate || '',
      endDate: initialFilters.endDate || '',
      clinician: initialFilters.clinician || '',
      branchId: initialFilters.branchId || '',
      patientId: initialFilters.patientId || '',
    },
  });

  // Watch form values for real-time filtering
  const watchedValues = watch();

  // Apply filters
  const applyFilters = useCallback((data: FilterFormData) => {
    const filters: IAppointmentFilters = {
      search: data.search || undefined,
      status: data.status?.[0] || undefined,
      type: data.type?.[0] || undefined,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      clinician: data.clinician || undefined,
      branchId: data.branchId || undefined,
      patientId: data.patientId || undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    ) as IAppointmentFilters;

    onFiltersChange(cleanFilters);
  }, [onFiltersChange]);

  // Handle form submission
  const onSubmit = handleSubmit(applyFilters);

  // Clear all filters
  const clearFilters = useCallback(() => {
    reset({
      search: '',
      status: [],
      type: [],
      startDate: '',
      endDate: '',
      clinician: '',
      branchId: '',
      patientId: '',
    });
    setSelectedStatuses([]);
    setSelectedTypes([]);
    onFiltersChange({});
  }, [reset, onFiltersChange]);

  // Handle status selection
  const handleStatusToggle = useCallback((status: AppointmentStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    setValue('status', newStatuses, { shouldDirty: true });
  }, [selectedStatuses, setValue]);

  // Handle type selection
  const handleTypeToggle = useCallback((type: AppointmentType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    setSelectedTypes(newTypes);
    setValue('type', newTypes, { shouldDirty: true });
  }, [selectedTypes, setValue]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (watchedValues.search) count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedTypes.length > 0) count++;
    if (watchedValues.startDate) count++;
    if (watchedValues.endDate) count++;
    if (watchedValues.clinician) count++;
    if (watchedValues.branchId) count++;
    if (watchedValues.patientId) count++;
    return count;
  }, [watchedValues, selectedStatuses, selectedTypes]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="primary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSubmit}
                disabled={isLoading}
              >
                Apply
              </Button>
            )}
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={isLoading}
              >
                Clear All
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit}>
          <VStack spacing="md">
            {/* Search Input - Always visible */}
            <Controller
              name="search"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Search appointments, patients, or notes..."
                  className="w-full"
                  disabled={isLoading}
                />
              )}
            />

            {/* Status Filter - Always visible */}
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusToggle(option.value as AppointmentStatus)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    disabled={isLoading}
                    variant="ghost"
                  >
                    <Badge
                      variant={selectedStatuses.includes(option.value as AppointmentStatus) ? 'primary' : 'secondary'}
                    >
                      {option.label}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
              <>
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        onClick={() => handleTypeToggle(option.value as AppointmentType)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        disabled={isLoading}
                        variant="ghost"
                      >
                        <Badge
                          variant={selectedTypes.includes(option.value as AppointmentType) ? 'primary' : 'secondary'}
                        >
                          {option.label}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <HStack spacing="md" className="w-full">
                  <div className="flex-1">
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <DatePicker
                          {...field}
                          value={value ? new Date(value) : null}
                          onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
                          label="Start Date"
                          placeholder="Select start date"
                          disabled={isLoading}
                        />
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <DatePicker
                          {...field}
                          value={value ? new Date(value) : null}
                          onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
                          label="End Date"
                          placeholder="Select end date"
                          disabled={isLoading}
                        />
                      )}
                    />
                  </div>
                </HStack>

                {/* Clinician and Branch */}
                <HStack spacing="md" className="w-full">
                  <div className="flex-1">
                    <Controller
                      name="clinician"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          label="Clinician"
                          placeholder="Select clinician"
                          options={[
                            { value: '', label: 'All Clinicians' },
                            ...CLINICIAN_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
                          ]}
                          disabled={isLoading}
                        />
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <Controller
                      name="branchId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          label="Branch"
                          placeholder="Select branch"
                          options={[
                            { value: '', label: 'All Branches' },
                            ...BRANCH_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
                          ]}
                          disabled={isLoading}
                        />
                      )}
                    />
                  </div>
                </HStack>

                {/* Patient ID (for specific patient filtering) */}
                <Controller
                  name="patientId"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Patient ID"
                      placeholder="Enter patient ID"
                      disabled={isLoading}
                    />
                  )}
                />
              </>
            )}
          </VStack>
        </form>
      </CardContent>
    </Card>
  );
};

export default AppointmentFilters;