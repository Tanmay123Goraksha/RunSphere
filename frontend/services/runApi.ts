import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunPoint } from './runStorage';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

export type RunSummary = {
    id: string;
    user_id: string;
    distance_km: number;
    duration_seconds: number;
    avg_pace: number | null;
    started_at: string;
    ended_at: string | null;
    created_at: string;
};

export type RunDetails = RunSummary & {
    points: RunPoint[];
};

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    };
};

const parseJson = async (response: Response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
    }
    return data;
};

export const startRunApi = async (): Promise<{ runId: string; startedAt: string }> => {
    const response = await fetch(`${API_BASE_URL}/runs/start`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return { runId: data.runId, startedAt: data.startedAt };
};

export const syncRunPointsApi = async (runId: string, points: RunPoint[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}/sync`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ points }),
    });

    await parseJson(response);
};

export const finishRunApi = async (
    runId: string,
    payload: { distanceKm: number; durationSeconds: number; avgPace: number | null }
): Promise<{ territory?: { success?: boolean; message?: string } }> => {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}/finish`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    return parseJson(response);
};

export const fetchRunsApi = async (): Promise<RunSummary[]> => {
    const response = await fetch(`${API_BASE_URL}/runs`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.runs || [];
};

export const fetchRunByIdApi = async (runId: string): Promise<RunDetails> => {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.run;
};
