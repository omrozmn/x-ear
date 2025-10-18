export type DataType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'float' 
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'time'
  | 'email' 
  | 'url' 
  | 'phone' 
  | 'currency'
  | 'percentage'
  | 'null'
  | 'unknown';

export interface TypeDetectionResult {
  type: DataType;
  confidence: number; // 0-1
  pattern?: string;
  samples: any[];
  convertedSamples: any[];
  errors: string[];
}

export interface ColumnTypeInfo {
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

export interface ConversionOptions {
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

export class TypeConverter {
  private static readonly DEFAULT_OPTIONS: ConversionOptions = {
    dateFormats: [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
      'MM-DD-YYYY',
      'YYYY/MM/DD',
      'DD.MM.YYYY',
      'YYYY-MM-DD HH:mm:ss',
      'DD/MM/YYYY HH:mm:ss',
      'MM/DD/YYYY HH:mm:ss',
    ],
    currencySymbols: ['$', '€', '£', '¥', '₺', '₹'],
    decimalSeparator: '.',
    thousandsSeparator: ',',
    booleanTrueValues: ['true', 'yes', 'y', '1', 'on', 'enabled', 'active'],
    booleanFalseValues: ['false', 'no', 'n', '0', 'off', 'disabled', 'inactive'],
    nullValues: ['', 'null', 'NULL', 'nil', 'NIL', 'n/a', 'N/A', 'undefined'],
    trimWhitespace: true,
    strictMode: false,
  };

  /**
   * Detect data type for a single value
   */
  static detectValueType(value: any, options: ConversionOptions = {}): DataType {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (value === null || value === undefined) {
      return 'null';
    }

    const strValue = String(value);
    const trimmedValue = opts.trimWhitespace ? strValue.trim() : strValue;

    // Check for null values
    if (opts.nullValues?.includes(trimmedValue.toLowerCase())) {
      return 'null';
    }

    // Check for boolean
    if (opts.booleanTrueValues?.includes(trimmedValue.toLowerCase()) ||
        opts.booleanFalseValues?.includes(trimmedValue.toLowerCase())) {
      return 'boolean';
    }

    // Check for email
    if (this.isEmail(trimmedValue)) {
      return 'email';
    }

    // Check for URL
    if (this.isUrl(trimmedValue)) {
      return 'url';
    }

    // Check for phone
    if (this.isPhone(trimmedValue)) {
      return 'phone';
    }

    // Check for currency
    if (this.isCurrency(trimmedValue, opts.currencySymbols || [])) {
      return 'currency';
    }

    // Check for percentage
    if (this.isPercentage(trimmedValue)) {
      return 'percentage';
    }

    // Check for date/time
    if (this.isDateTime(trimmedValue)) {
      return 'datetime';
    }

    if (this.isDate(trimmedValue)) {
      return 'date';
    }

    if (this.isTime(trimmedValue)) {
      return 'time';
    }

    // Check for numbers
    if (this.isInteger(trimmedValue, opts)) {
      return 'integer';
    }

    if (this.isFloat(trimmedValue, opts)) {
      return 'float';
    }

    // Default to string
    return 'string';
  }

  /**
   * Analyze column data and detect the most likely type
   */
  static analyzeColumn(
    values: any[],
    columnName: string,
    columnIndex: number,
    options: ConversionOptions = {}
  ): ColumnTypeInfo {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const nonEmptyValues = values.filter(v => 
      v !== null && v !== undefined && String(v).trim() !== ''
    );

    if (nonEmptyValues.length === 0) {
      return {
        columnName,
        columnIndex,
        detectedType: 'string',
        confidence: 0,
        totalValues: values.length,
        nonEmptyValues: 0,
        nullValues: values.length,
        uniqueValues: 0,
        samples: [],
        convertedSamples: [],
        errors: ['Column contains no data'],
      };
    }

    // Count type occurrences
    const typeCounts: Record<DataType, number> = {
      string: 0, number: 0, integer: 0, float: 0, boolean: 0,
      date: 0, datetime: 0, time: 0, email: 0, url: 0,
      phone: 0, currency: 0, percentage: 0, null: 0, unknown: 0,
    };

    const samples = nonEmptyValues.slice(0, 10);
    const convertedSamples: any[] = [];
    const errors: string[] = [];

    // Analyze each value
    nonEmptyValues.forEach(value => {
      const detectedType = this.detectValueType(value, opts);
      typeCounts[detectedType]++;
    });

    // Find the most common type
    const sortedTypes = Object.entries(typeCounts)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);

    const [mostCommonType, mostCommonCount] = sortedTypes[0] || ['string', 0];
    const confidence = mostCommonCount / nonEmptyValues.length;

    // Convert samples
    samples.forEach(sample => {
      try {
        const converted = this.convertValue(sample, mostCommonType as DataType, opts);
        convertedSamples.push(converted);
      } catch (error) {
        convertedSamples.push(sample);
        errors.push(`Failed to convert "${sample}": ${error}`);
      }
    });

    // Generate suggestions
    const suggestions: string[] = [];
    if (confidence < 0.8) {
      suggestions.push(`Low confidence (${Math.round(confidence * 100)}%) - consider manual review`);
    }
    if (sortedTypes.length > 1) {
      const [, secondType] = sortedTypes[1];
      suggestions.push(`Alternative type detected: ${secondType}`);
    }

