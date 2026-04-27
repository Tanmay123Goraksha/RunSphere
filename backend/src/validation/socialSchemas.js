const { z } = require('zod');

const challengeSchema = z.object({
    body: z.object({
        zoneH3Index: z.string().min(5),
        message: z.string().max(240).optional(),
    }),
    params: z.object({
        targetUserId: z.string().uuid(),
    }),
    query: z.object({}),
});

const followActivitySchema = z.object({
    body: z.object({
        followerUserId: z.string().uuid(),
        activityType: z.enum(['run_started', 'run_finished', 'zone_captured']),
        runId: z.string().uuid().optional(),
    }),
    params: z.object({}),
    query: z.object({}),
});

const clubMissionUpdateSchema = z.object({
    body: z.object({
        clubId: z.string().uuid(),
        missionId: z.string().min(3),
        progress: z.number().min(0),
    }),
    params: z.object({}),
    query: z.object({}),
});

module.exports = {
    challengeSchema,
    followActivitySchema,
    clubMissionUpdateSchema,
};
