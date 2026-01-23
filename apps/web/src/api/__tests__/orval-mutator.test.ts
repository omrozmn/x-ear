
import { describe, it, expect } from 'vitest';
import { hybridCamelize, generateIdempotencyKey } from '../orval-mutator';

describe('Canonical Case Conversion', () => {
    it('should camelize keys consistently', () => {
        const input = {
            first_name: 'John',
            last_name: 'Doe',
            address_info: {
                city_name: 'Istanbul',
                postal_code: 34000
            }
        };

        const expected = {
            firstName: 'John',
            lastName: 'Doe',
            addressInfo: {
                cityName: 'Istanbul',
                postalCode: 34000
            }
        };

        const result = hybridCamelize(input) as Record<string, unknown>;
        expect(result).toEqual(expected);
        // Ensure NO snake_case keys remain
        expect(result).not.toHaveProperty('first_name');
        expect(result.addressInfo).not.toHaveProperty('city_name');
    });

    it('should handle arrays', () => {
        const input = [
            { item_id: 1 },
            { item_id: 2 }
        ];
        const expected = [
            { itemId: 1 },
            { itemId: 2 }
        ];
        expect(hybridCamelize(input)).toEqual(expected);
    });

    it('should handle primitives', () => {
        expect(hybridCamelize('hello')).toBe('hello');
        expect(hybridCamelize(123)).toBe(123);
        expect(hybridCamelize(null)).toBe(null);
    });
});

describe('Idempotency Key Generation', () => {
    it('should generate unique keys', () => {
        const key1 = generateIdempotencyKey();
        const key2 = generateIdempotencyKey();
        expect(key1).not.toBe(key2);
        expect(key1).toContain('-');
    });
});
