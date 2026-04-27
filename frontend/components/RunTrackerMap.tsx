import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polygon, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { runSphereTheme } from '@/constants/runSphereTheme';

import { usePedometer } from '../hooks/usePedometer';
import { fetchRunByIdApi, finishRunApi, startRunApi, syncRunPointsApi } from '@/services/runApi';
import {
    clearStoredActiveRun,
    enqueuePoints,
    flushQueuedPoints,
    getStoredActiveRun,
    RunPoint,
    storeActiveRun,
    upsertLocalRun,
} from '@/services/runStorage';

type LatLng = { latitude: number; longitude: number };

const toIsoTime = (timestamp?: number) => new Date(timestamp ?? Date.now()).toISOString();

const GIRGAON_CENTER: LatLng = { latitude: 18.9544, longitude: 72.8126 };
const SIMULATED_STEP_INTERVAL_MS = 1000;
const SIMULATED_STEP_DISTANCE_METERS = 20;

const toLatLng = (x: number, y: number, refLatitude: number, refLongitude: number) => {
    const R = 6378137;
    const latitude = refLatitude + (y / R) * (180 / Math.PI);
    const longitude = refLongitude + (x / (R * Math.cos(refLatitude * (Math.PI / 180)))) * (180 / Math.PI);
    return { latitude, longitude };
};

const buildSimulatedRoute = (center: LatLng): LatLng[] => {
    const radiusMeters = 120;
    const segmentCount = 36;
    const routePoints: LatLng[] = [];

    for (let index = 0; index <= segmentCount; index += 1) {
        const angle = (index / segmentCount) * Math.PI * 2;
        const x = Math.cos(angle) * radiusMeters;
        const y = Math.sin(angle) * radiusMeters;
        routePoints.push(toLatLng(x, y, center.latitude, center.longitude));
    }

    return routePoints;
};

const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

const calculatePolygonArea = (locations: LatLng[]) => {
    if (locations.length < 3) return 0;

    const R = 6378137;
    const refLat = locations[0].latitude;
    const refLon = locations[0].longitude;

    const points = locations.map((loc) => {
        const x = (loc.longitude - refLon) * (Math.PI / 180) * R * Math.cos(refLat * (Math.PI / 180));
        const y = (loc.latitude - refLat) * (Math.PI / 180) * R;
        return { x, y };
    });

    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
};

