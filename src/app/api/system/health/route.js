/**
 * System Health & AI Provider Status Endpoint
 * Monitors and reports on AI provider availability and performance
 */

import { getProviderStatus } from "@/lib/aiProvider";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const providerStatus = getProviderStatus();

        return Response.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            aiProviders: providerStatus,
            notes: {
                gemini: providerStatus.gemini.available
                    ? `Primary provider - ${providerStatus.gemini.successRate.toFixed(1)}% success rate`
                    : "Not configured",
                openRouter: providerStatus.openRouter.available
                    ? `Fallback provider - ${providerStatus.openRouter.successRate.toFixed(1)}% success rate`
                    : "Not configured",
                fallbacks:
                    providerStatus.fallbackCount > 0
                        ? `${providerStatus.fallbackCount} fallback(s) from Gemini to OpenRouter`
                        : "No fallbacks needed",
            },
        });
    } catch (error) {
        return Response.json(
            { status: "error", error: error.message },
            { status: 500 }
        );
    }
}
