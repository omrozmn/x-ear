import fs from 'fs';
import readline from 'readline';
import process from 'process';
import { chromium } from 'playwright';

const tenantId = process.argv[2];
const profileDir = process.argv[3];

if (!tenantId || !profileDir) {
  console.error('Usage: node whatsapp_bridge.mjs <tenantId> <profileDir>');
  process.exit(1);
}

fs.mkdirSync(profileDir, { recursive: true });

let context;
let page;
let monitorTimer;
let launchPromise;
let currentState = {
  type: 'state',
  status: 'starting',
  connected: false,
  qrCode: null,
  error: null,
};
let lastConnectedAt = 0;
const CONNECTED_GRACE_MS = 45000;

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function closeBrowserResources() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = undefined;
  }
  if (context) {
    await context.close().catch(() => {});
  }
  context = undefined;
  page = undefined;
}

async function launch() {
  context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    locale: 'tr-TR',
    viewport: { width: 1440, height: 1024 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-features=AutomationControlled',
    ],
  });
  page = context.pages()[0] ?? (await context.newPage());
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
  monitorTimer = setInterval(() => {
    detectState().catch((error) => {
      currentState = {
        ...currentState,
        status: 'error',
        connected: false,
        error: String(error),
      };
      emit(currentState);
    });
  }, 2500);
  await detectState();
}

async function detectState() {
  if (!page) {
    return;
  }

  try {
    const connected = await page
      .locator('#pane-side, [data-testid="chat-list-search"], [contenteditable="true"][role="textbox"]')
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);

    if (connected) {
      lastConnectedAt = Date.now();
      currentState = {
        type: 'state',
        status: 'connected',
        connected: true,
        qrCode: null,
        error: null,
      };
      emit(currentState);
      return;
    }

    const qrPayload = await page.evaluate(() => {
      const dataRefEl = document.querySelector('[data-ref^="https://wa.me/settings/linked_devices#"]');
      if (dataRefEl instanceof HTMLElement) {
        const nestedCanvas = dataRefEl.querySelector('canvas');
        if (nestedCanvas instanceof HTMLCanvasElement) {
          try {
            return nestedCanvas.toDataURL('image/png');
          } catch {
            // Fall through to generic canvas scan.
          }
        }
      }

      const canvases = Array.from(document.querySelectorAll('canvas'))
        .map((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return {
            canvas,
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height,
          };
        })
        .filter((item) => item.width >= 120 && item.height >= 120)
        .sort((a, b) => b.area - a.area);

      const candidate = canvases[0]?.canvas;
      if (candidate instanceof HTMLCanvasElement) {
        try {
          return candidate.toDataURL('image/png');
        } catch {
          return null;
        }
      }
      return null;
    }).catch(() => null);

    if (qrPayload) {
      currentState = {
        type: 'state',
        status: 'qr',
        connected: false,
        qrCode: qrPayload,
        error: null,
      };
      emit(currentState);
      return;
    }

    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/unsupported browser|desteklenmeyen tarayici|guncel bir tarayici kullanin/i.test(bodyText)) {
      currentState = {
        type: 'state',
        status: 'error',
        connected: false,
        qrCode: null,
        error: 'WhatsApp Web bu tarayiciyi desteklenmeyen ortam olarak algiladi.',
      };
      emit(currentState);
      return;
    }
    if (/Giriş yapmak için tara|Telefon numarası kullanarak bağlayın|QR kodunu tarayın/i.test(bodyText)) {
      currentState = {
        type: 'state',
        status: 'awaiting_qr',
        connected: false,
        qrCode: null,
        error: 'QR login ekrani acildi ancak QR canvas okunamadi.',
      };
      emit(currentState);
      return;
    }

    const withinConnectedGrace = currentState.connected && (Date.now() - lastConnectedAt) < CONNECTED_GRACE_MS;
    if (withinConnectedGrace) {
      currentState = {
        type: 'state',
        status: 'connected',
        connected: true,
        qrCode: null,
        error: null,
      };
      emit(currentState);
      return;
    }

    currentState = {
      type: 'state',
      status: 'loading',
      connected: false,
      qrCode: null,
      error: bodyText ? bodyText.slice(0, 180) : null,
    };
    emit(currentState);
  } catch (error) {
    currentState = {
      type: 'state',
      status: 'error',
      connected: false,
      qrCode: null,
      error: String(error),
    };
    emit(currentState);
  }
}

async function ensureConnected() {
  await detectState();
  if (!currentState.connected) {
    throw new Error('WhatsApp bagli degil. Once QR okutun.');
  }
}

