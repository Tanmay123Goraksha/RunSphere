import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5001/api';

// ─── Territory (what the map renders) ────────────────────────────────────────
// Smooth, merged-by-owner polygons that follow street shapes.

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

// ─── Territory API (map renderer) ────────────────────────────────────────────

/**
 * Fetch merged territory polygons within a bounding box.
 * Returns smooth street-following shapes, grouped by owner.
 */
export const fetchTerritoriesInArea = async (params) => {
    const query = new URLSearchParams({
        minLatitude: String(params.minLatitude),
        maxLatitude: String(params.maxLatitude),
        minLongitude: String(params.minLongitude),
        maxLongitude: String(params.maxLongitude),
    });

    const response = await fetch(`${API_BASE_URL}/zones/territories?${query.toString()}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.territories || [];
};

/**
 * Fetch merged territory polygons near a point.
 */
export const fetchTerritoriesNearby = async (params) => {
    const query = new URLSearchParams({
        latitude: String(params.latitude),
        longitude: String(params.longitude),
    });

    if (Number.isFinite(params.radiusKm)) {
        query.set('radiusKm', String(params.radiusKm));
    }

    const response = await fetch(`${API_BASE_URL}/zones/territories/nearby?${query.toString()}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.territories || [];
};

// ─── H3 Zone API (detail card only, not rendered on map) ─────────────────────

export const fetchZonesInArea = async (params) => {
    const query = new URLSearchParams({
        minLatitude: String(params.minLatitude),
        maxLatitude: String(params.maxLatitude),
        minLongitude: String(params.minLongitude),
        maxLongitude: String(params.maxLongitude),
    });

    const response = await fetch(`${API_BASE_URL}/zones/area?${query.toString()}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.zones || [];
};

export const fetchZonesNearby = async (params) => {
    const query = new URLSearchParams({
        latitude: String(params.latitude),
        longitude: String(params.longitude),
    });

    if (Number.isFinite(params.radiusKm)) {
        query.set('radiusKm', String(params.radiusKm));
    }

    const response = await fetch(`${API_BASE_URL}/zones/nearby?${query.toString()}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.zones || [];
};

export const getZoneDetails = async (zoneId) => {
    const response = await fetch(`${API_BASE_URL}/zones/${zoneId}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.zone;
};
