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

// ─── Follow ─────────────────────────────────────────────────────────────────

export const followUserApi = async (userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/social/follow/${userId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    await parseJson(response);
};

export const unfollowUserApi = async (userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/social/follow/${userId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });
    await parseJson(response);
};

export type FollowUser = {
    id: string;
    username: string;
    avatar_url: string | null;
    level: number;
    xp: number;
    followed_at: string;
};

export const fetchFollowers = async (): Promise<FollowUser[]> => {
    const response = await fetch(`${API_BASE_URL}/social/followers`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.followers || [];
};

export const fetchFollowing = async (): Promise<FollowUser[]> => {
    const response = await fetch(`${API_BASE_URL}/social/following`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.following || [];
};

export type FeedItem = {
    run_id: string;
    user_id: string;
    distance_km: number;
    duration_seconds: number;
    avg_pace: number | null;
    started_at: string;
    ended_at: string;
    username: string;
    avatar_url: string | null;
};

export const fetchFollowFeed = async (): Promise<FeedItem[]> => {
    const response = await fetch(`${API_BASE_URL}/social/feed`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.feed || [];
};

// ─── Challenges ─────────────────────────────────────────────────────────────

export type Challenge = {
    id: string;
    from_user_id: string;
    to_user_id: string;
    zone_h3_index: string;
    status: string;
    message: string | null;
    from_username: string;
    to_username: string;
    created_at: string;
};

export const sendChallengeApi = async (targetUserId: string, zoneH3Index: string, message?: string): Promise<Challenge> => {
    const response = await fetch(`${API_BASE_URL}/social/challenge/${targetUserId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ zoneH3Index, message }),
    });
    const data = await parseJson(response);
    return data.challenge;
};

export const respondToChallengeApi = async (challengeId: string, accepted: boolean): Promise<Challenge> => {
    const response = await fetch(`${API_BASE_URL}/social/challenge/${challengeId}/respond`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ accepted }),
    });
    const data = await parseJson(response);
    return data.challenge;
};

export const fetchMyChallenges = async (status?: string): Promise<Challenge[]> => {
    const query = status ? `?status=${status}` : '';
    const response = await fetch(`${API_BASE_URL}/social/challenges${query}`, {
        headers: await getAuthHeaders(),
    });
    const data = await parseJson(response);
    return data.challenges || [];
};
