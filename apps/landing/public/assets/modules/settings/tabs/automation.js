export class AutomationSettings {
  async render() {
    const response = await fetch('/public/automation-status.html');
    const html = await response.text();
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Otomasyon Ayarları</h2>
        <div id="automationRules">${html}</div>
      </div>
    `;
  }
  bindEvents() {
    // Automation rules will have their own scripts, so no specific binding here for now
  }
}