    return {
      columnName,
      columnIndex,
      detectedType: mostCommonType as DataType,
      confidence,
      totalValues: values.length,
      nonEmptyValues: nonEmptyValues.length,
      nullValues: values.length - nonEmptyValues.length,
      uniqueValues: new Set(nonEmptyValues).size,
      samples,
      convertedSamples,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Convert a value to the specified type
   */
  static convertValue(value: any, targetType: DataType, options: ConversionOptions = {}): any {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (value === null || value === undefined) {
      return null;
    }

    const strValue = String(value);
    const trimmedValue = opts.trimWhitespace ? strValue.trim() : strValue;

    switch (targetType) {
      case 'null':
        return null;

      case 'boolean':
        if (opts.booleanTrueValues?.includes(trimmedValue.toLowerCase())) {
          return true;
        }
        if (opts.booleanFalseValues?.includes(trimmedValue.toLowerCase())) {
          return false;
        }
        throw new Error(`Cannot convert "${trimmedValue}" to boolean`);

      case 'integer':
        const intValue = this.parseNumber(trimmedValue, opts);
        if (!Number.isInteger(intValue)) {
          throw new Error(`"${trimmedValue}" is not a valid integer`);
        }
        return intValue;

      case 'float':
      case 'number':
        return this.parseNumber(trimmedValue, opts);

      case 'currency':
        return this.parseCurrency(trimmedValue, opts);

      case 'percentage':
        return this.parsePercentage(trimmedValue);

      case 'date':
        return this.parseDate(trimmedValue);

      case 'datetime':
        return this.parseDateTime(trimmedValue);

      case 'time':
        return this.parseTime(trimmedValue);

      case 'email':
      case 'url':
      case 'phone':
      case 'string':
      default:
        return trimmedValue;
    }
  }

  /**
   * Convert entire column data
   */
  static convertColumn(
    values: any[],
    targetType: DataType,
    options: ConversionOptions = {}
  ): { converted: any[]; errors: Array<{ index: number; value: any; error: string }> } {
    const converted: any[] = [];
    const errors: Array<{ index: number; value: any; error: string }> = [];

    values.forEach((value, index) => {
      try {
        const convertedValue = this.convertValue(value, targetType, options);
        converted.push(convertedValue);
      } catch (error) {
        converted.push(value); // Keep original value on error
        errors.push({
          index,
          value,
          error: String(error),
        });
      }
    });

    return { converted, errors };
  }

  // Type detection helper methods
  private static isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private static isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private static isPhone(value: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanValue = value.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanValue) && cleanValue.length >= 7;
  }

  private static isCurrency(value: string, symbols: string[]): boolean {
    const hasSymbol = symbols.some(symbol => value.includes(symbol));
    if (!hasSymbol) return false;
    
    const numericPart = value.replace(/[^\d\.,\-]/g, '');
    return this.isFloat(numericPart, {});
  }

  private static isPercentage(value: string): boolean {
    return value.includes('%') && this.isFloat(value.replace('%', ''), {});
  }

  private static isInteger(value: string, options: ConversionOptions): boolean {
    try {
      const num = this.parseNumber(value, options);
      return Number.isInteger(num);
    } catch {
      return false;
    }
  }

  private static isFloat(value: string, options: ConversionOptions): boolean {
    try {
      const num = this.parseNumber(value, options);
      return !isNaN(num) && isFinite(num);
    } catch {
      return false;
    }
  }

  private static isDate(value: string): boolean {
    const dateRegex = /^\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}$/;
    return dateRegex.test(value) && !isNaN(Date.parse(value));
  }

  private static isDateTime(value: string): boolean {
    const dateTimeRegex = /^\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}\s+\d{1,2}:\d{2}(:\d{2})?/;
    return dateTimeRegex.test(value) && !isNaN(Date.parse(value));
  }

  private static isTime(value: string): boolean {
    const timeRegex = /^\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i;
    return timeRegex.test(value);
  }

  // Parsing helper methods
  private static parseNumber(value: string, options: ConversionOptions): number {
    const { decimalSeparator = '.', thousandsSeparator = ',' } = options;
    
    let cleanValue = value.replace(/\s/g, '');
    
    // Handle thousands separator
    if (thousandsSeparator && thousandsSeparator !== decimalSeparator) {
      cleanValue = cleanValue.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
    }
    
    // Handle decimal separator
    if (decimalSeparator !== '.') {
      cleanValue = cleanValue.replace(decimalSeparator, '.');
    }
    
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      throw new Error(`Cannot parse "${value}" as number`);
    }
    
    return num;
  }

  private static parseCurrency(value: string, options: ConversionOptions): number {
    const cleanValue = value.replace(/[^\d\.,\-]/g, '');
    return this.parseNumber(cleanValue, options);
  }

  private static parsePercentage(value: string): number {
    const numericValue = value.replace('%', '');
    return parseFloat(numericValue) / 100;
  }

  private static parseDate(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Cannot parse "${value}" as date`);
    }
    return date;
  }

  private static parseDateTime(value: string): Date {
    return this.parseDate(value);
  }

  private static parseTime(value: string): string {
    // Return as string for now, could be enhanced to return Date or time object
    return value;
  }
}