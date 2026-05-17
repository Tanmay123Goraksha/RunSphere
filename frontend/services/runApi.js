import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5001/api';

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    };
};

const parseJson = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
    }
    return data;
};

export const startRunApi = async () => {
    const response = await fetch(`${API_BASE_URL}/runs/start`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return { runId: data.runId, startedAt: data.startedAt };
};

export const syncRunPointsApi = async (runId, points) => {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}/sync`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ points }),
    });

    await parseJson(response);
};

export const finishRunApi = async (runId, payload) => {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}/finish`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    return parseJson(response);
};

export const fetchRunsApi = async () => {
    const response = await fetch(`${API_BASE_URL}/runs`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.runs || [];
};

export const fetchRunByIdApi = async (runId) => {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.run;
};
