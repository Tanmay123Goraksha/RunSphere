import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polygon, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { runSphereTheme } from '@/constants/runSphereTheme';
import { darkMapStyle } from '@/constants/darkMapStyle';

import { usePedometer } from '../hooks/usePedometer';
import { fetchRunByIdApi, finishRunApi, startRunApi, syncRunPointsApi } from '@/services/runApi';
import { fetchTerritoriesInArea } from '@/services/zonesApi';
import {
    clearStoredActiveRun,
    enqueuePoints,
    flushQueuedPoints,
    getStoredActiveRun,
    storeActiveRun,
    upsertLocalRun,
} from '@/services/runStorage';

import ActiveRunHUD from './ActiveRunHUD';
import PostRunCelebration from './PostRunCelebration';

const toIsoTime = (timestamp) => new Date(timestamp ?? Date.now()).toISOString();

const GIRGAON_CENTER = { latitude: 18.9544, longitude: 72.8126 };
const SIMULATED_STEP_INTERVAL_MS = 1000;
const SIMULATED_STEP_DISTANCE_METERS = 20;

const toLatLng = (x, y, refLatitude, refLongitude) => {
    const R = 6378137;
    const latitude = refLatitude + (y / R) * (180 / Math.PI);
    const longitude = refLongitude + (x / (R * Math.cos(refLatitude * (Math.PI / 180)))) * (180 / Math.PI);
    return { latitude, longitude };
};

const buildSimulatedRoute = (center) => {
    const radiusMeters = 120;
    const segmentCount = 36;
    const routePoints = [];
    for (let index = 0; index <= segmentCount; index += 1) {
        const angle = (index / segmentCount) * Math.PI * 2;
        const x = Math.cos(angle) * radiusMeters;
        const y = Math.sin(angle) * radiusMeters;
        routePoints.push(toLatLng(x, y, center.latitude, center.longitude));
    }
    return routePoints;
};

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ─── Convert GeoJSON coordinates to react-native-maps format ────────────
// Handles both Polygon and MultiPolygon geometries returned by ST_Union

