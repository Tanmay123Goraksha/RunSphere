const { z } = require('zod');

const registerSchema = z.object({
    body: z.object({
        username: z.string().trim().min(3).max(30),
        email: z.string().trim().email(),
        password: z.string().min(8).max(128),
    }),
    params: z.object({}),
    query: z.object({}),
});

const loginSchema = z.object({
    body: z.object({
        email: z.string().trim().email(),
        password: z.string().min(8).max(128),
    }),
    params: z.object({}),
    query: z.object({}),
});

module.exports = {
    registerSchema,
    loginSchema,
};
