import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Polyline } from 'react-native-maps';

import { fetchRunByIdApi } from '@/services/runApi';
import { getLocalRunById } from '@/services/runStorage';
import { runSphereTheme } from '@/constants/runSphereTheme';
import { darkMapStyle } from '@/constants/darkMapStyle';

const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
};

const fromLocal = (run) => ({
    id: run.id,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    distanceKm: run.distanceKm,
    durationSeconds: run.durationSeconds,
    avgPace: run.avgPace,
    cadenceSpm: run.cadenceSpm,
    points: run.points.map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
});

export default function RunDetailScreen() {
    const params = useLocalSearchParams();
    const runId = params.id;
    const [run, setRun] = useState(null);

    useEffect(() => {
        const load = async () => {
            if (!runId) return;
            const local = await getLocalRunById(runId);
            if (local) setRun(fromLocal(local));
            try {
                const remote = await fetchRunByIdApi(runId);
                setRun({
                    id: remote.id, startedAt: remote.started_at,
                    endedAt: remote.ended_at || undefined,
                    distanceKm: Number(remote.distance_km) || 0,
                    durationSeconds: Number(remote.duration_seconds) || 0,
                    avgPace: remote.avg_pace !== null ? Number(remote.avg_pace) : null,
                    cadenceSpm: null,
                    points: remote.points.map((point) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) })),
                });
            } catch { /* Keep local details if API request fails */ }
        };
        load().catch(() => {});
    }, [runId]);

    const initialRegion = useMemo(() => {
        if (!run || run.points.length === 0) {
            return { latitude: 18.9544, longitude: 72.8126, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        }
        return { latitude: run.points[0].latitude, longitude: run.points[0].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }, [run]);

    if (!run) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading run details...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Run Details</Text>
            <Text style={styles.meta}>{new Date(run.startedAt).toLocaleString()}</Text>

            <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Distance</Text>
                    <Text style={styles.metricValue}>{run.distanceKm.toFixed(2)} km</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>{formatDuration(run.durationSeconds)}</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Avg Pace</Text>
                    <Text style={styles.metricValue}>
                        {run.avgPace && run.avgPace > 0 ? `${run.avgPace.toFixed(2)} min/km` : '--'}
                    </Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Cadence</Text>
                    <Text style={styles.metricValue}>{run.cadenceSpm ? `${Math.round(run.cadenceSpm)} spm` : '--'}</Text>
                </View>
            </View>

            <View style={styles.mapWrap}>
                <MapView style={styles.map} initialRegion={initialRegion} customMapStyle={darkMapStyle} userInterfaceStyle="dark">
                    {run.points.length > 0 && (
                        <>
                            <Polyline coordinates={run.points} strokeColor={runSphereTheme.colors.runPathGlow} strokeWidth={10} />
                            <Polyline coordinates={run.points} strokeColor={runSphereTheme.colors.runPath} strokeWidth={4} />
                        </>
                    )}
                </MapView>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: runSphereTheme.colors.background },
    content: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 24 },
    title: {
        fontSize: 34,
        color: runSphereTheme.colors.ink,
        fontFamily: runSphereTheme.font.heading,
    },
    meta: {
        marginTop: 6,
        color: runSphereTheme.colors.inkMuted,
        marginBottom: 14,
        fontWeight: '600',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    metricCard: {
        width: '48%',
        backgroundColor: runSphereTheme.colors.surface,
        borderRadius: runSphereTheme.radius.md,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.glassBorder,
        padding: 12,
        ...runSphereTheme.shadow.card,
    },
    metricLabel: { color: runSphereTheme.colors.inkMuted, fontWeight: '700' },
    metricValue: {
        marginTop: 4,
        color: runSphereTheme.colors.ink,
        fontWeight: '800',
        fontSize: 16,
    },
    mapWrap: {
        marginTop: 16,
        borderRadius: runSphereTheme.radius.md,
        overflow: 'hidden',
        height: 340,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.glassBorder,
    },
    map: { flex: 1 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: runSphereTheme.colors.background,
    },
    emptyText: { color: runSphereTheme.colors.inkMuted, fontWeight: '700' },
});
