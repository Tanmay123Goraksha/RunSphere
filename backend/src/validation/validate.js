const validate = (schema) => (req, res, next) => {
    try {
        const parsed = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query,
        });

        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid request payload',
                details: parsed.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
        }

        req.body = parsed.data.body;
        req.params = parsed.data.params;
        req.query = parsed.data.query;
        return next();
    } catch (error) {
        return res.status(500).json({ error: 'Validation middleware failed' });
    }
};

module.exports = validate;
