class PatientHearingTestComponent {
    render(hearingTests) {
        if (!hearingTests || hearingTests.length === 0) {
            return '<p>No hearing test data available.</p>';
        }

        const test = hearingTests[0]; // Assuming we display the first test

        return `
            <div class="hearing-test-container">
                <h3>Hearing Test Results</h3>
                <p><strong>Test Date:</strong> ${new Date(test.testDate).toLocaleDateString()}</p>
                <p><strong>Audiologist:</strong> ${test.audiologist || 'N/A'}</p>
                <div class="audiogram-placeholder">
                    <!-- Audiogram will be rendered here -->
                    <p>Audiogram chart will be displayed here.</p>
                </div>
            </div>
        `;
    }
}

window.PatientHearingTestComponent = PatientHearingTestComponent;