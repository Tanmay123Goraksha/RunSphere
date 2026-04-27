const { z } = require('zod');

const recommendationQuerySchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({}),
    query: z.object({
        latitude: z.string(),
        longitude: z.string(),
        radiusKm: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    }),
});

module.exports = {
    recommendationQuerySchema,
};