const geoJsonToMapCoords = (boundary) => {
    if (!boundary || !boundary.coordinates) return [];

    if (boundary.type === 'Polygon') {
        // Polygon: coordinates is number[][][]
        return boundary.coordinates.map((ring) =>
            ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        );
    }

    if (boundary.type === 'MultiPolygon') {
        // MultiPolygon: coordinates is number[][][][]
        // Flatten all polygons' outer rings into separate polygon arrays
        const result = [];
        for (const polygon of boundary.coordinates) {
            for (const ring of polygon) {
                result.push(ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
            }
        }
        return result;
    }

    return [];
};

// ─── Territory colors (smooth regions, not hexagons) ────────────────────

const getTerritoryColors = (territory) => {
    if (territory.is_mine) {
        return {
            fill: 'rgba(0, 229, 255, 0.30)',
            stroke: 'rgba(0, 229, 255, 0.6)',
        };
    }
    if (territory.ownership_type === 'CLUB_ZONE') {
        return {
            fill: 'rgba(0, 230, 118, 0.25)',
            stroke: 'rgba(0, 230, 118, 0.6)',
        };
    }
    // Enemy territory
    return {
        fill: 'rgba(255, 23, 68, 0.28)',
        stroke: 'rgba(255, 23, 68, 0.5)',
    };
};

export default function RunTrackerMap() {
    const mapRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [route, setRoute] = useState([]);
    const [routePoints, setRoutePoints] = useState([]);
    const [territories, setTerritories] = useState([]);
    const [isTracking, setIsTracking] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [runId, setRunId] = useState(null);
    const [runStartedAt, setRunStartedAt] = useState(null);
    const [distanceMeters, setDistanceMeters] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [gpsHealthy, setGpsHealthy] = useState(true);
    const [simulateRun, setSimulateRun] = useState(false);
    const [zonesCaptured, setZonesCaptured] = useState(0);

    // Post-run celebration state
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationData, setCelebrationData] = useState({
        distanceKm: 0,
        durationSeconds: 0,
        avgPace: null,
        zonesCaptured: 0,
        xpEarned: 0,
        territoryCaptured: false,
        territoryMessage: 'Run saved.',
        achievements: [],
    });

    const routeRef = useRef([]);
    const routePointsRef = useRef([]);
    const lastAcceptedAtRef = useRef(0);
    const lastStepCountRef = useRef(0);
    const unsyncedPointsRef = useRef([]);
    const tickTimerRef = useRef(null);
    const syncTimerRef = useRef(null);
    const simulationTimerRef = useRef(null);

    const { currentStepCount, cadenceSpm, setCurrentStepCount } = usePedometer(isTracking && !simulateRun, elapsedSeconds);

    const focusMap = (point, animated = true) => {
        mapRef.current?.animateToRegion(
            { latitude: point.latitude, longitude: point.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
            animated ? 450 : 0
        );
    };

    // Fetch territories (smooth merged polygons) when the map region changes
    const handleMapRegionChange = async (region) => {
        const latDelta = region.latitudeDelta || 0.02;
        const lonDelta = region.longitudeDelta || 0.02;
        try {
            const fetched = await fetchTerritoriesInArea({
                minLatitude: region.latitude - latDelta / 2,
                maxLatitude: region.latitude + latDelta / 2,
                minLongitude: region.longitude - lonDelta / 2,
                maxLongitude: region.longitude + lonDelta / 2,
            });
            setTerritories(fetched);
        } catch (error) {
            console.warn('Failed to fetch territories:', error);
        }
    };

    const paceMinPerKm = useMemo(() => {
        if (distanceMeters <= 0 || elapsedSeconds <= 0) return 0;
        const distanceKm = distanceMeters / 1000;
        return (elapsedSeconds / 60) / distanceKm;
    }, [distanceMeters, elapsedSeconds]);

    useEffect(() => { routeRef.current = route; }, [route]);
    useEffect(() => { routePointsRef.current = routePoints; }, [routePoints]);

    // ─── Setup ────────────────────────────────────────────────────────
    useEffect(() => {
        const setup = async () => {
            const fg = await Location.requestForegroundPermissionsAsync();
            if (fg.status !== 'granted') {
                Alert.alert('Location required', 'Please grant location access to track runs.');
                return;
            }
            await Location.requestBackgroundPermissionsAsync();
            const initialLocation =
                (await Location.getLastKnownPositionAsync({})) ||
                (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
            if (initialLocation) setLocation(initialLocation);

            const persisted = await getStoredActiveRun();
            if (persisted) {
                setRunId(persisted.runId);
                setRunStartedAt(persisted.startedAt);
                setRoute(persisted.route);
                setDistanceMeters(persisted.distanceMeters);
                setGpsHealthy(false);
            }
        };
        setup().catch(() => Alert.alert('Error', 'Unable to initialize location services.'));
    }, []);

    // Simulation center
    useEffect(() => {
        if (!simulateRun || isTracking) return;
        const simulatedLocation = {
            coords: { latitude: GIRGAON_CENTER.latitude, longitude: GIRGAON_CENTER.longitude, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: 0, speed: 0 },
            timestamp: Date.now(),
        };
        setLocation(simulatedLocation);
        focusMap(GIRGAON_CENTER, true);
    }, [simulateRun, isTracking]);

    // Elapsed seconds tick
    useEffect(() => {
        if (!isTracking) {
            if (tickTimerRef.current) clearInterval(tickTimerRef.current);
            tickTimerRef.current = null;
            return;
        }
        tickTimerRef.current = setInterval(() => {
            if (!runStartedAt) return;
            const next = Math.max(0, Math.floor((Date.now() - new Date(runStartedAt).getTime()) / 1000));
            setElapsedSeconds(next);
            if (lastAcceptedAtRef.current > 0) {
                const age = Date.now() - lastAcceptedAtRef.current;
                setGpsHealthy(age < 15000);
            }
        }, 1000);
        return () => { if (tickTimerRef.current) clearInterval(tickTimerRef.current); tickTimerRef.current = null; };
    }, [isTracking, runStartedAt]);

    // ─── Sync & Points ────────────────────────────────────────────────

    const safeSync = async (activeRunId) => {
        if (unsyncedPointsRef.current.length > 0) {
            const payload = [...unsyncedPointsRef.current];
            unsyncedPointsRef.current = [];
            try { await syncRunPointsApi(activeRunId, payload); } catch { await enqueuePoints(activeRunId, payload); }
        }
        try { await flushQueuedPoints(activeRunId, syncRunPointsApi); } catch { /* No-op */ }
    };

    const appendPoint = async (loc) => {
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;
        const prev = routeRef.current[routeRef.current.length - 1];
        const currentPoint = { latitude: lat, longitude: lon };
        let incrementMeters = 0;

        if (prev) {
            const distance = getDistanceFromLatLonInMeters(prev.latitude, prev.longitude, lat, lon);
            const sinceLast = lastAcceptedAtRef.current > 0 ? (Date.now() - lastAcceptedAtRef.current) / 1000 : 1;
            const speedMps = sinceLast > 0 ? distance / sinceLast : 0;
            const stepDelta = Math.max(0, currentStepCount - lastStepCountRef.current);
            const accuracy = loc.coords.accuracy ?? 999;
            const tooNoisy = accuracy > 35 || distance > 120 || speedMps > 8;
            const allowFallbackWithoutStep = sinceLast > 10;
            if (tooNoisy && stepDelta === 0 && !allowFallbackWithoutStep) return;
            if (distance < 2) return;
            incrementMeters = distance;
        }

        const pointRecord = { latitude: lat, longitude: lon, recorded_at: toIsoTime(loc.timestamp) };
        setRoute((prevRoute) => [...prevRoute, currentPoint]);
        setRoutePoints((prevPoints) => [...prevPoints, pointRecord]);
        setDistanceMeters((prevDistance) => prevDistance + incrementMeters);
        unsyncedPointsRef.current = [...unsyncedPointsRef.current, pointRecord];
        lastStepCountRef.current = currentStepCount;
        lastAcceptedAtRef.current = Date.now();

        if (runId && runStartedAt) {
            const nextRoute = [...routeRef.current, currentPoint];
            await storeActiveRun({ runId, startedAt: runStartedAt, route: nextRoute, distanceMeters: distanceMeters + incrementMeters });
        }
    };

    const beginLiveLocationStream = async () => {
        const sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 1 },
            (loc) => { setLocation(loc); appendPoint(loc).catch(() => {}); }
        );
        setSubscription(sub);
    };

    const beginSimulatedLocationStream = async () => {
        const start = GIRGAON_CENTER;
        const simulatedRoute = buildSimulatedRoute(start);
        let routeIndex = 0;
        let stepCounter = 0;
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
        focusMap(start, false);
        simulationTimerRef.current = setInterval(() => {
            const nextPoint = simulatedRoute[routeIndex % simulatedRoute.length];
            routeIndex += 1;
            stepCounter += Math.max(1, Math.round(SIMULATED_STEP_DISTANCE_METERS / 0.75));
            setCurrentStepCount(stepCounter);
            const simulatedLocation = {
                coords: { latitude: nextPoint.latitude, longitude: nextPoint.longitude, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: 0, speed: SIMULATED_STEP_DISTANCE_METERS / (SIMULATED_STEP_INTERVAL_MS / 1000) },
                timestamp: Date.now(),
            };
            setLocation(simulatedLocation);
            focusMap(nextPoint, true);
            appendPoint(simulatedLocation).catch(() => {});
        }, SIMULATED_STEP_INTERVAL_MS);
    };

    // ─── Start / Stop ─────────────────────────────────────────────────

    const startTracking = async () => {
        if (isTracking) return;
        let activeRunId = runId;
        let startedAt = runStartedAt;
        if (!activeRunId) {
            const created = await startRunApi();
            activeRunId = created.runId;
            startedAt = created.startedAt;
            setRunId(activeRunId);
            setRunStartedAt(startedAt);
            setRoute([]);
            setRoutePoints([]);
            setDistanceMeters(0);
            setElapsedSeconds(0);
            setZonesCaptured(0);
            unsyncedPointsRef.current = [];
            setCurrentStepCount(0);
        }
        if (simulateRun) await beginSimulatedLocationStream();
        else await beginLiveLocationStream();
        setIsTracking(true);
        setGpsHealthy(true);
        if (activeRunId && startedAt) {
            await storeActiveRun({ runId: activeRunId, startedAt, route: routeRef.current, distanceMeters });
        }
        if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        syncTimerRef.current = setInterval(() => {
            if (!activeRunId) return;
            safeSync(activeRunId).catch(() => {});
        }, 15000);
    };

    const stopTracking = async () => {
        if (!runId || !runStartedAt) return;
        if (subscription) { subscription.remove(); setSubscription(null); }
        if (simulationTimerRef.current) { clearInterval(simulationTimerRef.current); simulationTimerRef.current = null; }
        if (syncTimerRef.current) { clearInterval(syncTimerRef.current); syncTimerRef.current = null; }
        setIsTracking(false);

        const totalDurationSeconds = Math.max(elapsedSeconds, Math.floor((Date.now() - new Date(runStartedAt).getTime()) / 1000));
        const distanceKm = distanceMeters / 1000;
        const avgPace = distanceKm > 0 ? (totalDurationSeconds / 60) / distanceKm : null;

        await safeSync(runId);

        let territoryMessage = 'Run saved.';
        let territoryCaptured = false;
        let capturedCount = 0;
        let xpEarned = 0;
        let unlockedAchievements = [];

        try {
            const finishResponse = await finishRunApi(runId, { distanceKm, durationSeconds: totalDurationSeconds, avgPace });
            territoryCaptured = Boolean(finishResponse?.territory?.success);
            territoryMessage = finishResponse?.territory?.message || territoryMessage;
            capturedCount = finishResponse?.territory?.captured || 0;
            xpEarned = finishResponse?.points?.total || 0;
            unlockedAchievements = finishResponse?.progression?.unlockedAchievements || [];
        } catch {
            territoryMessage = 'Run saved locally. Backend sync will resume when online.';
        }

        await upsertLocalRun({
            id: runId, startedAt: runStartedAt, endedAt: toIsoTime(), distanceKm,
            durationSeconds: totalDurationSeconds, avgPace, cadenceSpm: cadenceSpm > 0 ? cadenceSpm : null,
            points: routePointsRef.current, territoryCaptured, territoryMessage,
        });

        await clearStoredActiveRun();

        // Refresh territories to show the newly created territory
        if (location) {
            handleMapRegionChange({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }).catch(() => {});
        }

        // Show celebration screen
        setCelebrationData({
            distanceKm, durationSeconds: totalDurationSeconds, avgPace, zonesCaptured: capturedCount,
            xpEarned, territoryCaptured, territoryMessage, achievements: unlockedAchievements,
        });
        setShowCelebration(true);

        setRunId(null);
        setRunStartedAt(null);
        setElapsedSeconds(0);
        lastStepCountRef.current = 0;
        setCurrentStepCount(0);
    };

    // ─── Recovery ─────────────────────────────────────────────────────
    const recoverPersistedRoute = async () => {
        if (!runId) return;
        try {
            const remote = await fetchRunByIdApi(runId);
            if (remote?.points?.length) {
                const points = remote.points.map((point) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) }));
                setRoute(points);
            }
        } catch { /* Keep local fallback */ }
    };

    useEffect(() => {
        if (runId && !isTracking) { recoverPersistedRoute().catch(() => {}); }
    }, [runId, isTracking]);

    const onPrimaryAction = async () => {
        try {
            if (isTracking) await stopTracking();
            else await startTracking();
        } catch (error) {
            Alert.alert('Tracking error', 'Unable to change tracking state. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            {location ? (
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    customMapStyle={darkMapStyle}
                    initialRegion={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    showsUserLocation
                    userInterfaceStyle="dark"
                    onRegionChangeComplete={handleMapRegionChange}
                >
                    {/* ─── Territory polygons (smooth street-following shapes) ─── */}
                    {territories.map((territory, tIdx) => {
                        const colors = getTerritoryColors(territory);
                        const polygonRings = geoJsonToMapCoords(territory.boundary);

                        return polygonRings.map((ring, rIdx) => (
                            <Polygon
                                key={`territory-${territory.owner_id}-${tIdx}-${rIdx}`}
                                coordinates={ring}
                                fillColor={colors.fill}
                                strokeColor={colors.stroke}
                                strokeWidth={2}
                                tappable
                                onPress={() => {
                                    // Could show an info card for the territory owner
                                }}
                            />
                        ));
                    })}

                    {/* Glow layer for run path */}
                    {route.length > 0 && (
                        <Polyline
                            coordinates={route}
                            strokeColor={runSphereTheme.colors.runPathGlow}
                            strokeWidth={12}
                        />
                    )}
                    {/* Main run path */}
                    {route.length > 0 && (
                        <Polyline
                            coordinates={route}
                            strokeColor={runSphereTheme.colors.runPath}
                            strokeWidth={4}
                        />
                    )}
                </MapView>
            ) : (
                <View style={styles.loadingWrap}>
                    <Text style={styles.loadingText}>Acquiring GPS...</Text>
                </View>
            )}

            {/* Pre-run controls (not tracking) */}
            {!isTracking && !showCelebration && (
                <View style={styles.preRunControls}>
                    <TouchableOpacity
                        onPress={() => setSimulateRun((prev) => !prev)}
                        style={[styles.modeButton, simulateRun ? styles.modeButtonActive : styles.modeButtonInactive]}
                    >
                        <Text style={styles.modeButtonText}>
                            {simulateRun ? '◉ SIM MODE' : '◌ SIM MODE'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onPrimaryAction}
                        style={styles.startButton}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.startButtonText}>START RUN</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Active run HUD */}
            {isTracking && (
                <ActiveRunHUD
                    distanceMeters={distanceMeters}
                    elapsedSeconds={elapsedSeconds}
                    paceMinPerKm={paceMinPerKm}
                    currentStepCount={currentStepCount}
                    cadenceSpm={cadenceSpm}
                    zonesCaptured={zonesCaptured}
                    gpsHealthy={gpsHealthy}
                    simulateRun={simulateRun}
                    isTracking={isTracking}
                    onStop={onPrimaryAction}
                />
            )}

            {/* Post-run celebration */}
            <PostRunCelebration
                visible={showCelebration}
                distanceKm={celebrationData.distanceKm}
                durationSeconds={celebrationData.durationSeconds}
                avgPace={celebrationData.avgPace}
                zonesCaptured={celebrationData.zonesCaptured}
                xpEarned={celebrationData.xpEarned}
                territoryCaptured={celebrationData.territoryCaptured}
                territoryMessage={celebrationData.territoryMessage}
                achievements={celebrationData.achievements}
                onDismiss={() => setShowCelebration(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: runSphereTheme.colors.background,
    },
    loadingText: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 14,
        fontWeight: '700',
    },
    preRunControls: {
        position: 'absolute',
        bottom: 36,
        alignItems: 'center',
        gap: 12,
    },
    modeButton: {
        borderRadius: runSphereTheme.radius.pill,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderWidth: 1,
    },
    modeButtonActive: {
        backgroundColor: runSphereTheme.colors.accentSoft,
        borderColor: runSphereTheme.colors.accent,
    },
    modeButtonInactive: {
        backgroundColor: runSphereTheme.colors.surfaceElevated,
        borderColor: runSphereTheme.colors.line,
    },
    modeButtonText: {
        color: runSphereTheme.colors.accent,
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1,
    },
    startButton: {
        backgroundColor: runSphereTheme.colors.accent,
        borderRadius: runSphereTheme.radius.xl,
        paddingVertical: 18,
        paddingHorizontal: 56,
        ...runSphereTheme.shadow.accentButton,
    },
    startButtonText: {
        color: '#0a0a1a',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
