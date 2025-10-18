"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  FileParserService: () => FileParserService,
  FuzzySearch: () => FuzzySearch,
  FuzzySearchPresets: () => FuzzySearchPresets,
  PatientService: () => PatientService,
  TypeConverter: () => TypeConverter,
  addDaysToDate: () => addDaysToDate,
  calculateAge: () => calculateAge,
  capitalizeWords: () => capitalizeWords,
  clearStorage: () => clearStorage,
  createFuzzySearch: () => createFuzzySearch,
  createStorageManager: () => createStorageManager,
  formatDate: () => formatDate,
  formatDateTime: () => formatDateTime,
  formatDateTurkish: () => formatDateTurkish,
  formatFileSize: () => formatFileSize,
  formatMoney: () => formatMoney,
  formatNumber: () => formatNumber,
  formatPercentage: () => formatPercentage,
  formatPhoneNumber: () => formatPhoneNumber,
  formatTcNumber: () => formatTcNumber,
  fuzzySearch: () => fuzzySearch,
  getEndOfDay: () => getEndOfDay,
  getStartOfDay: () => getStartOfDay,
  getStorageItem: () => getStorageItem,
  getStorageKeys: () => getStorageKeys,
  getStorageUsage: () => getStorageUsage,
  isStorageAvailable: () => isStorageAvailable,
  isToday: () => isToday,
  isValidDate: () => isValidDate,
  maskSensitiveInfo: () => maskSensitiveInfo,
  removeStorageItem: () => removeStorageItem,
  setStorageItem: () => setStorageItem,
  toISOString: () => toISOString,
  truncateText: () => truncateText,
  useAdvancedFileUpload: () => useAdvancedFileUpload,
  useAdvancedFuzzySearch: () => useAdvancedFuzzySearch,
  useDragDropFileUpload: () => useDragDropFileUpload,
  useFileUpload: () => useFileUpload,
  useFuzzySearch: () => useFuzzySearch,
  useSimpleFileUpload: () => useSimpleFileUpload,
  useSimpleFuzzySearch: () => useSimpleFuzzySearch,
  validateDate: () => validateDate,
  validateEmail: () => validateEmail,
  validateLength: () => validateLength,
  validatePassword: () => validatePassword,
  validatePhoneNumber: () => validatePhoneNumber,
  validateRange: () => validateRange,
  validateRequired: () => validateRequired,
  validateTcNumber: () => validateTcNumber,
  validateUrl: () => validateUrl
});
module.exports = __toCommonJS(index_exports);

// src/domain/services/patient-service.ts
var PatientService = class {
  /**
   * Validates Turkish Citizenship Number (TC Kimlik No)
   */
  static validateTcNumber(tcNumber) {
    if (!tcNumber || tcNumber.length !== 11) return false;
    const digits = tcNumber.split("").map(Number);
    if (digits[0] === 0) return false;
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    const check1 = (sum1 * 7 - sum2) % 10;
    const check2 = (sum1 + sum2 + digits[9]) % 10;
    return digits[9] === check1 && digits[10] === check2;
  }
  /**
   * Calculates age from birth date
   */
  static calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = /* @__PURE__ */ new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birth.getDate()) {
      age--;
    }
    return age;
  }
  /**
   * Validates patient data before creation/update
   */
  static validatePatientData(data) {
    const errors = [];
    if ("tcNumber" in data && data.tcNumber && !this.validateTcNumber(data.tcNumber)) {
      errors.push("Invalid TC Number format");
    }
    if ("birthDate" in data && data.birthDate) {
      const birthDate = new Date(data.birthDate);
      const today = /* @__PURE__ */ new Date();
      if (birthDate > today) {
        errors.push("Birth date cannot be in the future");
      }
      const age = this.calculateAge(data.birthDate);
      if (age > 150) {
        errors.push("Invalid birth date - age cannot exceed 150 years");
      }
    }
    if ("contactInfo" in data && data.contactInfo?.phone) {
      const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
      if (!phoneRegex.test(data.contactInfo.phone.replace(/\s/g, ""))) {
        errors.push("Invalid Turkish phone number format");
      }
    }
    if ("contactInfo" in data && data.contactInfo?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contactInfo.email)) {
        errors.push("Invalid email format");
      }
    }
    return errors;
  }
  /**
   * Formats patient name for display
   */
  static formatPatientName(patient) {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }
  /**
   * Generates patient display ID
   */
  static generateDisplayId(patient) {
    const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
    const idSuffix = patient.id.slice(-4);
    return `${initials}-${idSuffix}`;
  }
  /**
   * Checks if patient data needs verification
   */
  static needsVerification(patient) {
    return !patient.contactInfo.phone || !patient.contactInfo.email || !patient.tcNumber;
  }
};

// src/hooks/useFuzzySearch.ts
var import_react = require("react");

