import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

export type ProgressionSummary = {
    streak: {
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: string | null;
    };
    stats: {
        validRuns: number;
        totalDistanceKm: number;
        capturedEvents: number;
    };
    achievements: Array<{
        code: string;
        name: string;
        description: string;
        xp_reward: number;
        unlocked_at: string;
    }>;
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

export const fetchMyProgression = async (): Promise<ProgressionSummary> => {
    const response = await fetch(`${API_BASE_URL}/progression/me`, {
        headers: await getAuthHeaders(),
    });

    return parseJson(response);
};
