const { z } = require('zod');

const createClubSchema = z.object({
    body: z.object({
        name: z.string().trim().min(3).max(64),
        description: z.string().trim().max(500).optional(),
    }),
    params: z.object({}),
    query: z.object({}),
});

const clubIdParamSchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({
        clubId: z.string().uuid(),
    }),
    query: z.object({}),
});

const listClubSchema = z.object({
    body: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
});

module.exports = {
    createClubSchema,
    clubIdParamSchema,
    listClubSchema,
};