// src/utils/fuzzy-search.ts
var import_fuse = __toESM(require("fuse.js"));
var FuzzySearch = class {
  constructor(data, options = {}) {
    this.originalData = data;
    const defaultOptions = {
      threshold: 0.3,
      // Lower = more strict matching
      distance: 100,
      // Maximum distance for fuzzy matching
      minMatchCharLength: 2,
      // Minimum character length to trigger search
      findAllMatches: false,
      // Stop at first match for performance
      includeScore: true,
      includeMatches: true,
      shouldSort: true,
      ...options
    };
    this.options = defaultOptions;
    this.fuse = new import_fuse.default(data, defaultOptions);
  }
  /**
   * Perform fuzzy search on the data
   */
  search(query) {
    if (!query || query.length < 2) {
      return this.originalData.map((item) => ({ item }));
    }
    const results = this.fuse.search(query);
    return results.map((result) => ({
      item: result.item,
      score: result.score,
      matches: result.matches
    }));
  }
  /**
   * Update the search data
   */
  setData(data) {
    this.originalData = data;
    this.fuse.setCollection(data);
  }
  /**
   * Add new items to the search data
   */
  addItems(items) {
    this.originalData = [...this.originalData, ...items];
    this.fuse.setCollection(this.originalData);
  }
  /**
   * Remove items from the search data
   */
  removeItems(predicate) {
    this.originalData = this.originalData.filter((item) => !predicate(item));
    this.fuse.setCollection(this.originalData);
  }
  /**
   * Get all original data
   */
  getAllData() {
    return this.originalData;
  }
  /**
   * Get search statistics
   */
  getStats() {
    return {
      totalItems: this.originalData.length,
      searchKeys: this.options.keys,
      threshold: this.options.threshold
    };
  }
};
function createFuzzySearch(data, options = {}) {
  return new FuzzySearch(data, options);
}
function fuzzySearch(data, query, options = {}) {
  const searcher = new FuzzySearch(data, options);
  return searcher.search(query);
}
var FuzzySearchPresets = {
  // For searching user names, titles, etc.
  strict: {
    threshold: 0.2,
    distance: 50,
    minMatchCharLength: 3
  },
  // For general purpose searching
  balanced: {
    threshold: 0.3,
    distance: 100,
    minMatchCharLength: 2
  },
  // For very lenient searching
  lenient: {
    threshold: 0.6,
    distance: 200,
    minMatchCharLength: 1
  },
  // For exact matching with typo tolerance
  exactWithTypos: {
    threshold: 0.1,
    distance: 20,
    minMatchCharLength: 3,
    findAllMatches: true
  }
};

// src/hooks/useFuzzySearch.ts
function useFuzzySearch(initialData, options = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    preset,
    ...fuzzyOptions
  } = options;
  const finalOptions = (0, import_react.useMemo)(() => {
    if (preset && FuzzySearchPresets[preset]) {
      return { ...FuzzySearchPresets[preset], ...fuzzyOptions };
    }
    return fuzzyOptions;
  }, [preset, fuzzyOptions]);
  const [query, setQueryState] = (0, import_react.useState)("");
  const [debouncedQuery, setDebouncedQuery] = (0, import_react.useState)("");
  const [isSearching, setIsSearching] = (0, import_react.useState)(false);
  const [data, setDataState] = (0, import_react.useState)(initialData);
  const fuzzySearch2 = (0, import_react.useMemo)(() => {
    return createFuzzySearch(data, finalOptions);
  }, [data, finalOptions]);
  (0, import_react.useEffect)(() => {
    if (query.length === 0) {
      setDebouncedQuery("");
      setIsSearching(false);
      return;
    }
    if (query.length < minQueryLength) {
      setDebouncedQuery("");
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs, minQueryLength]);
  const results = (0, import_react.useMemo)(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      return data.map((item) => ({ item }));
    }
    return fuzzySearch2.search(debouncedQuery);
  }, [debouncedQuery, fuzzySearch2, data, minQueryLength]);
  const totalResults = results.length;
  const hasResults = totalResults > 0;
  const setQuery = (0, import_react.useCallback)((newQuery) => {
    setQueryState(newQuery);
  }, []);
  const clearSearch = (0, import_react.useCallback)(() => {
    setQueryState("");
    setDebouncedQuery("");
    setIsSearching(false);
  }, []);
  const setData = (0, import_react.useCallback)((newData) => {
    setDataState(newData);
  }, []);
  const addItems = (0, import_react.useCallback)((items) => {
    setDataState((prevData) => [...prevData, ...items]);
  }, []);
  const removeItems = (0, import_react.useCallback)((predicate) => {
    setDataState((prevData) => prevData.filter((item) => !predicate(item)));
  }, []);
  const stats = (0, import_react.useMemo)(() => fuzzySearch2.getStats(), [fuzzySearch2]);
  return {
    results,
    query,
    setQuery,
    isSearching,
    totalResults,
    hasResults,
    clearSearch,
    setData,
    addItems,
    removeItems,
    stats
  };
}
function useSimpleFuzzySearch(data, query, options = {}) {
  const fuzzySearch2 = (0, import_react.useMemo)(() => {
    return createFuzzySearch(data, options);
  }, [data, options]);
  return (0, import_react.useMemo)(() => {
    if (!query || query.length < 2) {
      return data.map((item) => ({ item }));
    }
    return fuzzySearch2.search(query);
  }, [query, fuzzySearch2, data]);
}
function useAdvancedFuzzySearch(data, options = {}) {
  const { filter, sort, limit, ...searchOptions } = options;
  const searchResult = useFuzzySearch(data, searchOptions);
  const filteredResults = (0, import_react.useMemo)(() => {
    let results = searchResult.results;
    if (filter) {
      results = results.filter((result) => filter(result.item, result));
    }
    if (sort) {
      results = [...results].sort(sort);
    }
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }
    return results;
  }, [searchResult.results, filter, sort, limit]);
  return {
    ...searchResult,
    filteredResults
  };
}

