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

export const fetchLeaderboard = async (params = {}) => {
    const query = new URLSearchParams();

    if (params.scope) query.set('scope', params.scope);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.clubId) query.set('clubId', params.clubId);
    if (Number.isFinite(params.latitude)) query.set('latitude', String(params.latitude));
    if (Number.isFinite(params.longitude)) query.set('longitude', String(params.longitude));
    if (Number.isFinite(params.radiusKm)) query.set('radiusKm', String(params.radiusKm));

    const response = await fetch(`${API_BASE_URL}/leaderboards?${query.toString()}`, {
        headers: await getAuthHeaders(),
    });

    return parseJson(response);
};
