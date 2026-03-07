/**
 * Patient Stats Cards Component
 * Displays summary statistics cards for patient information - matches legacy implementation exactly
 */
class PatientStatsCardsComponent {
    constructor() {
        this.patient = null;
        this.statsData = [];
    }

    /**
     * Initialize the component with patient data
     * @param {Object} patient - The patient data object
     */
    init(patient) {
        this.patient = patient;
        this.prepareStatsData();
    }

    /**
     * Prepare the statistics data - exactly matching legacy implementation
     */
    prepareStatsData() {
        if (!this.patient) return;

        // Set stats data exactly as in legacy system
        this.statsData = [
            new StatsCardWidget({
                title: 'Toplam Randevu',
                value: '5',
                color: 'blue',
                icon: `<svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Cihaz Sayısı',
                value: '1',
                color: 'green',
                icon: `<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Toplam Harcama',
                value: '₺15.000',
                color: 'yellow',
                icon: `<svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Müşteri Süresi',
                value: '2 ay',
                color: 'purple',
                icon: `<svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>`
            })
        ];
    }

    /**
     * Render the stats cards - exactly matching legacy implementation
     * @returns {string} The HTML for the stats cards
     */
    render() {
        if (this.statsData.length === 0) {
            return '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"></div>';
        }

        const cardsHtml = this.statsData.map(card => card.render()).join('');
        return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${cardsHtml}</div>`;
    }
}