// src/hooks/useFileUpload.ts
var import_react2 = require("react");

// src/services/file-parser.ts
var import_papaparse = __toESM(require("papaparse"));
var XLSX = __toESM(require("xlsx"));
var FileParserService = class {
  /**
   * Parse CSV file using Papa Parse
   */
  static async parseCSV(file, options = {}) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const {
        preview = false,
        previewRows = this.DEFAULT_PREVIEW_ROWS,
        hasHeaders = true,
        delimiter = "",
        skipEmptyLines = true,
        trimHeaders = true,
        transformHeader
      } = options;
      import_papaparse.default.parse(file, {
        header: false,
        // We'll handle headers manually for better control
        delimiter: delimiter || void 0,
        skipEmptyLines,
        preview: preview ? previewRows + (hasHeaders ? 1 : 0) : 0,
        encoding: options.encoding || "UTF-8",
        complete: (results) => {
          try {
            const parseTime = Date.now() - startTime;
            const allRows = results.data;
            if (allRows.length === 0) {
              reject({
                type: "INVALID_DATA",
                message: "File appears to be empty or contains no valid data"
              });
              return;
            }
            let headers = [];
            let dataRows = [];
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
              const maxColumns = Math.max(...allRows.map((row) => row.length));
              headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
              dataRows = allRows;
            }
            const previewData = preview ? dataRows.slice(0, previewRows) : dataRows;
            const parsedData = {
              headers,
              rows: dataRows,
              totalRows: dataRows.length,
              preview: previewData,
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || "text/csv",
                encoding: options.encoding || "UTF-8",
                delimiter: results.meta.delimiter,
                hasHeaders,
                parseTime
              }
            };
            resolve(parsedData);
          } catch (error) {
            reject({
              type: "PARSE_ERROR",
              message: "Failed to process CSV data",
              details: error
            });
          }
        },
        error: (error) => {
          reject({
            type: "PARSE_ERROR",
            message: `CSV parsing failed: ${error.message}`,
            details: error
          });
        }
      });
    });
  }
  /**
   * Parse Excel file using SheetJS
   */
  static async parseExcel(file, options = {}) {
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
            transformHeader
          } = options;
          const data = new Uint8Array(e.target?.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            reject({
              type: "INVALID_DATA",
              message: "Excel file contains no readable worksheets"
            });
            return;
          }
          const allRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            blankrows: false
          });
          if (allRows.length === 0) {
            reject({
              type: "INVALID_DATA",
              message: "Excel file appears to be empty"
            });
            return;
          }
          let headers = [];
          let dataRows = [];
          if (hasHeaders && allRows.length > 0) {
            const headerRow = allRows[0];
            headers = headerRow.map((header, index) => {
              let processedHeader = String(header || "");
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
            const maxColumns = Math.max(...allRows.map((row) => row.length));
            headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
            dataRows = allRows;
          }
          const previewData = preview ? dataRows.slice(0, previewRows) : dataRows;
          const parseTime = Date.now() - startTime;
          const parsedData = {
            headers,
            rows: dataRows,
            totalRows: dataRows.length,
            preview: previewData,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              hasHeaders,
              parseTime
            }
          };
          resolve(parsedData);
        } catch (error) {
          reject({
            type: "PARSE_ERROR",
            message: "Failed to parse Excel file",
            details: error
          });
        }
      };
      reader.onerror = () => {
        reject({
          type: "PARSE_ERROR",
          message: "Failed to read Excel file"
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }
  /**
   * Auto-detect file type and parse accordingly
   */
  static async parseFile(file, options = {}) {
    if (file.size > this.MAX_FILE_SIZE) {
      throw {
        type: "FILE_TOO_LARGE",
        message: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB)`
      };
    }
    const fileType = file.type || this.getFileTypeFromExtension(file.name);
    if (!this.SUPPORTED_TYPES.includes(fileType)) {
      throw {
        type: "UNSUPPORTED_FORMAT",
        message: `Unsupported file format: ${fileType}. Supported formats: CSV, Excel (.xlsx, .xls)`
      };
    }
    if (fileType === "text/csv" || fileType === "text/plain") {
      return this.parseCSV(file, options);
    } else if (fileType === "application/vnd.ms-excel" || fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return this.parseExcel(file, options);
    }
    throw {
      type: "UNSUPPORTED_FORMAT",
      message: `Unable to determine parser for file type: ${fileType}`
    };
  }
  /**
   * Get file type from extension when MIME type is not available
   */
  static getFileTypeFromExtension(fileName) {
    const extension = fileName.toLowerCase().split(".").pop();
    switch (extension) {
      case "csv":
        return "text/csv";
      case "xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "xls":
        return "application/vnd.ms-excel";
      case "txt":
        return "text/plain";
      default:
        return "application/octet-stream";
    }
  }
  /**
   * Validate parsed data structure
   */
  static validateParsedData(data) {
    return data && Array.isArray(data.headers) && Array.isArray(data.rows) && data.headers.length > 0 && typeof data.totalRows === "number" && data.metadata && typeof data.metadata.fileName === "string";
  }
  /**
   * Get file parsing statistics
   */
  static getParsingStats(data) {
    const columnStats = data.headers.map((header, index) => {
      const columnData = data.rows.map((row) => row[index]);
      const nonEmptyValues = columnData.filter((val) => val !== null && val !== void 0 && val !== "");
      return {
        name: header,
        index,
        totalValues: columnData.length,
        nonEmptyValues: nonEmptyValues.length,
        emptyValues: columnData.length - nonEmptyValues.length,
        fillRate: nonEmptyValues.length / columnData.length,
        sampleValues: nonEmptyValues.slice(0, 5)
      };
    });
    return {
      totalColumns: data.headers.length,
      totalRows: data.totalRows,
      parseTime: data.metadata.parseTime,
      fileSize: data.metadata.fileSize,
      columnStats
    };
  }
};
FileParserService.MAX_FILE_SIZE = 50 * 1024 * 1024;
// 50MB
FileParserService.DEFAULT_PREVIEW_ROWS = 10;
FileParserService.SUPPORTED_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain"
];

// src/utils/type-converter.ts
var TypeConverter = class {
  /**
   * Detect data type for a single value
   */
  static detectValueType(value, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    if (value === null || value === void 0) {
      return "null";
    }
    const strValue = String(value);
    const trimmedValue = opts.trimWhitespace ? strValue.trim() : strValue;
    if (opts.nullValues?.includes(trimmedValue.toLowerCase())) {
      return "null";
    }
    if (opts.booleanTrueValues?.includes(trimmedValue.toLowerCase()) || opts.booleanFalseValues?.includes(trimmedValue.toLowerCase())) {
      return "boolean";
    }
    if (this.isEmail(trimmedValue)) {
      return "email";
    }
    if (this.isUrl(trimmedValue)) {
      return "url";
    }
    if (this.isPhone(trimmedValue)) {
      return "phone";
    }
    if (this.isCurrency(trimmedValue, opts.currencySymbols || [])) {
      return "currency";
    }
    if (this.isPercentage(trimmedValue)) {
      return "percentage";
    }
    if (this.isDateTime(trimmedValue)) {
      return "datetime";
    }
    if (this.isDate(trimmedValue)) {
      return "date";
    }
    if (this.isTime(trimmedValue)) {
      return "time";
    }
    if (this.isInteger(trimmedValue, opts)) {
      return "integer";
    }
    if (this.isFloat(trimmedValue, opts)) {
      return "float";
    }
    return "string";
  }
  /**
   * Analyze column data and detect the most likely type
   */
  static analyzeColumn(values, columnName, columnIndex, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const nonEmptyValues = values.filter(
      (v) => v !== null && v !== void 0 && String(v).trim() !== ""
    );
    if (nonEmptyValues.length === 0) {
      return {
        columnName,
        columnIndex,
        detectedType: "string",
        confidence: 0,
        totalValues: values.length,
        nonEmptyValues: 0,
        nullValues: values.length,
        uniqueValues: 0,
        samples: [],
        convertedSamples: [],
        errors: ["Column contains no data"]
      };
    }
    const typeCounts = {
      string: 0,
      number: 0,
      integer: 0,
      float: 0,
      boolean: 0,
      date: 0,
      datetime: 0,
      time: 0,
      email: 0,
      url: 0,
      phone: 0,
      currency: 0,
      percentage: 0,
      null: 0,
      unknown: 0
    };
    const samples = nonEmptyValues.slice(0, 10);
    const convertedSamples = [];
    const errors = [];
    nonEmptyValues.forEach((value) => {
      const detectedType = this.detectValueType(value, opts);
      typeCounts[detectedType]++;
    });
    const sortedTypes = Object.entries(typeCounts).filter(([_, count]) => count > 0).sort(([, a], [, b]) => b - a);
    const [mostCommonType, mostCommonCount] = sortedTypes[0] || ["string", 0];
    const confidence = mostCommonCount / nonEmptyValues.length;
    samples.forEach((sample) => {
      try {
        const converted = this.convertValue(sample, mostCommonType, opts);
        convertedSamples.push(converted);
      } catch (error) {
        convertedSamples.push(sample);
        errors.push(`Failed to convert "${sample}": ${error}`);
      }
    });
    const suggestions = [];
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
      detectedType: mostCommonType,
      confidence,
      totalValues: values.length,
      nonEmptyValues: nonEmptyValues.length,
      nullValues: values.length - nonEmptyValues.length,
      uniqueValues: new Set(nonEmptyValues).size,
      samples,
      convertedSamples,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : void 0
    };
  }
  /**
   * Convert a value to the specified type
   */
  static convertValue(value, targetType, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    if (value === null || value === void 0) {
      return null;
    }
    const strValue = String(value);
    const trimmedValue = opts.trimWhitespace ? strValue.trim() : strValue;
    switch (targetType) {
      case "null":
        return null;
      case "boolean":
        if (opts.booleanTrueValues?.includes(trimmedValue.toLowerCase())) {
          return true;
        }
        if (opts.booleanFalseValues?.includes(trimmedValue.toLowerCase())) {
          return false;
        }
        throw new Error(`Cannot convert "${trimmedValue}" to boolean`);
      case "integer":
        const intValue = this.parseNumber(trimmedValue, opts);
        if (!Number.isInteger(intValue)) {
          throw new Error(`"${trimmedValue}" is not a valid integer`);
        }
        return intValue;
      case "float":
      case "number":
        return this.parseNumber(trimmedValue, opts);
      case "currency":
        return this.parseCurrency(trimmedValue, opts);
      case "percentage":
        return this.parsePercentage(trimmedValue);
      case "date":
        return this.parseDate(trimmedValue);
      case "datetime":
        return this.parseDateTime(trimmedValue);
      case "time":
        return this.parseTime(trimmedValue);
      case "email":
      case "url":
      case "phone":
      case "string":
      default:
        return trimmedValue;
    }
  }
  /**
   * Convert entire column data
   */
  static convertColumn(values, targetType, options = {}) {
    const converted = [];
    const errors = [];
    values.forEach((value, index) => {
      try {
        const convertedValue = this.convertValue(value, targetType, options);
        converted.push(convertedValue);
      } catch (error) {
        converted.push(value);
        errors.push({
          index,
          value,
          error: String(error)
        });
      }
    });
    return { converted, errors };
  }
  // Type detection helper methods
  static isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
  static isUrl(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  static isPhone(value) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanValue = value.replace(/[\s\-\(\)\.]/g, "");
    return phoneRegex.test(cleanValue) && cleanValue.length >= 7;
  }
  static isCurrency(value, symbols) {
    const hasSymbol = symbols.some((symbol) => value.includes(symbol));
    if (!hasSymbol) return false;
    const numericPart = value.replace(/[^\d\.,\-]/g, "");
    return this.isFloat(numericPart, {});
  }
  static isPercentage(value) {
    return value.includes("%") && this.isFloat(value.replace("%", ""), {});
  }
  static isInteger(value, options) {
    try {
      const num = this.parseNumber(value, options);
      return Number.isInteger(num);
    } catch {
      return false;
    }
  }
  static isFloat(value, options) {
    try {
      const num = this.parseNumber(value, options);
      return !isNaN(num) && isFinite(num);
    } catch {
      return false;
    }
  }
  static isDate(value) {
    const dateRegex = /^\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}$/;
    return dateRegex.test(value) && !isNaN(Date.parse(value));
  }
  static isDateTime(value) {
    const dateTimeRegex = /^\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}\s+\d{1,2}:\d{2}(:\d{2})?/;
    return dateTimeRegex.test(value) && !isNaN(Date.parse(value));
  }
  static isTime(value) {
    const timeRegex = /^\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i;
    return timeRegex.test(value);
  }
  // Parsing helper methods
  static parseNumber(value, options) {
    const { decimalSeparator = ".", thousandsSeparator = "," } = options;
    let cleanValue = value.replace(/\s/g, "");
    if (thousandsSeparator && thousandsSeparator !== decimalSeparator) {
      cleanValue = cleanValue.replace(new RegExp(`\\${thousandsSeparator}`, "g"), "");
    }
    if (decimalSeparator !== ".") {
      cleanValue = cleanValue.replace(decimalSeparator, ".");
    }
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      throw new Error(`Cannot parse "${value}" as number`);
    }
    return num;
  }
  static parseCurrency(value, options) {
    const cleanValue = value.replace(/[^\d\.,\-]/g, "");
    return this.parseNumber(cleanValue, options);
  }
  static parsePercentage(value) {
    const numericValue = value.replace("%", "");
    return parseFloat(numericValue) / 100;
  }
  static parseDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Cannot parse "${value}" as date`);
    }
    return date;
  }
  static parseDateTime(value) {
    return this.parseDate(value);
  }
  static parseTime(value) {
    return value;
  }
};
TypeConverter.DEFAULT_OPTIONS = {
  dateFormats: [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "DD-MM-YYYY",
    "MM-DD-YYYY",
    "YYYY/MM/DD",
    "DD.MM.YYYY",
    "YYYY-MM-DD HH:mm:ss",
    "DD/MM/YYYY HH:mm:ss",
    "MM/DD/YYYY HH:mm:ss"
  ],
  currencySymbols: ["$", "\u20AC", "\xA3", "\xA5", "\u20BA", "\u20B9"],
  decimalSeparator: ".",
  thousandsSeparator: ",",
  booleanTrueValues: ["true", "yes", "y", "1", "on", "enabled", "active"],
  booleanFalseValues: ["false", "no", "n", "0", "off", "disabled", "inactive"],
  nullValues: ["", "null", "NULL", "nil", "NIL", "n/a", "N/A", "undefined"],
  trimWhitespace: true,
  strictMode: false
};

