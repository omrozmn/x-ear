/**
 * Category Helper - Utility functions for product categories
 */

class CategoryHelper {
    static categories = {
        // Canonical tokens only
        'hearing_aid': 'İşitme Cihazı',
        'aksesuar': 'Aksesuar',
        'pil': 'Pil',
        'bakim': 'Bakım'
    };

    static getCategoryText(categoryKey) {
        return this.categories[categoryKey] || categoryKey;
    }

    static getCategoryOptions() {
        return Object.entries(this.categories).map(([key, text]) => ({
            value: key,
            text: text
        }));
    }

    static renderCategoryDropdown(id, selectedValue = '', required = false, className = 'form-input') {
        const options = this.getCategoryOptions();
        const requiredAttr = required ? 'required' : '';
        
        return `
            <select class="${className}" id="${id}" ${requiredAttr}>
                <option value="">Kategori seçin</option>
                ${options.map(option => 
                    `<option value="${option.value}" ${selectedValue === option.value ? 'selected' : ''}>
                        ${option.text}
                    </option>`
                ).join('')}
            </select>
        `;
    }

    static getCategoryColors(categoryKey) {
        const colorMap = {
            'hearing_aid': 'bg-blue-100 text-blue-800',
            'aksesuar': 'bg-green-100 text-green-800',
            'pil': 'bg-yellow-100 text-yellow-800',
            'bakim': 'bg-purple-100 text-purple-800'
        };
         return colorMap[categoryKey] || 'bg-gray-100 text-gray-800';
     }

    static validateCategory(categoryKey) {
        return Object.keys(this.categories).includes(categoryKey);
    }

    static getAllCategoryKeys() {
        return Object.keys(this.categories);
    }
}

// Make it available globally
window.CategoryHelper = CategoryHelper;
