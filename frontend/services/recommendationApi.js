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

export const fetchPreRunRecommendations = async (params) => {
    const query = new URLSearchParams({
        latitude: String(params.latitude),
        longitude: String(params.longitude),
    });

    if (Number.isFinite(params.radiusKm)) {
        query.set('radiusKm', String(params.radiusKm));
    }

    const response = await fetch(`${API_BASE_URL}/recommendations/pre-run?${query.toString()}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.recommendations || [];
};
