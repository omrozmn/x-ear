import * as fuse_js from 'fuse.js';
import { IFuseOptions, FuseResult } from 'fuse.js';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    meta?: {
        requestId: string;
        timestamp: string;
        [key: string]: any;
    };
}
interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
    meta: {
        requestId: string;
        timestamp: string;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}
interface ApiError {
    message: string;
    code?: string;
    status?: number;
    details?: any;
}
interface IdempotencyConfig {
    key?: string;
    ttl?: number;
}

interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}
interface Address {
    street: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
}
interface ContactInfo {
    phone: string;
    email?: string;
    address?: Address;
}
interface Money {
    amount: number;
    currency: string;
}
type Status = 'active' | 'inactive' | 'pending' | 'cancelled' | 'completed';
interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
interface FilterOptions {
    search?: string;
    status?: Status;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface Patient extends BaseEntity {
    firstName: string;
    lastName: string;
    tcNumber: string;
    birthDate: string;
    gender: 'male' | 'female' | 'other';
    contactInfo: ContactInfo;
    status: Status;
    notes?: PatientNote[];
    medicalHistory?: MedicalHistory[];
    devices?: PatientDevice[];
    communications?: PatientCommunication[];
}
interface MedicalHistory extends BaseEntity {
    patientId: string;
    condition: string;
    diagnosis: string;
    treatment?: string;
    date: string;
    doctorId?: string;
    notes?: string;
}
interface PatientDevice {
    id: string;
    brand: string;
    model: string;
    serialNumber?: string;
    side: 'left' | 'right' | 'both';
    type: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
    status: 'active' | 'trial' | 'returned' | 'replaced';
    purchaseDate?: string;
    warrantyExpiry?: string;
    lastServiceDate?: string;
    batteryType?: string;
    price?: number;
    sgkScheme?: boolean;
    settings?: Record<string, unknown>;
}
interface PatientNote {
    id: string;
    text: string;
    date: string;
    author: string;
    type?: 'general' | 'clinical' | 'financial' | 'sgk';
    isPrivate?: boolean;
}
interface PatientCommunication {
    id: string;
    type: 'sms' | 'email' | 'call' | 'whatsapp';
    direction: 'inbound' | 'outbound';
    content: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    date: string;
    author?: string;
    metadata?: Record<string, unknown>;
}
interface PatientCreateRequest {
    firstName: string;
    lastName: string;
    tcNumber: string;
    birthDate: string;
    gender: 'male' | 'female' | 'other';
    contactInfo: ContactInfo;
    notes?: string;
}
interface PatientUpdateRequest extends Partial<PatientCreateRequest> {
    id: string;
    status?: Status;
}
interface PatientSearchFilters {
    search?: string;
    status?: Status;
    gender?: 'male' | 'female' | 'other';
    ageFrom?: number;
    ageTo?: number;
}

interface Appointment extends BaseEntity {
    patientId: string;
    doctorId?: string;
    date: string;
    time: string;
    duration: number;
    type: AppointmentType;
    status: AppointmentStatus;
    notes?: string;
    reminderSent?: boolean;
    cancellationReason?: string;
}
type AppointmentType = 'consultation' | 'follow-up' | 'procedure' | 'emergency' | 'screening';
type AppointmentStatus = 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
interface AppointmentCreateRequest {
    patientId: string;
    doctorId?: string;
    date: string;
    time: string;
    duration?: number;
    type: AppointmentType;
    notes?: string;
}
interface AppointmentUpdateRequest extends Partial<AppointmentCreateRequest> {
    id: string;
    status?: AppointmentStatus;
    cancellationReason?: string;
}
interface AppointmentSearchFilters {
    patientId?: string;
    doctorId?: string;
    status?: AppointmentStatus;
    type?: AppointmentType;
    dateFrom?: string;
    dateTo?: string;
}
interface TimeSlot {
    date: string;
    time: string;
    available: boolean;
    doctorId?: string;
}

interface InventoryItem$1 extends BaseEntity {
    name: string;
    description?: string;
    sku: string;
    category: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    quantity: number;
    minQuantity: number;
    maxQuantity?: number;
    unitPrice: Money;
    totalValue: Money;
    location?: string;
    status: InventoryStatus;
    expiryDate?: string;
    supplier?: Supplier;
}
type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued' | 'expired';
interface Supplier extends BaseEntity {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
    status: Status;
}
interface InventoryTransaction extends BaseEntity {
    itemId: string;
    type: TransactionType;
    quantity: number;
    unitPrice?: Money;
    totalAmount?: Money;
    reference?: string;
    notes?: string;
    performedBy: string;
}
type TransactionType = 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return' | 'waste';
interface InventoryCreateRequest {
    name: string;
    description?: string;
    sku: string;
    category: string;
    brand?: string;
    model?: string;
    quantity: number;
    minQuantity: number;
    maxQuantity?: number;
    unitPrice: Money;
    location?: string;
    expiryDate?: string;
    supplierId?: string;
}
interface InventoryUpdateRequest extends Partial<InventoryCreateRequest> {
    id: string;
    status?: InventoryStatus;
}
interface InventorySearchFilters {
    search?: string;
    category?: string;
    status?: InventoryStatus;
    lowStock?: boolean;
    expiringSoon?: boolean;
    supplierId?: string;
}

interface Campaign extends BaseEntity {
    name: string;
    description?: string;
    type: CampaignType;
    status: CampaignStatus;
    startDate: string;
    endDate: string;
    targetAudience?: TargetAudience;
    budget?: Money;
    actualSpent?: Money;
    metrics?: CampaignMetrics;
    channels: CampaignChannel[];
}
type CampaignType = 'promotional' | 'educational' | 'awareness' | 'seasonal' | 'product-launch';
type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
interface TargetAudience {
    ageRange?: {
        min: number;
        max: number;
    };
    gender?: 'male' | 'female' | 'all';
    location?: string[];
    interests?: string[];
    conditions?: string[];
}
interface CampaignMetrics {
    impressions: number;
    clicks: number;
    conversions: number;
    clickThroughRate: number;
    conversionRate: number;
    costPerClick?: number;
    costPerConversion?: number;
    roi?: number;
}
type CampaignChannel = 'email' | 'sms' | 'social-media' | 'website' | 'print' | 'radio' | 'tv';
interface CampaignCreateRequest {
    name: string;
    description?: string;
    type: CampaignType;
    startDate: string;
    endDate: string;
    targetAudience?: TargetAudience;
    budget?: Money;
    channels: CampaignChannel[];
}
interface CampaignUpdateRequest extends Partial<CampaignCreateRequest> {
    id: string;
    status?: CampaignStatus;
}
interface CampaignSearchFilters {
    search?: string;
    type?: CampaignType;
    status?: CampaignStatus;
    channel?: CampaignChannel;
    dateFrom?: string;
    dateTo?: string;
}

interface User extends BaseEntity {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: Permission[];
    status: UserStatus;
    lastLoginAt?: string;
    contactInfo?: ContactInfo;
    preferences?: UserPreferences;
}
type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'manager' | 'technician';
type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending-verification';
interface Permission {
    resource: string;
    actions: PermissionAction[];
}
type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';
interface UserPreferences {
    language: string;
    timezone: string;
    dateFormat: string;
    notifications: NotificationSettings;
    dashboard?: DashboardSettings;
}
interface NotificationSettings {
    email: boolean;
    sms: boolean;
    push: boolean;
    appointmentReminders: boolean;
    systemAlerts: boolean;
}
interface DashboardSettings {
    widgets: string[];
    layout: 'grid' | 'list';
    refreshInterval: number;
}
interface UserCreateRequest {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions?: Permission[];
    contactInfo?: ContactInfo;
    temporaryPassword?: string;
}
interface UserUpdateRequest extends Partial<UserCreateRequest> {
    id: string;
    status?: UserStatus;
    preferences?: UserPreferences;
}
interface UserSearchFilters {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    lastLoginFrom?: string;
    lastLoginTo?: string;
}
interface AuthUser {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: Permission[];
    token: string;
    refreshToken?: string;
    expiresAt: string;
}

declare class PatientService {
    /**
     * Validates Turkish Citizenship Number (TC Kimlik No)
     */
    static validateTcNumber(tcNumber: string): boolean;
    /**
     * Calculates age from birth date
     */
    static calculateAge(birthDate: string): number;
    /**
     * Validates patient data before creation/update
     */
    static validatePatientData(data: PatientCreateRequest | PatientUpdateRequest): string[];
    /**
     * Formats patient name for display
     */
    static formatPatientName(patient: Patient): string;
    /**
     * Generates patient display ID
     */
    static generateDisplayId(patient: Patient): string;
    /**
     * Checks if patient data needs verification
     */
    static needsVerification(patient: Patient): boolean;
    /**
     * Calculates patient priority score based on various factors
     */
    static calculatePriorityScore(patient: Patient): number;
    /**
     * Adds a note to a patient
     */
    static addNote(patient: Patient, note: Omit<PatientNote, 'id'>): Patient;
    /**
     * Updates a device for a patient
     */
    static updateDevice(patient: Patient, deviceId: string, updates: Partial<PatientDevice>): Patient;
    /**
     * Adds a communication record to a patient
     */
    static addCommunication(patient: Patient, communication: Omit<PatientCommunication, 'id'>): Patient;
}

interface FuzzySearchOptions<T> extends IFuseOptions<T> {
}
interface FuzzySearchResult<T> {
    item: T;
    score?: number;
    matches?: FuseResult<T>['matches'];
}
declare class FuzzySearch<T> {
    private fuse;
    private originalData;
    private options;
    constructor(data: T[], options?: FuzzySearchOptions<T>);
    /**
     * Perform fuzzy search on the data
     */
    search(query: string): FuzzySearchResult<T>[];
    /**
     * Update the search data
     */
    setData(data: T[]): void;
    /**
     * Add new items to the search data
     */
    addItems(items: T[]): void;
    /**
     * Remove items from the search data
     */
    removeItems(predicate: (item: T) => boolean): void;
    /**
     * Get all original data
     */
    getAllData(): T[];
    /**
     * Get search statistics
     */
    getStats(): {
        totalItems: number;
        searchKeys: fuse_js.FuseOptionKey<T>[] | undefined;
        threshold: number | undefined;
    };
}
/**
 * Factory function for creating fuzzy search instances
 */
declare function createFuzzySearch<T>(data: T[], options?: FuzzySearchOptions<T>): FuzzySearch<T>;
/**
 * Simple utility function for one-off searches
 */
declare function fuzzySearch<T>(data: T[], query: string, options?: FuzzySearchOptions<T>): FuzzySearchResult<T>[];
/**
 * Predefined search configurations for common use cases
 */
declare const FuzzySearchPresets: {
    readonly strict: {
        readonly threshold: 0.2;
        readonly distance: 50;
        readonly minMatchCharLength: 3;
    };
    readonly balanced: {
        readonly threshold: 0.3;
        readonly distance: 100;
        readonly minMatchCharLength: 2;
    };
    readonly lenient: {
        readonly threshold: 0.6;
        readonly distance: 200;
        readonly minMatchCharLength: 1;
    };
    readonly exactWithTypos: {
        readonly threshold: 0.1;
        readonly distance: 20;
        readonly minMatchCharLength: 3;
        readonly findAllMatches: true;
    };
};
type FuzzySearchPreset = keyof typeof FuzzySearchPresets;

interface UseFuzzySearchOptions<T> extends FuzzySearchOptions<T> {
    debounceMs?: number;
    minQueryLength?: number;
    preset?: FuzzySearchPreset;
}
interface UseFuzzySearchReturn<T> {
    results: FuzzySearchResult<T>[];
    query: string;
    setQuery: (query: string) => void;
    isSearching: boolean;
    totalResults: number;
    hasResults: boolean;
    clearSearch: () => void;
    setData: (data: T[]) => void;
    addItems: (items: T[]) => void;
    removeItems: (predicate: (item: T) => boolean) => void;
    stats: {
        totalItems: number;
        searchKeys: any;
        threshold: any;
    };
}
/**
 * React hook for fuzzy search functionality with debouncing and state management
 */
declare function useFuzzySearch<T>(initialData: T[], options?: UseFuzzySearchOptions<T>): UseFuzzySearchReturn<T>;
/**
 * Simplified hook for basic fuzzy search without advanced features
 */
declare function useSimpleFuzzySearch<T>(data: T[], query: string, options?: FuzzySearchOptions<T>): FuzzySearchResult<T>[];
/**
 * Hook for fuzzy search with custom filtering and sorting
 */
declare function useAdvancedFuzzySearch<T>(data: T[], options?: UseFuzzySearchOptions<T> & {
    filter?: (item: T, result: FuzzySearchResult<T>) => boolean;
    sort?: (a: FuzzySearchResult<T>, b: FuzzySearchResult<T>) => number;
    limit?: number;
}): UseFuzzySearchReturn<T> & {
    filteredResults: FuzzySearchResult<T>[];
};

interface ParsedData {
    headers: string[];
    rows: any[][];
    totalRows: number;
    preview: any[][];
    metadata: {
        fileName: string;
        fileSize: number;
        fileType: string;
        encoding?: string;
        delimiter?: string;
        hasHeaders: boolean;
        parseTime: number;
    };
}
interface ParseOptions {
    preview?: boolean;
    previewRows?: number;
    hasHeaders?: boolean;
    delimiter?: string;
    encoding?: string;
    skipEmptyLines?: boolean;
    trimHeaders?: boolean;
    transformHeader?: (header: string) => string;
}
interface FileParseError {
    type: 'PARSE_ERROR' | 'UNSUPPORTED_FORMAT' | 'FILE_TOO_LARGE' | 'INVALID_DATA';
    message: string;
    details?: any;
}
declare class FileParserService {
    private static readonly MAX_FILE_SIZE;
    private static readonly DEFAULT_PREVIEW_ROWS;
    private static readonly SUPPORTED_TYPES;
    /**
     * Parse CSV file using Papa Parse
     */
    static parseCSV(file: File, options?: ParseOptions): Promise<ParsedData>;
    /**
     * Parse Excel file using SheetJS
     */
    static parseExcel(file: File, options?: ParseOptions): Promise<ParsedData>;
    /**
     * Auto-detect file type and parse accordingly
     */
    static parseFile(file: File, options?: ParseOptions): Promise<ParsedData>;
    /**
     * Get file type from extension when MIME type is not available
     */
    private static getFileTypeFromExtension;
    /**
     * Validate parsed data structure
     */
    static validateParsedData(data: ParsedData): boolean;
    /**
     * Get file parsing statistics
     */
    static getParsingStats(data: ParsedData): {
        totalColumns: number;
        totalRows: number;
        parseTime: number;
        fileSize: number;
        columnStats: {
            name: string;
            index: number;
            totalValues: number;
            nonEmptyValues: number;
            emptyValues: number;
            fillRate: number;
            sampleValues: any[];
        }[];
    };
}

type DataType = 'string' | 'number' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'time' | 'email' | 'url' | 'phone' | 'currency' | 'percentage' | 'null' | 'unknown';
interface TypeDetectionResult {
    type: DataType;
    confidence: number;
    pattern?: string;
    samples: any[];
    convertedSamples: any[];
    errors: string[];
}
interface ColumnTypeInfo {
    columnName: string;
    columnIndex: number;
    detectedType: DataType;
    confidence: number;
    totalValues: number;
    nonEmptyValues: number;
    nullValues: number;
    uniqueValues: number;
    samples: any[];
    convertedSamples: any[];
    errors: string[];
    suggestions?: string[];
}
interface ConversionOptions {
    dateFormats?: string[];
    currencySymbols?: string[];
    decimalSeparator?: '.' | ',';
    thousandsSeparator?: ',' | '.' | ' ';
    booleanTrueValues?: string[];
    booleanFalseValues?: string[];
    nullValues?: string[];
    trimWhitespace?: boolean;
    strictMode?: boolean;
}
declare class TypeConverter {
    private static readonly DEFAULT_OPTIONS;
    /**
     * Detect data type for a single value
     */
    static detectValueType(value: any, options?: ConversionOptions): DataType;
    /**
     * Analyze column data and detect the most likely type
     */
    static analyzeColumn(values: any[], columnName: string, columnIndex: number, options?: ConversionOptions): ColumnTypeInfo;
    /**
     * Convert a value to the specified type
     */
    static convertValue(value: any, targetType: DataType, options?: ConversionOptions): any;
    /**
     * Convert entire column data
     */
    static convertColumn(values: any[], targetType: DataType, options?: ConversionOptions): {
        converted: any[];
        errors: Array<{
            index: number;
            value: any;
            error: string;
        }>;
    };
    private static isEmail;
    private static isUrl;
    private static isPhone;
    private static isCurrency;
    private static isPercentage;
    private static isInteger;
    private static isFloat;
    private static isDate;
    private static isDateTime;
    private static isTime;
    private static parseNumber;
    private static parseCurrency;
    private static parsePercentage;
    private static parseDate;
    private static parseDateTime;
    private static parseTime;
}

interface FileUploadState {
    file: File | null;
    isUploading: boolean;
    isProcessing: boolean;
    progress: number;
    error: string | null;
    parsedData: ParsedData | null;
    columnTypes: ColumnTypeInfo[] | null;
    previewData: any[][] | null;
}
interface FileUploadOptions {
    maxFileSize?: number;
    allowedTypes?: string[];
    parseOptions?: ParseOptions;
    conversionOptions?: ConversionOptions;
    previewRows?: number;
    autoDetectTypes?: boolean;
}
interface FileUploadActions {
    uploadFile: (file: File) => Promise<void>;
    processFile: () => Promise<void>;
    convertColumn: (columnIndex: number, targetType: string) => Promise<void>;
    convertAllColumns: () => Promise<void>;
    reset: () => void;
    removeFile: () => void;
    updateParseOptions: (options: Partial<ParseOptions>) => void;
    updateConversionOptions: (options: Partial<ConversionOptions>) => void;
    getPreviewData: (rows?: number) => any[][];
    downloadProcessedData: (filename?: string) => void;
}
interface UseFileUploadReturn {
    state: FileUploadState;
    actions: FileUploadActions;
}
declare function useFileUpload(options?: FileUploadOptions): UseFileUploadReturn;
/**
 * Simple file upload hook for basic CSV/XLSX parsing
 */
declare function useSimpleFileUpload(): UseFileUploadReturn;
/**
 * Advanced file upload hook with full type detection and conversion
 */
declare function useAdvancedFileUpload(options?: Partial<FileUploadOptions>): UseFileUploadReturn;
/**
 * Hook for drag and drop file upload
 */
declare function useDragDropFileUpload(options?: FileUploadOptions): {
    dragProps: {
        onDragOver: (e: React.DragEvent) => void;
        onDragLeave: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => Promise<void>;
    };
    isDragOver: boolean;
    state: FileUploadState;
    actions: FileUploadActions;
};

/**
 * Formats a date string or Date object to Turkish locale format
 */
declare const formatDate: (date: string | Date, formatStr?: string) => string;
/**
 * Formats a date for display in Turkish format
 */
declare const formatDateTurkish: (date: string | Date) => string;
/**
 * Formats a date and time for display
 */
declare const formatDateTime: (date: string | Date) => string;
/**
 * Calculates age from birth date
 */
declare const calculateAge: (birthDate: string | Date) => number;
/**
 * Checks if a date is today
 */
declare const isToday: (date: string | Date) => boolean;
/**
 * Gets the start of day for a date
 */
declare const getStartOfDay: (date: string | Date) => Date;
/**
 * Gets the end of day for a date
 */
declare const getEndOfDay: (date: string | Date) => Date;
/**
 * Adds days to a date
 */
declare const addDaysToDate: (date: string | Date, days: number) => Date;
/**
 * Converts a date to ISO string format
 */
declare const toISOString: (date: Date) => string;
/**
 * Validates if a string is a valid date
 */
declare const isValidDate: (dateString: string) => boolean;

/**
 * Formats a phone number to Turkish format
 */
declare const formatPhoneNumber: (phone: string) => string;
/**
 * Formats Turkish Citizenship Number (TC Kimlik No)
 */
declare const formatTcNumber: (tcNumber: string) => string;
/**
 * Formats money amount with currency
 */
declare const formatMoney: (money: Money) => string;
/**
 * Formats a number with Turkish locale
 */
declare const formatNumber: (number: number, decimals?: number) => string;
/**
 * Formats percentage
 */
declare const formatPercentage: (value: number, decimals?: number) => string;
/**
 * Capitalizes first letter of each word
 */
declare const capitalizeWords: (text: string) => string;
/**
 * Truncates text with ellipsis
 */
declare const truncateText: (text: string, maxLength: number) => string;
/**
 * Formats file size in human readable format
 */
declare const formatFileSize: (bytes: number) => string;
/**
 * Masks sensitive information (like TC number)
 */
declare const maskSensitiveInfo: (text: string, visibleChars?: number) => string;

/**
 * Validates Turkish Citizenship Number (TC Kimlik No)
 */
declare const validateTcNumber: (tcNumber: string) => boolean;
/**
 * Validates Turkish phone number
 */
declare const validatePhoneNumber: (phone: string) => boolean;
/**
 * Validates email address
 */
declare const validateEmail: (email: string) => boolean;
/**
 * Validates password strength
 */
declare const validatePassword: (password: string) => {
    isValid: boolean;
    errors: string[];
};
/**
 * Validates required field
 */
declare const validateRequired: (value: any, fieldName: string) => string | null;
/**
 * Validates string length
 */
declare const validateLength: (value: string, min: number, max: number, fieldName: string) => string | null;
/**
 * Validates numeric range
 */
declare const validateRange: (value: number, min: number, max: number, fieldName: string) => string | null;
/**
 * Validates date format and range
 */
declare const validateDate: (dateString: string, fieldName: string, options?: {
    minDate?: Date;
    maxDate?: Date;
    allowFuture?: boolean;
    allowPast?: boolean;
}) => string | null;
/**
 * Validates URL format
 */
declare const validateUrl: (url: string) => boolean;

/**
 * Storage utility functions for localStorage and sessionStorage
 */
type StorageType = 'localStorage' | 'sessionStorage';
/**
 * Safely gets an item from storage
 */
declare const getStorageItem: <T = string>(key: string, storageType?: StorageType, defaultValue?: T) => T | null;
/**
 * Safely sets an item in storage
 */
declare const setStorageItem: (key: string, value: any, storageType?: StorageType) => boolean;
/**
 * Safely removes an item from storage
 */
declare const removeStorageItem: (key: string, storageType?: StorageType) => boolean;
/**
 * Clears all items from storage
 */
declare const clearStorage: (storageType?: StorageType) => boolean;
/**
 * Gets all keys from storage
 */
declare const getStorageKeys: (storageType?: StorageType) => string[];
/**
 * Checks if storage is available
 */
declare const isStorageAvailable: (storageType?: StorageType) => boolean;
/**
 * Gets storage usage information
 */
declare const getStorageUsage: (storageType?: StorageType) => {
    used: number;
    total: number;
    available: number;
    percentage: number;
};
/**
 * Creates a storage manager for a specific prefix
 */
declare const createStorageManager: (prefix: string, storageType?: StorageType) => {
    get: <T = string>(key: string, defaultValue?: T) => T | null;
    set: (key: string, value: any) => boolean;
    remove: (key: string) => boolean;
    clear: () => boolean;
    getKeys: () => string[];
};

interface InventoryItem {
    id: string;
    productName: string;
    brand: string;
    model: string;
    category: string;
    stock: number;
    minStock: number;
    unitPrice: number;
    vatIncludedPrice: number;
    totalValue: number;
    barcode?: string;
    supplier?: string;
    warrantyPeriod?: string;
    status: 'active' | 'inactive' | 'discontinued';
    createdAt: string;
    updatedAt: string;
}
interface CreateInventoryItemRequest {
    productName: string;
    brand: string;
    model?: string;
    category: string;
    stock: number;
    minStock: number;
    unitPrice: number;
    barcode?: string;
    supplier?: string;
    warrantyPeriod?: string;
    status?: 'active' | 'inactive' | 'discontinued';
}
interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {
    id: string;
    vatIncludedPrice?: number;
    totalValue?: number;
}
interface InventoryFilters {
    search?: string;
    category?: string;
    brand?: string;
    status?: string;
    lowStock?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
interface InventoryListResponse {
    items: InventoryItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
interface InventoryStats {
    totalProducts: number;
    lowStockCount: number;
    totalValue: number;
    activeItems: number;
    categories: Array<{
        name: string;
        count: number;
    }>;
    brands: Array<{
        name: string;
        count: number;
    }>;
}
interface BulkUploadResult {
    success: boolean;
    processed: number;
    errors: Array<{
        row: number;
        message: string;
    }>;
}
interface ApiClient {
    get(url: string, config?: any): Promise<{
        data: any;
    }>;
    post(url: string, data?: any, config?: any): Promise<{
        data: any;
    }>;
    put(url: string, data?: any, config?: any): Promise<{
        data: any;
    }>;
    patch(url: string, data?: any, config?: any): Promise<{
        data: any;
    }>;
    delete(url: string, config?: any): Promise<{
        data: any;
    }>;
}
declare class InventoryService {
    private apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Get inventory items with filtering and pagination
     */
    getInventoryItems(filters?: InventoryFilters): Promise<InventoryListResponse>;
    /**
     * Get a single inventory item by ID
     */
    getInventoryItem(id: string): Promise<InventoryItem>;
    /**
     * Create a new inventory item
     */
    createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem>;
    /**
     * Update an existing inventory item
     */
    updateInventoryItem(data: UpdateInventoryItemRequest): Promise<InventoryItem>;
    /**
     * Delete an inventory item
     */
    deleteInventoryItem(id: string): Promise<void>;
    /**
     * Delete multiple inventory items
     */
    deleteInventoryItems(ids: string[]): Promise<void>;
    /**
     * Get inventory statistics
     */
    getInventoryStats(): Promise<InventoryStats>;
    /**
     * Upload inventory items from CSV
     */
    bulkUploadInventory(file: File): Promise<BulkUploadResult>;
    /**
     * Export inventory items to CSV
     */
    exportInventory(filters?: InventoryFilters): Promise<Blob>;
    /**
     * Get available categories
     */
    getCategories(): Promise<string[]>;
    /**
     * Get available brands
     */
    getBrands(): Promise<string[]>;
    /**
     * Check if barcode is unique
     */
    checkBarcodeUnique(barcode: string, excludeId?: string): Promise<boolean>;
    /**
     * Update stock quantity for an item
     */
    updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<InventoryItem>;
    /**
     * Get low stock items
     */
    getLowStockItems(): Promise<InventoryItem[]>;
    /**
     * Generate barcode for a product
     */
    generateBarcode(): Promise<string>;
}
declare const InventoryUtils: {
    /**
     * Calculate VAT included price
     */
    calculateVATPrice(unitPrice: number, vatRate?: number): number;
    /**
     * Calculate total value
     */
    calculateTotalValue(stock: number, unitPrice: number, vatRate?: number): number;
    /**
     * Check if item is low stock
     */
    isLowStock(item: InventoryItem): boolean;
    /**
     * Format currency
     */
    formatCurrency(amount: number, currency?: string): string;
    /**
     * Generate stock status badge variant
     */
    getStockStatusVariant(item: InventoryItem): "success" | "warning" | "danger";
    /**
     * Parse CSV file to inventory items
     */
    parseCSVFile(file: File): Promise<CreateInventoryItemRequest[]>;
    /**
     * Validate inventory item data
     */
    validateInventoryItem(item: Partial<CreateInventoryItemRequest>): string[];
};

export { type Address, type ApiError, type ApiResponse, type Appointment, type AppointmentCreateRequest, type AppointmentSearchFilters, type AppointmentStatus, type AppointmentType, type AppointmentUpdateRequest, type AuthUser, type BaseEntity, type BulkUploadResult, type Campaign, type CampaignChannel, type CampaignCreateRequest, type CampaignMetrics, type CampaignSearchFilters, type CampaignStatus, type CampaignType, type CampaignUpdateRequest, type ColumnTypeInfo, type ContactInfo, type ConversionOptions, type CreateInventoryItemRequest, type DashboardSettings, type DataType, type FileParseError, FileParserService, type FileUploadActions, type FileUploadOptions, type FileUploadState, type FilterOptions, FuzzySearch, type FuzzySearchOptions, type FuzzySearchPreset, FuzzySearchPresets, type FuzzySearchResult, type IdempotencyConfig, type InventoryCreateRequest, type InventoryFilters, type InventoryItem$1 as InventoryItem, type InventoryListResponse, type InventorySearchFilters, InventoryService, type InventoryStats, type InventoryStatus, type InventoryTransaction, type InventoryUpdateRequest, InventoryUtils, type MedicalHistory, type Money, type NotificationSettings, type PaginatedResponse, type Pagination, type ParseOptions, type ParsedData, type Patient, type PatientCommunication, type PatientCreateRequest, type PatientDevice, type PatientNote, type PatientSearchFilters, PatientService, type PatientUpdateRequest, type Permission, type PermissionAction, type Status, type StorageType, type Supplier, type TargetAudience, type TimeSlot, type TransactionType, TypeConverter, type TypeDetectionResult, type UpdateInventoryItemRequest, type UseFileUploadReturn, type UseFuzzySearchOptions, type UseFuzzySearchReturn, type User, type UserCreateRequest, type UserPreferences, type UserRole, type UserSearchFilters, type UserStatus, type UserUpdateRequest, addDaysToDate, calculateAge, capitalizeWords, clearStorage, createFuzzySearch, createStorageManager, formatDate, formatDateTime, formatDateTurkish, formatFileSize, formatMoney, formatNumber, formatPercentage, formatPhoneNumber, formatTcNumber, fuzzySearch, getEndOfDay, getStartOfDay, getStorageItem, getStorageKeys, getStorageUsage, isStorageAvailable, isToday, isValidDate, maskSensitiveInfo, removeStorageItem, setStorageItem, toISOString, truncateText, useAdvancedFileUpload, useAdvancedFuzzySearch, useDragDropFileUpload, useFileUpload, useFuzzySearch, useSimpleFileUpload, useSimpleFuzzySearch, validateDate, validateEmail, validateLength, validatePassword, validatePhoneNumber, validateRange, validateRequired, validateTcNumber, validateUrl };
