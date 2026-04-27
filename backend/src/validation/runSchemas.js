const { z } = require('zod');

const latSchema = z.number().min(-90).max(90);
const lonSchema = z.number().min(-180).max(180);

const getRunsSchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({}),
    query: z.object({}),
});

const startRunSchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({}),
    query: z.object({}),
});

const runIdParamSchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({
        runId: z.string().uuid(),
    }),
    query: z.object({}),
});

const syncPointsSchema = z.object({
    body: z.object({
        points: z
            .array(
                z.object({
                    latitude: latSchema,
                    longitude: lonSchema,
                    recorded_at: z.string().datetime().optional(),
                    step_count_delta: z.number().int().min(0).optional(),
                })
            )
            .min(1)
            .max(2000),
    }),
    params: z.object({
        runId: z.string().uuid(),
    }),
    query: z.object({}),
});

const finishRunSchema = z.object({
    body: z.object({
        distanceKm: z.number().min(0).max(200),
        durationSeconds: z.number().int().min(0).max(24 * 60 * 60),
        avgPace: z.number().min(0).max(60).nullable(),
    }),
    params: z.object({
        runId: z.string().uuid(),
    }),
    query: z.object({}),
});

module.exports = {
    getRunsSchema,
    startRunSchema,
    runIdParamSchema,
    syncPointsSchema,
    finishRunSchema,
};
