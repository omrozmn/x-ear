import { EntityItem, Capability } from '../../api/generated/schemas';
import { useComposerStore } from '../../stores/composerStore';

/**
 * Simulates the execution of an action with micro-steps.
 * This is a temporary mock to demonstrate the "Pulse" UI flow.
 */
export async function simulateActionExecution(
    action: Capability,
    slots: Record<string, unknown>,
    store: ReturnType<typeof useComposerStore.getState>
) {
    const { addExecutionStep, updateExecutionStep, setExecutionStatus, setExecutionResult, setExecutionError, updateSlot, nextSlot } = store;

    // 1. INIT
    setExecutionStatus('init');
    await new Promise(r => setTimeout(r, 1500)); // Show "Starting..." for 1.5s

    // 2. RUNNING STEPS
    setExecutionStatus('running');

    // Step A: Check Patient
    const step1Id = 'step-1';
    addExecutionStep({ id: step1Id, label: 'Hasta bilgileri kontrol ediliyor...', status: 'running' });
    await new Promise(r => setTimeout(r, 1200));
    updateExecutionStep(step1Id, { status: 'completed' });

    // Step B: Check Device
    const step2Id = 'step-2';
    addExecutionStep({ id: step2Id, label: 'Cihaz bilgileri doğrulanıyor...', status: 'running' });
    await new Promise(r => setTimeout(r, 1200));
    updateExecutionStep(step2Id, { status: 'completed' });

    // SIMULATED INTERRUPTION (if specific condition met or random?)
    // For demo purposes: if 'side' slot is missing for device assignment
    // But we are post-confirmation, so assume slots are filled unless we want to demo runtime-ask.
    // Let's demo a runtime check that requires input for 'device assignment' if 'side' was not in slots.
    // Assuming 'side' is not in initial slots for this demo.

    // Note: In real app, we would check if slot is actually missing.
    // For this UI demo, let's force an interruption if action is 'atama' (assignment)
    if (action.name.toLowerCase().includes('atama') || action.name.toLowerCase().includes('assign')) {
        const step3Id = 'step-check-stock';
        addExecutionStep({ id: step3Id, label: 'Stok ve atama kuralları kontrol ediliyor...', status: 'running' });

        // Pause for effect
        await new Promise(r => setTimeout(r, 1000));

        // Simulate "Missing Slot" -> Interruption
        // We pretend we need 'side' (Ear Side)
        // Check if we already have it
        if (!slots['side']) {
            // Create a temporary slot config
            const sideSlot = {
                name: 'side',
                prompt: 'Hangi kulağa atama yapılacak?',
                type: 'string',
                uiType: 'enum',
                enumOptions: ['Sağ', 'Sol'],
                description: 'Ear side'
            };

            // Initial update so store knows about this slot request
            // We need to set store mode to allow input. 
            // In our store logic, 'waiting' status renders the input in ActionProgress.
            // We also need to set 'currentSlot' in store.
            // Accessing store setter directly might be needed or we update public store interface.
            // Since we passed 'store' which is getState(), we can't calls store actions directly if they use 'set'. 
            // We used the destructured actions from getState(), which are bound to the store. Good.

            // BUT: 'currentSlot' setter is via 'nextSlot' or internal.
            // We can hack it by using 'useComposerStore.setState({ currentSlot: sideSlot })' 
            // but better to use the public API if possible.
            // There is no explicit 'setCurrentSlot' public action.
            // We can use `set({ currentSlot: ... })` if we import store instance, but here we only have actions.

            // Let's use the global store instance import access or just use setState directly on the store object if permitted.
            // Re-importing store to get setState
            useComposerStore.setState({
                currentSlot: sideSlot,
                executionStatus: 'waiting'
            });

            // We need to poll or wait for the user to provide input.
            // In a real generator/async flow we would yield. Here we loop/wait.
            updateExecutionStep(step3Id, { status: 'running', label: 'Kulak tarafı bekleniyor...' });

            await waitForSlot(store, 'side');

            // Resume
            useComposerStore.setState({ currentSlot: null });
            setExecutionStatus('running');
        }

        updateExecutionStep(step3Id, { status: 'completed' });
    }

    // Step C: Perform
    const step4Id = 'step-perform';
    addExecutionStep({ id: step4Id, label: 'Cihaz atama işlemi gerçekleştiriliyor...', status: 'running' });
    await new Promise(r => setTimeout(r, 1500));
    updateExecutionStep(step4Id, { status: 'completed' });

    // 3. SUCCESS / ERROR
    // 10% chance of random error for demo
    const isError = Math.random() < 0.1;

    if (isError) {
        setExecutionStatus('error');
        setExecutionError('Cihaz stokta bulunamadı veya bağlantı hatası.');
    } else {
        setExecutionStatus('success');
        setExecutionResult({
            status: 'success',
            result: {},
            message: 'İşlem Başarılı'
        });
    }
}

/**
 * Helper to wait for a slot to be filled in the store
 */
async function waitForSlot(
    store: ReturnType<typeof useComposerStore.getState>,
    slotName: string
): Promise<unknown> {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            const currentSlots = useComposerStore.getState().slots;
            if (currentSlots[slotName]) {
                clearInterval(check);
                resolve(currentSlots[slotName]);
            }
        }, 200);
    });
}
