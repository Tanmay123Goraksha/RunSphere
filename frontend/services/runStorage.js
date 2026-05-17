import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_RUNS_KEY = 'runsphere.localRuns.v1';
const SYNC_QUEUE_KEY = 'runsphere.syncQueue.v1';
const ACTIVE_RUN_KEY = 'runsphere.activeRun.v1';

const readJson = async (key, fallback) => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
        return fallback;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

export const getLocalRuns = async () => {
    return readJson(LOCAL_RUNS_KEY, []);
};

export const getLocalRunById = async (runId) => {
    const runs = await getLocalRuns();
    return runs.find((run) => run.id === runId) ?? null;
};

export const upsertLocalRun = async (run) => {
    const runs = await getLocalRuns();
    const index = runs.findIndex((item) => item.id === run.id);

    if (index >= 0) {
        runs[index] = run;
    } else {
        runs.unshift(run);
    }

    await AsyncStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(runs));
};

export const storeActiveRun = async (activeRun) => {
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(activeRun));
};

export const getStoredActiveRun = async () => {
    return readJson(ACTIVE_RUN_KEY, null);
};

export const clearStoredActiveRun = async () => {
    await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
};

export const enqueuePoints = async (runId, points) => {
    if (points.length === 0) {
        return;
    }

    const queue = await readJson(SYNC_QUEUE_KEY, []);
    const index = queue.findIndex((entry) => entry.runId === runId);

    if (index >= 0) {
        queue[index].points = [...queue[index].points, ...points];
    } else {
        queue.push({ runId, points });
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const flushQueuedPoints = async (runId, syncFn) => {
    const queue = await readJson(SYNC_QUEUE_KEY, []);
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