async function ensureChatReady(timeout = 12000) {
  const composer = await waitForComposer(timeout).catch(() => null);
  if (composer) {
    currentState = {
      type: 'state',
      status: 'connected',
      connected: true,
      qrCode: null,
      error: null,
    };
    emit(currentState);
    return composer;
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/Giriş yapmak için tara|Telefon numarası kullanarak bağlayın|QR kodunu tarayın/i.test(bodyText)) {
    throw new Error('WhatsApp bagli degil. Once QR okutun.');
  }
  throw new Error('Mesaj yazma alani acilamadi.');
}

async function clickSendButton() {
  const sendCandidates = [
    'button [data-icon="send"]',
    'span[data-icon="send"]',
    '[aria-label="Send"]',
    '[data-testid="send"]',
    'button[aria-label*="Gönder"]',
    'button[aria-label*="Send"]',
    'footer button',
    'footer [role="button"]',
  ];

  for (const selector of sendCandidates) {
    const locator = page.locator(selector).last();
    const visible = await locator.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      await locator.click({ timeout: 5000 }).catch(async () => {
        await locator.evaluate((node) => node.closest('button')?.click());
      });
      return;
    }
  }

  await page.keyboard.press('Enter');
}

async function clickVisibleButtonByText(labels) {
  for (const label of labels) {
    const locator = page.getByText(label, { exact: false }).last();
    const visible = await locator.isVisible({ timeout: 1200 }).catch(() => false);
    if (!visible) {
      continue;
    }
    await locator.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
    return true;
  }
  return false;
}

async function waitForComposer(timeout = 10000) {
  const composer = page.locator([
    'footer div[contenteditable="true"][data-tab]',
    'footer [contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"][data-tab="6"]',
  ].join(', ')).last();
  await composer.waitFor({ timeout });
  return composer;
}

async function waitForChatShell(timeout = 10000) {
  const shell = page.locator([
    '#pane-side',
    '[data-testid="chat-list-search"]',
    '[aria-label="Chat list"]',
  ].join(', ')).first();
  await shell.waitFor({ timeout });
  return shell;
}

async function openHome() {
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
}

async function sendMessage(phoneNumber, message) {
  const normalized = String(phoneNumber || '').replace(/[^\d]/g, '');
  if (!normalized) {
    throw new Error('Gecerli telefon numarasi gerekli.');
  }

  await page.goto(
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(normalized)}&text=${encodeURIComponent(message)}&app_absent=0`,
    { waitUntil: 'domcontentloaded' }
  );

  const invalidNotice = page.locator('text=Phone number shared via url is invalid, text=Telefon numarasi');
  if (await invalidNotice.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    throw new Error(`Gecersiz WhatsApp numarasi: ${phoneNumber}`);
  }

  await page.waitForTimeout(2000);
  await clickVisibleButtonByText([
    'Sohbete devam et',
    'Continue to chat',
    'Mesajlaşmaya devam et',
    'Use WhatsApp Web',
  ]);
  await clickVisibleButtonByText([
    'WhatsApp Web kullan',
    'Use WhatsApp Web',
  ]);

  let composer = await ensureChatReady(12000).catch(() => null);
  if (!composer) {
    await openHome();
    await page.goto(
      `https://web.whatsapp.com/send?phone=${encodeURIComponent(normalized)}&text=${encodeURIComponent(message)}&app_absent=0`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForTimeout(1800);
    composer = await ensureChatReady(12000);
  }
  await composer.click().catch(() => {});
  await clickSendButton();
  await page.waitForTimeout(1500);
  lastConnectedAt = Date.now();

  return {
    phoneNumber: normalized,
    status: 'sent',
  };
}

