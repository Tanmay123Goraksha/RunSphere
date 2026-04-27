const { z } = require('zod');

const leaderboardQuerySchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({}),
    query: z.object({
        scope: z.enum(['global', 'weekly', 'club', 'nearby']).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        clubId: z.string().uuid().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        radiusKm: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    }).superRefine((query, ctx) => {
        if (query.scope === 'club' && !query.clubId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['clubId'],
                message: 'clubId is required when scope is club',
            });
        }

        if (query.scope === 'nearby') {
            if (!query.latitude || !query.longitude) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['latitude'],
                    message: 'latitude and longitude are required when scope is nearby',
                });
            }
        }
    }),
});

module.exports = {
    leaderboardQuerySchema,
};
