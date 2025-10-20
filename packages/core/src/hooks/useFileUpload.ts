import { useState, useCallback, useRef } from 'react';
import { FileParserService, ParsedData, ParseOptions } from '../services/file-parser';
import { TypeConverter, ColumnTypeInfo, ConversionOptions } from '../utils/type-converter';

export interface FileUploadState {
  file: File | null;
  isUploading: boolean;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  parsedData: ParsedData | null;
  columnTypes: ColumnTypeInfo[] | null;
  previewData: any[][] | null;
}

export interface FileUploadOptions {
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  parseOptions?: ParseOptions;
  conversionOptions?: ConversionOptions;
  previewRows?: number;
  autoDetectTypes?: boolean;
}

export interface FileUploadActions {
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

export interface UseFileUploadReturn {
  state: FileUploadState;
  actions: FileUploadActions;
}

const DEFAULT_OPTIONS: FileUploadOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['.csv', '.xlsx', '.xls'],
  previewRows: 10,
  autoDetectTypes: true,
  parseOptions: {
    hasHeaders: true,
    skipEmptyLines: true,
    trimHeaders: true,
  },
  conversionOptions: {
    trimWhitespace: true,
    strictMode: false,
  },
};

export function useFileUpload(options: FileUploadOptions = {}): UseFileUploadReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parseOptionsRef = useRef<ParseOptions>(opts.parseOptions || {});
  const conversionOptionsRef = useRef<ConversionOptions>(opts.conversionOptions || {});

  const [state, setState] = useState<FileUploadState>({
    file: null,
    isUploading: false,
    isProcessing: false,
    progress: 0,
    error: null,
    parsedData: null,
    columnTypes: null,
    previewData: null,
  });

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (opts.maxFileSize && file.size > opts.maxFileSize) {
      return `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(opts.maxFileSize / 1024 / 1024)}MB)`;
    }

    // Check file type
    if (opts.allowedTypes && opts.allowedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!opts.allowedTypes.includes(fileExtension)) {
        return `File type "${fileExtension}" is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`;
      }
    }

    return null;
  }, [opts.maxFileSize, opts.allowedTypes]);

  const uploadFile = useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setState(prev => ({
      ...prev,
      file,
      isUploading: true,
      error: null,
      progress: 0,
    }));

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setState(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
      }));

      // Auto-process if enabled
      if (opts.autoDetectTypes) {
        await processFile();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }));
    }
  }, [validateFile, opts.autoDetectTypes]);

  const processFile = useCallback(async () => {
    if (!state.file) {
      setState(prev => ({ ...prev, error: 'No file selected' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
    }));

    try {
      // Parse file
      const parsedData = await FileParserService.parseFile(
        state.file,
        parseOptionsRef.current
      );

      // Analyze column types if auto-detection is enabled
      let columnTypes: ColumnTypeInfo[] | null = null;
      if (opts.autoDetectTypes && parsedData.rows.length > 0) {
        columnTypes = parsedData.headers.map((header, index) => {
          const columnValues = parsedData.rows.map((row: any[]) => row[index]);
          return TypeConverter.analyzeColumn(
            columnValues,
            header,
            index,
            conversionOptionsRef.current
          );
        });
      }

      // Generate preview data
      const previewData = parsedData.rows.slice(0, opts.previewRows || 10);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        parsedData,
        columnTypes,
        previewData,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? `Parse error: ${error.message}` 
        : 'Processing failed';

      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
    }
  }, [state.file, opts.autoDetectTypes, opts.previewRows]);

  const convertColumn = useCallback(async (columnIndex: number, targetType: string) => {
    if (!state.parsedData || !state.columnTypes) {
      setState(prev => ({ ...prev, error: 'No data to convert' }));
      return;
    }

    try {
      const columnValues = state.parsedData.rows.map((row: any[]) => row[columnIndex]);
      const { converted, errors } = TypeConverter.convertColumn(
        columnValues,
        targetType as any,
        conversionOptionsRef.current
      );

      // Update parsed data with converted values
      const newData = state.parsedData.rows.map((row: any[], rowIndex: number) => {
        const newRow = [...row];
        newRow[columnIndex] = converted[rowIndex];
        return newRow;
      });

      // Update column type info
      const newColumnTypes = [...state.columnTypes];
      newColumnTypes[columnIndex] = {
        ...newColumnTypes[columnIndex],
        detectedType: targetType as any,
        confidence: errors.length === 0 ? 1 : 1 - (errors.length / columnValues.length),
        errors: errors.map(e => e.error),
      };

      setState(prev => ({
        ...prev,
        parsedData: prev.parsedData ? { ...prev.parsedData, rows: newData } : null,
        columnTypes: newColumnTypes,
        previewData: newData.slice(0, opts.previewRows || 10),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Conversion failed',
      }));
    }
  }, [state.parsedData, state.columnTypes, opts.previewRows]);

  const convertAllColumns = useCallback(async () => {
    if (!state.columnTypes) {
      setState(prev => ({ ...prev, error: 'No column type information available' }));
      return;
    }

    try {
      for (const columnType of state.columnTypes) {
        await convertColumn(columnType.columnIndex, columnType.detectedType);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Batch conversion failed',
      }));
    }
  }, [state.columnTypes, convertColumn]);

  const reset = useCallback(() => {
    setState({
      file: null,
      isUploading: false,
      isProcessing: false,
      progress: 0,
      error: null,
      parsedData: null,
      columnTypes: null,
      previewData: null,
    });
  }, []);

  const removeFile = useCallback(() => {
    setState(prev => ({
      ...prev,
      file: null,
      parsedData: null,
      columnTypes: null,
      previewData: null,
      error: null,
    }));
  }, []);

  const updateParseOptions = useCallback((newOptions: Partial<ParseOptions>) => {
    parseOptionsRef.current = { ...parseOptionsRef.current, ...newOptions };
  }, []);

  const updateConversionOptions = useCallback((newOptions: Partial<ConversionOptions>) => {
    conversionOptionsRef.current = { ...conversionOptionsRef.current, ...newOptions };
  }, []);

  const getPreviewData = useCallback((rows?: number): any[][] => {
    if (!state.parsedData) return [];
    const numRows = rows || opts.previewRows || 10;
    return state.parsedData.rows.slice(0, numRows);
  }, [state.parsedData, opts.previewRows]);

  const downloadProcessedData = useCallback((filename?: string) => {
    if (!state.parsedData) {
      setState(prev => ({ ...prev, error: 'No data to download' }));
      return;
    }

    try {
      // Convert data to CSV format
      const csvContent = [
        state.parsedData.headers.join(','),
        ...state.parsedData.rows.map((row: any[]) => 
          row.map((cell: any) => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell.replace(/"/g, '""')}"` 
              : String(cell)
          ).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename || `processed_${state.file?.name || 'data.csv'}`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Download failed',
      }));
    }
  }, [state.parsedData, state.file]);

  return {
    state,
    actions: {
      uploadFile,
      processFile,
      convertColumn,
      convertAllColumns,
      reset,
      removeFile,
      updateParseOptions,
      updateConversionOptions,
      getPreviewData,
      downloadProcessedData,
    },
  };
}

// Additional utility hooks for specific use cases

/**
 * Simple file upload hook for basic CSV/XLSX parsing
 */
export function useSimpleFileUpload() {
  return useFileUpload({
    autoDetectTypes: false,
    previewRows: 5,
  });
}

/**
 * Advanced file upload hook with full type detection and conversion
 */
export function useAdvancedFileUpload(options?: Partial<FileUploadOptions>) {
  return useFileUpload({
    autoDetectTypes: true,
    previewRows: 20,
    ...options,
  });
}

/**
 * Hook for drag and drop file upload
 */
export function useDragDropFileUpload(options?: FileUploadOptions) {
  const fileUpload = useFileUpload(options);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await fileUpload.actions.uploadFile(files[0]);
    }
  }, [fileUpload.actions]);

  return {
    ...fileUpload,
    dragProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    isDragOver,
  };
}