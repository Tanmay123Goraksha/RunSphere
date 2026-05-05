import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    };
};

const parseJson = async (response: Response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Request failed');
    return data;
};

export type PaceTrend = {
    week_start: string;
    avg_pace: number;
    total_distance_km: number;
    run_count: number;
};

export type ActivityPeriod = {
    period_start: string;
    run_count: number;
    total_distance_km: number;
    avg_pace: number;
    total_duration_seconds: number;
    zones_captured: number;
};

export type UserStats = {
    user: { username: string; level: number; xp: number };
    runs: {
        total_runs: number;
        valid_runs: number;
        total_distance_km: number;
        avg_pace: number;
        total_duration_seconds: number;
    };
    zonesOwned: number;
    streak: { current_streak: number; longest_streak: number };
};

export const fetchPaceTrends = async (): Promise<PaceTrend[]> => {
    const response = await fetch(`${API_BASE_URL}/analytics/pace-trends`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.paceTrends || [];
};

export const fetchActivitySummary = async (period: 'weekly' | 'monthly' = 'weekly'): Promise<ActivityPeriod[]> => {
    const response = await fetch(`${API_BASE_URL}/analytics/activity-summary?period=${period}`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.summary || [];
};

export const fetchUserStats = async (): Promise<UserStats> => {
    const response = await fetch(`${API_BASE_URL}/analytics/stats`, {
        headers: await getAuthHeaders(),
    });
    return parseJson(response);
};
