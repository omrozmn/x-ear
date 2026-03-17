/**
 * Default barcode label template configuration.
 *
 * Matches the layout produced by the existing printBarcodeLabels function:
 * - 200x100px label
 * - Product name at top
 * - Barcode visual in centre
 * - Barcode number below
 * - Brand/model info at bottom
 *
 * This template is auto-created in the label service when no templates exist.
 */
import type { CreateTemplateInput, ComponentConfig } from '../services/label-api.service';

const DEFAULT_TEMPLATE_NAME = 'Varsayilan Barkod Etiketi';

const components: ComponentConfig[] = [
  // Product name (top)
  {
    id: 'product-name',
    type: 'text',
    x: 10,
    y: 5,
    width: 180,
    height: 18,
    rotation: 0,
    zIndex: 1,
    properties: {
      text: '{{name}}',
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      color: '#000000',
    },
  },
  // Barcode visual (centre)
  {
    id: 'barcode-visual',
    type: 'barcode',
    x: 20,
    y: 26,
    width: 160,
    height: 36,
    rotation: 0,
    zIndex: 2,
    properties: {
      data: '{{barcode}}',
      symbology: 'code128',
      showText: false,
      barColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  // Barcode number (below barcode)
  {
    id: 'barcode-number',
    type: 'text',
    x: 10,
    y: 64,
    width: 180,
    height: 14,
    rotation: 0,
    zIndex: 3,
    properties: {
      text: '{{barcode}}',
      fontSize: 11,
      fontWeight: 'bold',
      fontFamily: "'Courier New', monospace",
      align: 'center',
      color: '#000000',
    },
  },
  // Brand / model info (bottom)
  {
    id: 'brand-model',
    type: 'text',
    x: 10,
    y: 80,
    width: 130,
    height: 14,
    rotation: 0,
    zIndex: 4,
    properties: {
      text: '{{brand}} {{model}}',
      fontSize: 10,
      fontFamily: 'Arial, sans-serif',
      align: 'left',
      color: '#666666',
    },
  },
  // Price (bottom-right)
  {
    id: 'price',
    type: 'text',
    x: 140,
    y: 80,
    width: 50,
    height: 14,
    rotation: 0,
    zIndex: 5,
    properties: {
      text: '{{price}}',
      fontSize: 10,
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      align: 'right',
      color: '#000000',
    },
  },
];

export const defaultBarcodeLabelTemplate: CreateTemplateInput = {
  name: DEFAULT_TEMPLATE_NAME,
  layout: {
    width: 200,
    height: 100,
    unit: 'px',
    dpi: 96,
    orientation: 'landscape',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  components,
};

export const DEFAULT_LABEL_TEMPLATE_NAME = DEFAULT_TEMPLATE_NAME;
