import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

// ─── Territory (what the map renders) ────────────────────────────────────────
// Smooth, merged-by-owner polygons that follow street shapes.

export type Territory = {
    owner_id: string;
    owner_name: string;
    owner_avatar: string | null;
    boundary: {
        type: string;
        coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
    } | null;
    zone_count: number;
    total_area_sqm: number;
    first_captured_at?: string;
    last_captured_at?: string;
    ownership_type?: 'MY_ZONE' | 'CLUB_ZONE' | 'ENEMY';
    is_mine: boolean;
};

// ─── Zone (H3-based, backend only — used for zone detail card) ───────────────

export type ZoneState = 'OWNED' | 'CONTESTED' | 'UNCLAIMED' | 'CLUB_OWNED';

export type Zone = {
    id: string;
    h3_index: string;
    owner_id: string | null;
    state: ZoneState;
    best_pace: number | null;
    total_defenses?: number;
    held_since?: string;
    boundary: {
        type: string;
        coordinates: number[][][];
    };
    owner_name?: string;
    owner_avatar?: string;
    is_mine?: boolean;
    is_club?: boolean;
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

// ─── Territory API (map renderer) ────────────────────────────────────────────

/**
 * Fetch merged territory polygons within a bounding box.
 * Returns smooth street-following shapes, grouped by owner.
 */
export const fetchTerritoriesInArea = async (params: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
}): Promise<Territory[]> => {
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
export const fetchTerritoriesNearby = async (params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
}): Promise<Territory[]> => {
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

export const fetchZonesInArea = async (params: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
}): Promise<Zone[]> => {
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

export const fetchZonesNearby = async (params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
}): Promise<Zone[]> => {
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

export const getZoneDetails = async (zoneId: string): Promise<Zone> => {
    const response = await fetch(`${API_BASE_URL}/zones/${zoneId}`, {
        headers: await getAuthHeaders(),
    });

    const data = await parseJson(response);
    return data.zone;
};