export default function RunTrackerMap() {
    const mapRef = useRef<MapView | null>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [route, setRoute] = useState<LatLng[]>([]);
    const [routePoints, setRoutePoints] = useState<RunPoint[]>([]);
    const [territories, setTerritories] = useState<LatLng[][]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
    const [runId, setRunId] = useState<string | null>(null);
    const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
    const [distanceMeters, setDistanceMeters] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [gpsHealthy, setGpsHealthy] = useState(true);
    const [simulateRun, setSimulateRun] = useState(false);

    const routeRef = useRef<LatLng[]>([]);
    const routePointsRef = useRef<RunPoint[]>([]);
    const lastAcceptedAtRef = useRef<number>(0);
    const lastStepCountRef = useRef(0);
    const unsyncedPointsRef = useRef<RunPoint[]>([]);
    const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { currentStepCount, cadenceSpm, setCurrentStepCount } = usePedometer(isTracking && !simulateRun, elapsedSeconds);

    const focusMap = (point: LatLng, animated = true) => {
        mapRef.current?.animateToRegion(
            {
                latitude: point.latitude,
                longitude: point.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            animated ? 450 : 0
        );
    };

    const paceMinPerKm = useMemo(() => {
        if (distanceMeters <= 0 || elapsedSeconds <= 0) return 0;
        const distanceKm = distanceMeters / 1000;
        return (elapsedSeconds / 60) / distanceKm;
    }, [distanceMeters, elapsedSeconds]);

    useEffect(() => {
        routeRef.current = route;
    }, [route]);

    useEffect(() => {
        routePointsRef.current = routePoints;
    }, [routePoints]);

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

            if (initialLocation) {
                setLocation(initialLocation);
            }

            const persisted = await getStoredActiveRun();
            if (persisted) {
                setRunId(persisted.runId);
                setRunStartedAt(persisted.startedAt);
                setRoute(persisted.route);
                setDistanceMeters(persisted.distanceMeters);
                setGpsHealthy(false);
            }
        };

        setup().catch(() => {
            Alert.alert('Error', 'Unable to initialize location services.');
        });
    }, []);

    useEffect(() => {
        if (!simulateRun || isTracking) return;

        const simulatedLocation: Location.LocationObject = {
            coords: {
                latitude: GIRGAON_CENTER.latitude,
                longitude: GIRGAON_CENTER.longitude,
                altitude: null,
                accuracy: 5,
                altitudeAccuracy: null,
                heading: 0,
                speed: 0,
            },
            timestamp: Date.now(),
        };

        setLocation(simulatedLocation);
        focusMap(GIRGAON_CENTER, true);
    }, [simulateRun, isTracking]);

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

        return () => {
            if (tickTimerRef.current) clearInterval(tickTimerRef.current);
            tickTimerRef.current = null;
        };
    }, [isTracking, runStartedAt]);

    const safeSync = async (activeRunId: string) => {
        if (unsyncedPointsRef.current.length > 0) {
            const payload = [...unsyncedPointsRef.current];
            unsyncedPointsRef.current = [];

            try {
                await syncRunPointsApi(activeRunId, payload);
            } catch {
                await enqueuePoints(activeRunId, payload);
            }
        }

        try {
            await flushQueuedPoints(activeRunId, syncRunPointsApi);
        } catch {
            // No-op; queue is preserved for next retry.
        }
    };

    const appendPoint = async (loc: Location.LocationObject) => {
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

            if (tooNoisy && stepDelta === 0 && !allowFallbackWithoutStep) {
                return;
            }

            if (distance < 2) {
                return;
            }

            incrementMeters = distance;
        }

        const pointRecord: RunPoint = {
            latitude: lat,
            longitude: lon,
            recorded_at: toIsoTime(loc.timestamp),
        };

        setRoute((prevRoute) => [...prevRoute, currentPoint]);
        setRoutePoints((prevPoints) => [...prevPoints, pointRecord]);
        setDistanceMeters((prevDistance) => prevDistance + incrementMeters);

        unsyncedPointsRef.current = [...unsyncedPointsRef.current, pointRecord];
        lastStepCountRef.current = currentStepCount;
        lastAcceptedAtRef.current = Date.now();

        if (runId && runStartedAt) {
            const nextRoute = [...routeRef.current, currentPoint];
            await storeActiveRun({
                runId,
                startedAt: runStartedAt,
                route: nextRoute,
                distanceMeters: distanceMeters + incrementMeters,
            });
        }
    };

    const beginLiveLocationStream = async () => {
        const sub = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 2000,
                distanceInterval: 1,
            },
            (loc) => {
                setLocation(loc);
                appendPoint(loc).catch(() => {
                    // No-op: point append failures should not crash live tracking.
                });
            }
        );

        setSubscription(sub);
    };

    const beginSimulatedLocationStream = async () => {
        const start = GIRGAON_CENTER;

        const simulatedRoute = buildSimulatedRoute(start);
        let routeIndex = 0;
        let stepCounter = 0;

        if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
        }

        focusMap(start, false);

        simulationTimerRef.current = setInterval(() => {
            const nextPoint = simulatedRoute[routeIndex % simulatedRoute.length];
            routeIndex += 1;

            stepCounter += Math.max(1, Math.round(SIMULATED_STEP_DISTANCE_METERS / 0.75));
            setCurrentStepCount(stepCounter);

            const simulatedLocation: Location.LocationObject = {
                coords: {
                    latitude: nextPoint.latitude,
                    longitude: nextPoint.longitude,
                    altitude: null,
                    accuracy: 5,
                    altitudeAccuracy: null,
                    heading: 0,
                    speed: SIMULATED_STEP_DISTANCE_METERS / (SIMULATED_STEP_INTERVAL_MS / 1000),
                },
                timestamp: Date.now(),
            };

            setLocation(simulatedLocation);
            focusMap(nextPoint, true);
            appendPoint(simulatedLocation).catch(() => {
                // No-op: simulation should continue even if one point fails.
            });
        }, SIMULATED_STEP_INTERVAL_MS);
    };

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
            unsyncedPointsRef.current = [];
            setCurrentStepCount(0);
        }

        if (simulateRun) {
            await beginSimulatedLocationStream();
        } else {
            await beginLiveLocationStream();
        }
        setIsTracking(true);
        setGpsHealthy(true);

        if (activeRunId && startedAt) {
            await storeActiveRun({
                runId: activeRunId,
                startedAt,
                route: routeRef.current,
                distanceMeters,
            });
        }

        if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        syncTimerRef.current = setInterval(() => {
            if (!activeRunId) return;
            safeSync(activeRunId).catch(() => {
                // Queue persists when sync fails.
            });
        }, 15000);
    };

    const stopTracking = async () => {
        if (!runId || !runStartedAt) return;

        if (subscription) {
            subscription.remove();
            setSubscription(null);
        }

        if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
        }

        if (syncTimerRef.current) {
            clearInterval(syncTimerRef.current);
            syncTimerRef.current = null;
        }

        setIsTracking(false);

        const totalDurationSeconds = Math.max(
            elapsedSeconds,
            Math.floor((Date.now() - new Date(runStartedAt).getTime()) / 1000)
        );
        const distanceKm = distanceMeters / 1000;
        const avgPace = distanceKm > 0 ? (totalDurationSeconds / 60) / distanceKm : null;

        await safeSync(runId);

        let territoryMessage = 'Run saved.';
        let territoryCaptured = false;

        try {
            const finishResponse = await finishRunApi(runId, {
                distanceKm,
                durationSeconds: totalDurationSeconds,
                avgPace,
            });

            territoryCaptured = Boolean(finishResponse?.territory?.success);
            territoryMessage = finishResponse?.territory?.message || territoryMessage;
        } catch {
            territoryMessage = 'Run saved locally. Backend sync will resume when online.';
        }

        if (routeRef.current.length > 3) {
            const startPoint = routeRef.current[0];
            const endPoint = routeRef.current[routeRef.current.length - 1];
            const loopGap = getDistanceFromLatLonInMeters(
                startPoint.latitude,
                startPoint.longitude,
                endPoint.latitude,
                endPoint.longitude
            );

            if (territoryCaptured || loopGap < 75) {
                setTerritories((prev) => [...prev, routeRef.current]);
            }
        }

        await upsertLocalRun({
            id: runId,
            startedAt: runStartedAt,
            endedAt: toIsoTime(),
            distanceKm,
            durationSeconds: totalDurationSeconds,
            avgPace,
            cadenceSpm: cadenceSpm > 0 ? cadenceSpm : null,
            points: routePointsRef.current,
            territoryCaptured,
            territoryMessage,
        });

        await clearStoredActiveRun();

        Alert.alert(
            territoryCaptured ? 'Territory Captured' : 'Run Finished',
            territoryCaptured
                ? `${territoryMessage} Area: ${Math.round(calculatePolygonArea(routeRef.current))} sq m.`
                : territoryMessage
        );

        setRunId(null);
        setRunStartedAt(null);
        setElapsedSeconds(0);
        lastStepCountRef.current = 0;
        setCurrentStepCount(0);
    };

    const recoverPersistedRoute = async () => {
        if (!runId) return;

        try {
            const remote = await fetchRunByIdApi(runId);
            if (remote?.points?.length) {
                const points = remote.points.map((point) => ({
                    latitude: Number(point.latitude),
                    longitude: Number(point.longitude),
                }));
                setRoute(points);
            }
        } catch {
            // Keep local fallback route.
        }
    };

    useEffect(() => {
        if (runId && !isTracking) {
            recoverPersistedRoute().catch(() => {
                // Keep local fallback route.
            });
        }
    }, [runId, isTracking]);

    const onPrimaryAction = async () => {
        try {
            if (isTracking) {
                await stopTracking();
            } else {
                await startTracking();
            }
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
                    initialRegion={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    showsUserLocation
                >
                    {route.length > 0 && <Polyline coordinates={route} strokeColor="#ef4444" strokeWidth={5} />}

                    {territories.map((territoryRegion, index) => (
                        <Polygon
                            key={`${territoryRegion.length}-${index}`}
                            coordinates={territoryRegion}
                            fillColor="rgba(14, 165, 233, 0.35)"
                            strokeColor="rgba(2, 132, 199, 0.9)"
                            strokeWidth={2}
                        />
                    ))}
                </MapView>
            ) : (
                <Text>Getting location...</Text>
            )}

            <View style={styles.controls}>
                <Text style={styles.panelTitle}>Run Console</Text>
                {!isTracking && (
                    <TouchableOpacity
                        onPress={() => setSimulateRun((prev) => !prev)}
                        style={[styles.modeButton, simulateRun ? styles.modeButtonActive : styles.modeButtonInactive]}
                    >
                        <Text style={styles.modeButtonText}>{simulateRun ? 'Simulation Mode: ON' : 'Simulation Mode: OFF'}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={onPrimaryAction}
                    style={[styles.primaryButton, isTracking ? styles.stopButton : styles.startButton]}
                >
                    <Text style={styles.primaryButtonText}>{isTracking ? 'END RUN' : 'START RUN'}</Text>
                </TouchableOpacity>

                <View style={styles.metricsWrap}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>{distanceMeters > 0 ? (distanceMeters / 1000).toFixed(2) : '0.00'} km</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Steps</Text>
                        <Text style={styles.metricValue}>{currentStepCount}</Text>
                    </View>
                </View>

                <View style={styles.metricsWrap}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Pace</Text>
                        <Text style={styles.metricValue}>{paceMinPerKm > 0 ? paceMinPerKm.toFixed(2) : '--'} min/km</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Cadence</Text>
                        <Text style={styles.metricValue}>{cadenceSpm > 0 ? Math.round(cadenceSpm) : 0} spm</Text>
                    </View>
                </View>

                <Text style={[styles.gpsStatus, gpsHealthy ? styles.gpsOk : styles.gpsWarn]}>
                    {simulateRun
                        ? 'Simulation is driving route and steps.'
                        : gpsHealthy
                            ? 'GPS signal stable'
                            : 'GPS signal weak. Keep moving in open sky.'}
                </Text>
            </View>
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
    controls: {
        backgroundColor: 'rgba(244, 247, 239, 0.97)',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: runSphereTheme.radius.lg,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d8e7d4',
        shadowColor: '#122018',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 8,
        minWidth: 318,
    },
    panelTitle: {
        color: runSphereTheme.colors.ink,
        fontFamily: runSphereTheme.font.heading,
        fontSize: 21,
        marginBottom: 10,
    },
    primaryButton: {
        minWidth: 260,
        borderRadius: runSphereTheme.radius.md,
        paddingVertical: 13,
        alignItems: 'center',
    },
    modeButton: {
        minWidth: 260,
        borderRadius: runSphereTheme.radius.md,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    modeButtonActive: {
        backgroundColor: '#115e59',
    },
    modeButtonInactive: {
        backgroundColor: '#5f6f65',
    },
    modeButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
    },
    startButton: {
        backgroundColor: '#0f766e',
    },
    stopButton: {
        backgroundColor: '#b91c1c',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },
    metricsWrap: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
        marginTop: 10,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: runSphereTheme.radius.sm,
        borderWidth: 1,
        borderColor: '#dbe9d8',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    metricLabel: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    metricValue: {
        marginTop: 4,
        color: runSphereTheme.colors.ink,
        fontSize: 14,
        fontWeight: '800',
    },
    gpsStatus: {
        marginTop: 12,
        fontWeight: '600',
        fontSize: 12,
        textAlign: 'center',
    },
    gpsOk: {
        color: '#166534',
    },
    gpsWarn: {
        color: '#b45309',
    },
});
