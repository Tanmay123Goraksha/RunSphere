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
    if (!response.ok) throw new Error(data?.error || 'Request failed');
    return data;
};

// ─── Follow ─────────────────────────────────────────────────────────────────

export const followUserApi = async (userId) => {
    const response = await fetch(`${API_BASE_URL}/social/follow/${userId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    await parseJson(response);
};

export const unfollowUserApi = async (userId) => {
    const response = await fetch(`${API_BASE_URL}/social/follow/${userId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });
    await parseJson(response);
};

export const fetchFollowers = async () => {
    const response = await fetch(`${API_BASE_URL}/social/followers`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.followers || [];
};

export const fetchFollowing = async () => {
    const response = await fetch(`${API_BASE_URL}/social/following`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.following || [];
};

export const fetchFollowFeed = async () => {
    const response = await fetch(`${API_BASE_URL}/social/feed`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.feed || [];
};

// ─── Challenges ─────────────────────────────────────────────────────────────

export const sendChallengeApi = async (targetUserId, zoneH3Index, message) => {
    const response = await fetch(`${API_BASE_URL}/social/challenge/${targetUserId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ zoneH3Index, message }),
    });
    const data = await parseJson(response);
    return data.challenge;
};

export const respondToChallengeApi = async (challengeId, accepted) => {
    const response = await fetch(`${API_BASE_URL}/social/challenge/${challengeId}/respond`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ accepted }),
    });
    const data = await parseJson(response);
    return data.challenge;
};

export const fetchMyChallenges = async (status) => {
    const query = status ? `?status=${status}` : '';
    const response = await fetch(`${API_BASE_URL}/social/challenges${query}`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.challenges || [];
};
