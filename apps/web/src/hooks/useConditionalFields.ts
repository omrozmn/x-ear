import { useMemo, useState } from 'react';
import {
  InvoiceFormSchema,
  InvoiceFormData,
  InvoiceFieldDefinition,
  InvoiceFieldSection
} from '../types/invoice-schema';

interface ConditionalFieldsHookResult {
  visibleSections: InvoiceFieldSection[];
  visibleFields: Record<string, InvoiceFieldDefinition[]>;
  shouldShowSection: (section: InvoiceFieldSection) => boolean;
  shouldShowField: (field: InvoiceFieldDefinition, sectionData: Record<string, unknown>) => boolean;
  getFieldDependencies: (sectionName: string, fieldId: string) => string[];
  validateDependencies: (formData: InvoiceFormData) => Record<string, string[]>;
}

export const useConditionalFields = (
  schema: InvoiceFormSchema,
  formData: InvoiceFormData
): ConditionalFieldsHookResult => {

  // Check if a section should be visible based on conditions
  const shouldShowSection = (section: InvoiceFieldSection): boolean => {
    if (!section.conditional) return true;

    const { dependsOn, condition, value } = section.conditional;
    const fieldValue = getNestedValue(formData, dependsOn);

    return evaluateCondition(fieldValue, condition, value);
  };

  // Check if a field should be visible based on conditions
  const shouldShowField = (field: InvoiceFieldDefinition, sectionData: Record<string, unknown>): boolean => {
    if (!field.conditional) return true;

    const { dependsOn, condition, value } = field.conditional;
    const fieldValue = sectionData[dependsOn];

    return evaluateCondition(fieldValue, condition, value);
  };

  // Evaluate condition based on type
  const evaluateCondition = (
    fieldValue: unknown,
    condition: string,
    expectedValue: string | number | boolean
  ): boolean => {
    switch (condition) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      default:
        return true;
    }
  };

  // Get nested value from form data
  const getNestedValue = (data: Record<string, unknown>, path: string): unknown => {
    if (path.includes('.')) {
      const [section, field] = path.split('.');
      const sectionData = data[section] as Record<string, unknown> | undefined;
      return sectionData?.[field];
    }
    return data[path];
  };

  // Get visible sections based on invoice type and conditions
  const visibleSections = useMemo(() => {
    const invoiceTypeConfig = schema.invoiceTypes[formData.invoiceType];

    if (!invoiceTypeConfig) return [];

    const sections: InvoiceFieldSection[] = [];

    // Add required sections
    invoiceTypeConfig.requiredFields.forEach(sectionKey => {
      const section = schema.fieldDefinitions[sectionKey];
      if (section) {
        sections.push(section);
      }
    });

    // Add conditional sections that meet their conditions
    invoiceTypeConfig.conditionalFields.forEach(sectionKey => {
      const section = schema.fieldDefinitions[sectionKey];
      if (section && shouldShowSection(section)) {
        sections.push(section);
      }
    });

    return sections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, formData.invoiceType, formData]); // shouldShowSection is stable

  // Get visible fields for each section
  const visibleFields = useMemo(() => {
    const result: Record<string, InvoiceFieldDefinition[]> = {};

    visibleSections.forEach(section => {
      const sectionData = (formData as any)[section.name] || ({} as Record<string, unknown>);
      result[section.name] = Object.values(section.fields).filter(field =>
        shouldShowField(field, sectionData)
      );
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSections, formData]); // shouldShowField is stable

  // Get field dependencies for a specific field
  const getFieldDependencies = (sectionName: string, fieldId: string): string[] => {
    const dependencies: string[] = [];

    // Check section dependencies
    const section = schema.fieldDefinitions[sectionName];
    if (section?.conditional) {
      dependencies.push(section.conditional.dependsOn);
    }

    // Check field dependencies
    const field = section?.fields[fieldId];
    if (field?.conditional) {
      const depPath = field.conditional.dependsOn;
      if (depPath.includes('.')) {
        dependencies.push(depPath);
      } else {
        dependencies.push(`${sectionName}.${depPath}`);
      }
    }

    return dependencies;
  };

  // Validate all dependencies and return missing ones
  const validateDependencies = (data: InvoiceFormData): Record<string, string[]> => {
    const missingDependencies: Record<string, string[]> = {};

    visibleSections.forEach(section => {
      const sectionData = (formData as any)[section.name] || ({} as Record<string, unknown>);

      Object.values(section.fields).forEach(field => {
        if (shouldShowField(field, sectionData) && field.conditional) {
          const { dependsOn } = field.conditional;
          const depValue = sectionData[dependsOn];

          if (depValue === undefined || depValue === null || depValue === '') {
            const fieldKey = `${section.name}.${field.id}`;
            if (!missingDependencies[fieldKey]) {
              missingDependencies[fieldKey] = [];
            }
            missingDependencies[fieldKey].push(dependsOn);
          }
        }
      });
    });

    return missingDependencies;
  };

  return {
    visibleSections,
    visibleFields,
    shouldShowSection,
    shouldShowField,
    getFieldDependencies,
    validateDependencies
  };
};

// Hook for managing field visibility state
export const useFieldVisibility = (
  schema: InvoiceFormSchema,
  formData: InvoiceFormData
) => {
  const {
    visibleSections,
    visibleFields,
    shouldShowSection,
    shouldShowField
  } = useConditionalFields(schema, formData);

  // Get all visible field paths
  const visibleFieldPaths = useMemo(() => {
    const paths: string[] = [];

    visibleSections.forEach(section => {
      const fields = visibleFields[section.name] || [];
      fields.forEach(field => {
        paths.push(`${section.name}.${field.id}`);
      });
    });

    return paths;
  }, [visibleSections, visibleFields]);

  // Check if a specific field path is visible
  const isFieldVisible = (sectionName: string, fieldId: string): boolean => {
    return visibleFieldPaths.includes(`${sectionName}.${fieldId}`);
  };

  // Get section visibility status
  const getSectionVisibility = () => {
    const visibility: Record<string, boolean> = {};

    Object.keys(schema.fieldDefinitions).forEach(sectionKey => {
      const section = schema.fieldDefinitions[sectionKey];
      visibility[sectionKey] = shouldShowSection(section);
    });

    return visibility;
  };

  // Get field visibility status for a section
  const getFieldVisibility = (sectionName: string) => {
    const section = schema.fieldDefinitions[sectionName];
    if (!section) return {};

    const sectionData = (formData[sectionName] || {}) as Record<string, unknown>;
    const visibility: Record<string, boolean> = {};

    Object.values(section.fields).forEach(field => {
      visibility[field.id] = shouldShowField(field, sectionData);
    });

    return visibility;
  };

  return {
    visibleSections,
    visibleFields,
    visibleFieldPaths,
    isFieldVisible,
    getSectionVisibility,
    getFieldVisibility
  };
};

// Hook for managing conditional field animations
export const useFieldAnimations = (
  visibleFieldPaths: string[],
  animationDuration: number = 300
) => {
  const [animatingFields, setAnimatingFields] = useState<Set<string>>(new Set());

  const animateFieldChange = (fieldPath: string) => {
    setAnimatingFields((prev: Set<string>) => new Set(prev).add(fieldPath));

    setTimeout(() => {
      setAnimatingFields((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(fieldPath);
        return newSet;
      });
    }, animationDuration);
  };

  const isFieldAnimating = (fieldPath: string): boolean => {
    return animatingFields.has(fieldPath);
  };

  return {
    animateFieldChange,
    isFieldAnimating
  };
};