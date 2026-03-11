export type WebsiteGeneratorSnapshot = {
    baseUrl: string;
    featureCatalog?: unknown;
    xearChecklist?: unknown;
    mobileMatrix?: unknown;
    releaseValidation?: unknown;
};

const DEFAULT_BASE_URL = (import.meta.env.VITE_WEBSITE_GENERATOR_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';

async function getJson<T>(baseUrl: string, path: string): Promise<T | undefined> {
    try {
        const response = await fetch(`${baseUrl}${path}`);
        if (!response.ok) {
            return undefined;
        }
        return (await response.json()) as T;
    } catch {
        return undefined;
    }
}

export async function loadWebsiteGeneratorSnapshot(baseUrl: string = DEFAULT_BASE_URL): Promise<WebsiteGeneratorSnapshot> {
    const [featureCatalog, xearChecklist, mobileMatrix, releaseValidation] = await Promise.all([
        getJson(baseUrl, '/api/v1/features/catalog'),
        getJson(baseUrl, '/api/v1/integrations/x-ear/checklist'),
        getJson(baseUrl, '/api/v1/quality/mobile-matrix'),
        getJson(baseUrl, '/api/v1/release/validation'),
    ]);

    return {
        baseUrl,
        featureCatalog,
        xearChecklist,
        mobileMatrix,
        releaseValidation,
    };
}
