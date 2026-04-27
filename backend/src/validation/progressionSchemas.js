const { z } = require('zod');

const progressionSummarySchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({}),
    query: z.object({}),
});

module.exports = {
    progressionSummarySchema,
};
