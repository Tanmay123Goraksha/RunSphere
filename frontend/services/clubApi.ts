import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

export type Club = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    member_count?: number;
    role?: 'OWNER' | 'MEMBER';
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

export const fetchClubs = async (): Promise<Club[]> => {
    const response = await fetch(`${API_BASE_URL}/clubs`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.clubs || [];
};

export const fetchMyClubs = async (): Promise<Club[]> => {
    const response = await fetch(`${API_BASE_URL}/clubs/me`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.clubs || [];
};

export const createClubApi = async (payload: {
    name: string;
    description?: string;
}): Promise<Club> => {
    const response = await fetch(`${API_BASE_URL}/clubs`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    const data = await parseJson(response);
    return data.club;
};

export const joinClubApi = async (clubId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/join`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });

    await parseJson(response);
};

export const leaveClubApi = async (clubId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/leave`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });

    await parseJson(response);
};
