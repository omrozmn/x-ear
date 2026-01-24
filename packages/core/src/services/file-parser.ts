import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
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

export interface ParseOptions {
  preview?: boolean;
  previewRows?: number;
  hasHeaders?: boolean;
  delimiter?: string;
  encoding?: string;
  skipEmptyLines?: boolean;
  trimHeaders?: boolean;
  transformHeader?: (header: string) => string;
}

export interface FileParseError {
  type: 'PARSE_ERROR' | 'UNSUPPORTED_FORMAT' | 'FILE_TOO_LARGE' | 'INVALID_DATA';
  message: string;
  details?: any;
}

export class FileParserService {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_PREVIEW_ROWS = 10;
  private static readonly SUPPORTED_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  /**
   * Parse CSV file using Papa Parse
   */
  static async parseCSV(
    file: File,
    options: ParseOptions = {}
  ): Promise<ParsedData> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const {
        preview = false,
        previewRows = this.DEFAULT_PREVIEW_ROWS,
        hasHeaders = true,
        delimiter = '',
        skipEmptyLines = true,
        trimHeaders = true,
        transformHeader,
      } = options;

      Papa.parse(file as any, {
        header: false, // We'll handle headers manually for better control
        delimiter: delimiter || undefined,
        skipEmptyLines,
        preview: preview ? previewRows + (hasHeaders ? 1 : 0) : 0,
        encoding: options.encoding || 'UTF-8',
        complete: (results: Papa.ParseResult<string[]>) => {
          try {
            const parseTime = Date.now() - startTime;
            const allRows = results.data as string[][];

            if (allRows.length === 0) {
              reject({
                type: 'INVALID_DATA',
                message: 'File appears to be empty or contains no valid data',
              } as FileParseError);
              return;
            }

            let headers: string[] = [];
            let dataRows: any[][] = [];

            if (hasHeaders && allRows.length > 0) {
              const headerRow = allRows[0];
              headers = headerRow.map((header, index) => {
                let processedHeader = trimHeaders ? header.trim() : header;
                if (transformHeader) {
                  processedHeader = transformHeader(processedHeader);
                }
                return processedHeader || `Column ${index + 1}`;
              });
              dataRows = allRows.slice(1);
            } else {
              // Generate column headers
              const maxColumns = Math.max(...allRows.map(row => row.length));
              headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
              dataRows = allRows;
            }

            const previewData = preview ? dataRows.slice(0, previewRows) : dataRows;

            const parsedData: ParsedData = {
              headers,
              rows: dataRows,
              totalRows: dataRows.length,
              preview: previewData,
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || 'text/csv',
                encoding: options.encoding || 'UTF-8',
                delimiter: results.meta.delimiter,
                hasHeaders,
                parseTime,
              },
            };

            resolve(parsedData);
          } catch (error) {
            reject({
              type: 'PARSE_ERROR',
              message: 'Failed to process CSV data',
              details: error,
            } as FileParseError);
          }
        },
        error: (error: Papa.ParseError) => {
          reject({
            type: 'PARSE_ERROR',
            message: `CSV parsing failed: ${error.message}`,
            details: error,
          } as FileParseError);
        },
      } as any);
    });
  }

  /**
   * Parse Excel file using SheetJS
   */
  static async parseExcel(
    file: File,
    options: ParseOptions = {}
  ): Promise<ParsedData> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const {
            preview = false,
            previewRows = this.DEFAULT_PREVIEW_ROWS,
            hasHeaders = true,
            trimHeaders = true,
            transformHeader,
          } = options;

          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          if (!worksheet) {
            reject({
              type: 'INVALID_DATA',
              message: 'Excel file contains no readable worksheets',
            } as FileParseError);
            return;
          }

          // Convert to array of arrays
          const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });

          if (allRows.length === 0) {
            reject({
              type: 'INVALID_DATA',
              message: 'Excel file appears to be empty',
            } as FileParseError);
            return;
          }

          let headers: string[] = [];
          let dataRows: any[][] = [];

          if (hasHeaders && allRows.length > 0) {
            const headerRow = allRows[0];
            headers = headerRow.map((header, index) => {
              let processedHeader = String(header || '');
              if (trimHeaders) {
                processedHeader = processedHeader.trim();
              }
              if (transformHeader) {
                processedHeader = transformHeader(processedHeader);
              }
              return processedHeader || `Column ${index + 1}`;
            });
            dataRows = allRows.slice(1);
          } else {
            const maxColumns = Math.max(...allRows.map(row => row.length));
            headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
            dataRows = allRows;
          }

          const previewData = preview ? dataRows.slice(0, previewRows) : dataRows;
          const parseTime = Date.now() - startTime;

          const parsedData: ParsedData = {
            headers,
            rows: dataRows,
            totalRows: dataRows.length,
            preview: previewData,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              hasHeaders,
              parseTime,
            },
          };

          resolve(parsedData);
        } catch (error) {
          reject({
            type: 'PARSE_ERROR',
            message: 'Failed to parse Excel file',
            details: error,
          } as FileParseError);
        }
      };

      reader.onerror = () => {
        reject({
          type: 'PARSE_ERROR',
          message: 'Failed to read Excel file',
        } as FileParseError);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Auto-detect file type and parse accordingly
   */
  static async parseFile(
    file: File,
    options: ParseOptions = {}
  ): Promise<ParsedData> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw {
        type: 'FILE_TOO_LARGE',
        message: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB)`,
      } as FileParseError;
    }

    // Validate file type
    const fileType = file.type || this.getFileTypeFromExtension(file.name);
    if (!this.SUPPORTED_TYPES.includes(fileType)) {
      throw {
        type: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format: ${fileType}. Supported formats: CSV, Excel (.xlsx, .xls)`,
      } as FileParseError;
    }

    // Route to appropriate parser
    if (fileType === 'text/csv' || fileType === 'text/plain') {
      return this.parseCSV(file, options);
    } else if (
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return this.parseExcel(file, options);
    }

    throw {
      type: 'UNSUPPORTED_FORMAT',
      message: `Unable to determine parser for file type: ${fileType}`,
    } as FileParseError;
  }

  /**
   * Get file type from extension when MIME type is not available
   */
  private static getFileTypeFromExtension(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'csv':
        return 'text/csv';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Validate parsed data structure
   */
  static validateParsedData(data: ParsedData): boolean {
    return (
      data &&
      Array.isArray(data.headers) &&
      Array.isArray(data.rows) &&
      data.headers.length > 0 &&
      typeof data.totalRows === 'number' &&
      data.metadata &&
      typeof data.metadata.fileName === 'string'
    );
  }

  /**
   * Get file parsing statistics
   */
  static getParsingStats(data: ParsedData) {
    const columnStats = data.headers.map((header, index) => {
      const columnData = data.rows.map(row => row[index]);
      const nonEmptyValues = columnData.filter(val => val !== null && val !== undefined && val !== '');

      return {
        name: header,
        index,
        totalValues: columnData.length,
        nonEmptyValues: nonEmptyValues.length,
        emptyValues: columnData.length - nonEmptyValues.length,
        fillRate: nonEmptyValues.length / columnData.length,
        sampleValues: nonEmptyValues.slice(0, 5),
      };
    });

    return {
      totalColumns: data.headers.length,
      totalRows: data.totalRows,
      parseTime: data.metadata.parseTime,
      fileSize: data.metadata.fileSize,
      columnStats,
    };
  }
}