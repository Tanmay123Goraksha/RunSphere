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

export const fetchMyProgression = async () => {
    const response = await fetch(`${API_BASE_URL}/progression/me`, {
        headers: await getAuthHeaders(),
    });

    return parseJson(response);
};