async function sendBulk(messages) {
  const results = [];
  for (const item of messages) {
    try {
      const result = await sendMessage(item.phoneNumber, item.message);
      results.push({ ...result, ok: true });
    } catch (error) {
      results.push({
        phoneNumber: item.phoneNumber,
        status: 'failed',
        ok: false,
        error: String(error),
      });
    }
    await page.waitForTimeout(1200);
  }
  return {
    total: results.length,
    sent: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

async function openChatByTitle(chatTitle) {
  await openHome();
  await waitForChatShell(8000);
  const searchButton = page.locator('[data-testid="chat-list-search"], [title="Search input textbox"]').first();
  if (await searchButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await searchButton.click().catch(() => {});
  }

  const searchInput = page.locator('div[contenteditable="true"][data-tab="3"], div[contenteditable="true"][role="textbox"]').first();
  await searchInput.waitFor({ timeout: 5000 });
  await searchInput.fill('');
  await searchInput.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
  await page.keyboard.type(chatTitle, { delay: 20 });
  await page.waitForTimeout(1200);

  const result = page.locator(`#pane-side div[role="listitem"], [aria-label="Chat list"] [role="listitem"]`).first();
  await result.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  lastConnectedAt = Date.now();
}

async function extractChatMessages(limit = 8) {
  return page.evaluate((maxItems) => {
    const rows = Array.from(document.querySelectorAll('[data-pre-plain-text]')).slice(-maxItems);
    return rows.map((row, index) => {
      const textNode = row.querySelector('.selectable-text span') || row.querySelector('span');
      const body = (textNode?.textContent || '').trim();
      const meta = row.getAttribute('data-pre-plain-text') || '';
      const direction = row.closest('.message-out') ? 'outbound' : 'inbound';
      return {
        localId: `${index}-${meta}-${body}`.slice(0, 250),
        direction,
        messageText: body,
        meta,
      };
    }).filter((item) => item.messageText);
  }, limit);
}

async function syncRecentChats(limit = 10) {
  await openHome();
  await waitForChatShell(8000);
  await page.waitForTimeout(1500);

  const chats = await page.evaluate((maxItems) => {
    const list = Array.from(document.querySelectorAll('#pane-side div[role="listitem"], [aria-label="Chat list"] [role="listitem"]')).slice(0, maxItems);
    return list.map((item, index) => {
      const titleNode = item.querySelector('[title]');
      const title = (titleNode?.getAttribute('title') || titleNode?.textContent || '').trim();
      const snippetNode = item.querySelector('span[dir="ltr"], div[dir="ltr"]');
      const snippet = (snippetNode?.textContent || '').trim();
      const unreadNode = item.querySelector('[aria-label*=" unread message"], [data-testid="icon-unread-count"]');
      return {
        index,
        chatId: title || `chat_${index}`,
        chatTitle: title || `Chat ${index + 1}`,
        snippet,
        unread: Boolean(unreadNode),
      };
    }).filter((item) => item.chatTitle);
  }, limit);

  const enriched = [];
  for (const chat of chats) {
    try {
      const listItem = page.locator('#pane-side div[role="listitem"], [aria-label="Chat list"] [role="listitem"]').nth(chat.index);
      await listItem.click({ timeout: 4000 });
      await page.waitForTimeout(900);
      const messages = await extractChatMessages(12);
      enriched.push({
        ...chat,
        messages,
      });
    } catch (error) {
      enriched.push({
        ...chat,
        messages: [],
        error: String(error),
      });
    }
  }
  return { chats: enriched };
}

async function sendReplyToChat(chatId, message) {
  await openChatByTitle(chatId);
  const composer = await ensureChatReady(5000);
  await composer.click();
  await page.keyboard.type(message, { delay: 10 });
  await clickSendButton();
  await page.waitForTimeout(1200);
  lastConnectedAt = Date.now();
  return { chatId, status: 'sent' };
}

async function disconnect() {
  await closeBrowserResources();
  currentState = {
    type: 'state',
    status: 'disconnected',
    connected: false,
    qrCode: null,
    error: null,
  };
  emit(currentState);
  return { disconnected: true };
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', async (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    emit({
      type: 'response',
      requestId: 'invalid',
      ok: false,
      error: `Invalid JSON: ${String(error)}`,
    });
    return;
  }

  const { requestId, action, payload = {} } = request;

  try {
    await launchPromise;
    let data;
    if (action === 'send_message') {
      data = await sendMessage(payload.phoneNumber, payload.message);
    } else if (action === 'send_bulk') {
      data = await sendBulk(payload.messages || []);
    } else if (action === 'sync_recent') {
      data = await syncRecentChats(payload.limit || 10);
    } else if (action === 'send_reply_to_chat') {
      data = await sendReplyToChat(payload.chatId, payload.message);
    } else if (action === 'disconnect') {
      data = await disconnect();
    } else if (action === 'status') {
      await detectState();
      data = currentState;
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    emit({
      type: 'response',
      requestId,
      ok: true,
      data,
    });
  } catch (error) {
    emit({
      type: 'response',
      requestId,
      ok: false,
      error: String(error),
    });
  }
});

process.on('SIGTERM', async () => {
  try {
    await closeBrowserResources();
  } finally {
    process.exit(0);
  }
});

launchPromise = launch();

launchPromise.catch((error) => {
  console.error(String(error));
  process.exit(1);
});