// src/hooks/useFileUpload.ts
var DEFAULT_OPTIONS = {
  maxFileSize: 10 * 1024 * 1024,
  // 10MB
  allowedTypes: [".csv", ".xlsx", ".xls"],
  previewRows: 10,
  autoDetectTypes: true,
  parseOptions: {
    hasHeaders: true,
    skipEmptyLines: true,
    trimHeaders: true
  },
  conversionOptions: {
    trimWhitespace: true,
    strictMode: false
  }
};
function useFileUpload(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parseOptionsRef = (0, import_react2.useRef)(opts.parseOptions || {});
  const conversionOptionsRef = (0, import_react2.useRef)(opts.conversionOptions || {});
  const [state, setState] = (0, import_react2.useState)({
    file: null,
    isUploading: false,
    isProcessing: false,
    progress: 0,
    error: null,
    parsedData: null,
    columnTypes: null,
    previewData: null
  });
  const validateFile = (0, import_react2.useCallback)((file) => {
    if (opts.maxFileSize && file.size > opts.maxFileSize) {
      return `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(opts.maxFileSize / 1024 / 1024)}MB)`;
    }
    if (opts.allowedTypes && opts.allowedTypes.length > 0) {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!opts.allowedTypes.includes(fileExtension)) {
        return `File type "${fileExtension}" is not allowed. Allowed types: ${opts.allowedTypes.join(", ")}`;
      }
    }
    return null;
  }, [opts.maxFileSize, opts.allowedTypes]);
  const uploadFile = (0, import_react2.useCallback)(async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }
    setState((prev) => ({
      ...prev,
      file,
      isUploading: true,
      error: null,
      progress: 0
    }));
    try {
      for (let i = 0; i <= 100; i += 10) {
        setState((prev) => ({ ...prev, progress: i }));
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      setState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100
      }));
      if (opts.autoDetectTypes) {
        await processFile();
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : "Upload failed"
      }));
    }
  }, [validateFile, opts.autoDetectTypes]);
  const processFile = (0, import_react2.useCallback)(async () => {
    if (!state.file) {
      setState((prev) => ({ ...prev, error: "No file selected" }));
      return;
    }
    setState((prev) => ({
      ...prev,
      isProcessing: true,
      error: null
    }));
    try {
      const parsedData = await FileParserService.parseFile(
        state.file,
        parseOptionsRef.current
      );
      let columnTypes = null;
      if (opts.autoDetectTypes && parsedData.rows.length > 0) {
        columnTypes = parsedData.headers.map((header, index) => {
          const columnValues = parsedData.rows.map((row) => row[index]);
          return TypeConverter.analyzeColumn(
            columnValues,
            header,
            index,
            conversionOptionsRef.current
          );
        });
      }
      const previewData = parsedData.rows.slice(0, opts.previewRows || 10);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        parsedData,
        columnTypes,
        previewData
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? `Parse error: ${error.message}` : "Processing failed";
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
    }
  }, [state.file, opts.autoDetectTypes, opts.previewRows]);
  const convertColumn = (0, import_react2.useCallback)(async (columnIndex, targetType) => {
    if (!state.parsedData || !state.columnTypes) {
      setState((prev) => ({ ...prev, error: "No data to convert" }));
      return;
    }
    try {
      const columnValues = state.parsedData.rows.map((row) => row[columnIndex]);
      const { converted, errors } = TypeConverter.convertColumn(
        columnValues,
        targetType,
        conversionOptionsRef.current
      );
      const newData = state.parsedData.rows.map((row, rowIndex) => {
        const newRow = [...row];
        newRow[columnIndex] = converted[rowIndex];
        return newRow;
      });
      const newColumnTypes = [...state.columnTypes];
      newColumnTypes[columnIndex] = {
        ...newColumnTypes[columnIndex],
        detectedType: targetType,
        confidence: errors.length === 0 ? 1 : 1 - errors.length / columnValues.length,
        errors: errors.map((e) => e.error)
      };
      setState((prev) => ({
        ...prev,
        parsedData: prev.parsedData ? { ...prev.parsedData, rows: newData } : null,
        columnTypes: newColumnTypes,
        previewData: newData.slice(0, opts.previewRows || 10)
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Conversion failed"
      }));
    }
  }, [state.parsedData, state.columnTypes, opts.previewRows]);
  const convertAllColumns = (0, import_react2.useCallback)(async () => {
    if (!state.columnTypes) {
      setState((prev) => ({ ...prev, error: "No column type information available" }));
      return;
    }
    try {
      for (const columnType of state.columnTypes) {
        await convertColumn(columnType.columnIndex, columnType.detectedType);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Batch conversion failed"
      }));
    }
  }, [state.columnTypes, convertColumn]);
  const reset = (0, import_react2.useCallback)(() => {
    setState({
      file: null,
      isUploading: false,
      isProcessing: false,
      progress: 0,
      error: null,
      parsedData: null,
      columnTypes: null,
      previewData: null
    });
  }, []);
  const removeFile = (0, import_react2.useCallback)(() => {
    setState((prev) => ({
      ...prev,
      file: null,
      parsedData: null,
      columnTypes: null,
      previewData: null,
      error: null
    }));
  }, []);
  const updateParseOptions = (0, import_react2.useCallback)((newOptions) => {
    parseOptionsRef.current = { ...parseOptionsRef.current, ...newOptions };
  }, []);
  const updateConversionOptions = (0, import_react2.useCallback)((newOptions) => {
    conversionOptionsRef.current = { ...conversionOptionsRef.current, ...newOptions };
  }, []);
  const getPreviewData = (0, import_react2.useCallback)((rows) => {
    if (!state.parsedData) return [];
    const numRows = rows || opts.previewRows || 10;
    return state.parsedData.rows.slice(0, numRows);
  }, [state.parsedData, opts.previewRows]);
  const downloadProcessedData = (0, import_react2.useCallback)((filename) => {
    if (!state.parsedData) {
      setState((prev) => ({ ...prev, error: "No data to download" }));
      return;
    }
    try {
      const csvContent = [
        state.parsedData.headers.join(","),
        ...state.parsedData.rows.map(
          (row) => row.map(
            (cell) => typeof cell === "string" && cell.includes(",") ? `"${cell.replace(/"/g, '""')}"` : String(cell)
          ).join(",")
        )
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename || `processed_${state.file?.name || "data.csv"}`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Download failed"
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
      downloadProcessedData
    }
  };
}
function useSimpleFileUpload() {
  return useFileUpload({
    autoDetectTypes: false,
    previewRows: 5
  });
}
function useAdvancedFileUpload(options) {
  return useFileUpload({
    autoDetectTypes: true,
    previewRows: 20,
    ...options
  });
}
function useDragDropFileUpload(options) {
  const fileUpload = useFileUpload(options);
  const [isDragOver, setIsDragOver] = (0, import_react2.useState)(false);
  const handleDragOver = (0, import_react2.useCallback)((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = (0, import_react2.useCallback)((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleDrop = (0, import_react2.useCallback)(async (e) => {
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
      onDrop: handleDrop
    },
    isDragOver
  };
}

// src/utils/date-utils.ts
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var formatDate = (date, formatStr = "dd.MM.yyyy") => {
  try {
    const dateObj = typeof date === "string" ? (0, import_date_fns.parseISO)(date) : date;
    if (!(0, import_date_fns.isValid)(dateObj)) return "";
    return (0, import_date_fns.format)(dateObj, formatStr, { locale: import_locale.tr });
  } catch {
    return "";
  }
};
var formatDateTurkish = (date) => {
  return formatDate(date, "dd MMMM yyyy");
};
var formatDateTime = (date) => {
  return formatDate(date, "dd.MM.yyyy HH:mm");
};
var calculateAge = (birthDate) => {
  try {
    const birth = typeof birthDate === "string" ? (0, import_date_fns.parseISO)(birthDate) : birthDate;
    if (!(0, import_date_fns.isValid)(birth)) return 0;
    return (0, import_date_fns.differenceInYears)(/* @__PURE__ */ new Date(), birth);
  } catch {
    return 0;
  }
};
var isToday = (date) => {
  try {
    const dateObj = typeof date === "string" ? (0, import_date_fns.parseISO)(date) : date;
    if (!(0, import_date_fns.isValid)(dateObj)) return false;
    const today = /* @__PURE__ */ new Date();
    return formatDate(dateObj, "yyyy-MM-dd") === formatDate(today, "yyyy-MM-dd");
  } catch {
    return false;
  }
};
var getStartOfDay = (date) => {
  const dateObj = typeof date === "string" ? (0, import_date_fns.parseISO)(date) : date;
  return (0, import_date_fns.startOfDay)(dateObj);
};
var getEndOfDay = (date) => {
  const dateObj = typeof date === "string" ? (0, import_date_fns.parseISO)(date) : date;
  return (0, import_date_fns.endOfDay)(dateObj);
};
var addDaysToDate = (date, days) => {
  const dateObj = typeof date === "string" ? (0, import_date_fns.parseISO)(date) : date;
  return (0, import_date_fns.addDays)(dateObj, days);
};
var toISOString = (date) => {
  return date.toISOString();
};
var isValidDate = (dateString) => {
  try {
    const date = (0, import_date_fns.parseISO)(dateString);
    return (0, import_date_fns.isValid)(date);
  } catch {
    return false;
  }
};

// src/utils/format-utils.ts
var formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90")) {
    const number = digits.slice(2);
    if (number.length === 10) {
      return `+90 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 8)} ${number.slice(8)}`;
    }
  } else if (digits.startsWith("0") && digits.length === 11) {
    const number = digits.slice(1);
    return `0${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 8)} ${number.slice(8)}`;
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  return phone;
};
var formatTcNumber = (tcNumber) => {
  if (!tcNumber) return "";
  const digits = tcNumber.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  return tcNumber;
};
var formatMoney = (money) => {
  if (!money || money.amount === void 0) return "";
  const formatter = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: money.currency || "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format(money.amount);
};
var formatNumber = (number, decimals = 0) => {
  if (number === void 0 || number === null) return "";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};
var formatPercentage = (value, decimals = 1) => {
  if (value === void 0 || value === null) return "";
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};
var capitalizeWords = (text) => {
  if (!text) return "";
  return text.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};
var truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
};
var formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
var maskSensitiveInfo = (text, visibleChars = 4) => {
  if (!text || text.length <= visibleChars) return text;
  const visible = text.slice(-visibleChars);
  const masked = "*".repeat(text.length - visibleChars);
  return masked + visible;
};

// src/utils/validation-utils.ts
var validateTcNumber = (tcNumber) => {
  if (!tcNumber || tcNumber.length !== 11) return false;
  const digits = tcNumber.split("").map(Number);
  if (digits[0] === 0) return false;
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const check1 = (sum1 * 7 - sum2) % 10;
  const check2 = (sum1 + sum2 + digits[9]) % 10;
  return digits[9] === check1 && digits[10] === check2;
};
var validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};
var validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
var validatePassword = (password) => {
  const errors = [];
  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
var validateRequired = (value, fieldName) => {
  if (value === null || value === void 0 || value === "") {
    return `${fieldName} is required`;
  }
  return null;
};
var validateLength = (value, min, max, fieldName) => {
  if (!value) return null;
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters long`;
  }
  if (value.length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }
  return null;
};
var validateRange = (value, min, max, fieldName) => {
  if (value === null || value === void 0) return null;
  if (value < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (value > max) {
    return `${fieldName} must not exceed ${max}`;
  }
  return null;
};
var validateDate = (dateString, fieldName, options) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  const now = /* @__PURE__ */ new Date();
  if (options?.allowFuture === false && date > now) {
    return `${fieldName} cannot be in the future`;
  }
  if (options?.allowPast === false && date < now) {
    return `${fieldName} cannot be in the past`;
  }
  if (options?.minDate && date < options.minDate) {
    return `${fieldName} cannot be before ${options.minDate.toDateString()}`;
  }
  if (options?.maxDate && date > options.maxDate) {
    return `${fieldName} cannot be after ${options.maxDate.toDateString()}`;
  }
  return null;
};
var validateUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// src/utils/storage-utils.ts
var getStorageItem = (key, storageType = "localStorage", defaultValue) => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    const item = storage.getItem(key);
    if (item === null) {
      return defaultValue ?? null;
    }
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.warn(`Failed to get item from ${storageType}:`, error);
    return defaultValue ?? null;
  }
};
var setStorageItem = (key, value, storageType = "localStorage") => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
    storage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.warn(`Failed to set item in ${storageType}:`, error);
    return false;
  }
};
var removeStorageItem = (key, storageType = "localStorage") => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove item from ${storageType}:`, error);
    return false;
  }
};
var clearStorage = (storageType = "localStorage") => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    storage.clear();
    return true;
  } catch (error) {
    console.warn(`Failed to clear ${storageType}:`, error);
    return false;
  }
};
var getStorageKeys = (storageType = "localStorage") => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    return Object.keys(storage);
  } catch (error) {
    console.warn(`Failed to get keys from ${storageType}:`, error);
    return [];
  }
};
var isStorageAvailable = (storageType = "localStorage") => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    const testKey = "__storage_test__";
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};
var getStorageUsage = (storageType = "localStorage") => {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage;
    let used = 0;
    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        used += storage[key].length + key.length;
      }
    }
    const total = 5 * 1024 * 1024;
    const available = total - used;
    const percentage = used / total * 100;
    return {
      used,
      total,
      available,
      percentage: Math.round(percentage * 100) / 100
    };
  } catch (error) {
    console.warn(`Failed to get storage usage for ${storageType}:`, error);
    return { used: 0, total: 0, available: 0, percentage: 0 };
  }
};
var createStorageManager = (prefix, storageType = "localStorage") => {
  const prefixedKey = (key) => `${prefix}_${key}`;
  return {
    get: (key, defaultValue) => getStorageItem(prefixedKey(key), storageType, defaultValue),
    set: (key, value) => setStorageItem(prefixedKey(key), value, storageType),
    remove: (key) => removeStorageItem(prefixedKey(key), storageType),
    clear: () => {
      const keys = getStorageKeys(storageType);
      const prefixedKeys = keys.filter((key) => key.startsWith(`${prefix}_`));
      return prefixedKeys.every((key) => removeStorageItem(key, storageType));
    },
    getKeys: () => {
      const keys = getStorageKeys(storageType);
      return keys.filter((key) => key.startsWith(`${prefix}_`)).map((key) => key.replace(`${prefix}_`, ""));
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FileParserService,
  FuzzySearch,
  FuzzySearchPresets,
  PatientService,
  TypeConverter,
  addDaysToDate,
  calculateAge,
  capitalizeWords,
  clearStorage,
  createFuzzySearch,
  createStorageManager,
  formatDate,
  formatDateTime,
  formatDateTurkish,
  formatFileSize,
  formatMoney,
  formatNumber,
  formatPercentage,
  formatPhoneNumber,
  formatTcNumber,
  fuzzySearch,
  getEndOfDay,
  getStartOfDay,
  getStorageItem,
  getStorageKeys,
  getStorageUsage,
  isStorageAvailable,
  isToday,
  isValidDate,
  maskSensitiveInfo,
  removeStorageItem,
  setStorageItem,
  toISOString,
  truncateText,
  useAdvancedFileUpload,
  useAdvancedFuzzySearch,
  useDragDropFileUpload,
  useFileUpload,
  useFuzzySearch,
  useSimpleFileUpload,
  useSimpleFuzzySearch,
  validateDate,
  validateEmail,
  validateLength,
  validatePassword,
  validatePhoneNumber,
  validateRange,
  validateRequired,
  validateTcNumber,
  validateUrl
});
//# sourceMappingURL=index.js.map