import AsyncStorage from '@react-native-async-storage/async-storage';

export type RunPoint = {
    latitude: number;
    longitude: number;
    recorded_at: string;
};

export type LocalRun = {
    id: string;
    startedAt: string;
    endedAt?: string;
    distanceKm: number;
    durationSeconds: number;
    avgPace: number | null;
    cadenceSpm: number | null;
    points: RunPoint[];
    territoryCaptured?: boolean;
    territoryMessage?: string;
};

type QueueEntry = {
    runId: string;
    points: RunPoint[];
};

const LOCAL_RUNS_KEY = 'runsphere.localRuns.v1';
const SYNC_QUEUE_KEY = 'runsphere.syncQueue.v1';
const ACTIVE_RUN_KEY = 'runsphere.activeRun.v1';

const readJson = async <T>(key: string, fallback: T): Promise<T> => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
        return fallback;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

export const getLocalRuns = async (): Promise<LocalRun[]> => {
    return readJson<LocalRun[]>(LOCAL_RUNS_KEY, []);
};

export const getLocalRunById = async (runId: string): Promise<LocalRun | null> => {
    const runs = await getLocalRuns();
    return runs.find((run) => run.id === runId) ?? null;
};

export const upsertLocalRun = async (run: LocalRun): Promise<void> => {
    const runs = await getLocalRuns();
    const index = runs.findIndex((item) => item.id === run.id);

    if (index >= 0) {
        runs[index] = run;
    } else {
        runs.unshift(run);
    }

    await AsyncStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(runs));
};

export const storeActiveRun = async (activeRun: {
    runId: string;
    startedAt: string;
    route: Array<{ latitude: number; longitude: number }>;
    distanceMeters: number;
}): Promise<void> => {
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(activeRun));
};

export const getStoredActiveRun = async (): Promise<{
    runId: string;
    startedAt: string;
    route: Array<{ latitude: number; longitude: number }>;
    distanceMeters: number;
} | null> => {
    return readJson(ACTIVE_RUN_KEY, null);
};

export const clearStoredActiveRun = async (): Promise<void> => {
    await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
};

export const enqueuePoints = async (runId: string, points: RunPoint[]): Promise<void> => {
    if (points.length === 0) {
        return;
    }

    const queue = await readJson<QueueEntry[]>(SYNC_QUEUE_KEY, []);
    const index = queue.findIndex((entry) => entry.runId === runId);

    if (index >= 0) {
        queue[index].points = [...queue[index].points, ...points];
    } else {
        queue.push({ runId, points });
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const flushQueuedPoints = async (
    runId: string,
    syncFn: (rid: string, points: RunPoint[]) => Promise<void>
): Promise<void> => {
    const queue = await readJson<QueueEntry[]>(SYNC_QUEUE_KEY, []);
    const index = queue.findIndex((entry) => entry.runId === runId);

    if (index < 0 || queue[index].points.length === 0) {
        return;
    }

    const pending = queue[index].points;
    await syncFn(runId, pending);
    queue[index].points = [];

    const compact = queue.filter((entry) => entry.points.length > 0);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(compact));
};
