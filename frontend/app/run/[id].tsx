import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Polyline } from 'react-native-maps';

import { fetchRunByIdApi } from '@/services/runApi';
import { getLocalRunById, LocalRun } from '@/services/runStorage';

type DisplayRun = {
    id: string;
    startedAt: string;
    endedAt?: string;
    distanceKm: number;
    durationSeconds: number;
    avgPace: number | null;
    cadenceSpm: number | null;
    points: Array<{ latitude: number; longitude: number }>;
};

const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
};

const fromLocal = (run: LocalRun): DisplayRun => ({
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
    const params = useLocalSearchParams<{ id: string }>();
    const runId = params.id;
    const [run, setRun] = useState<DisplayRun | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!runId) return;

            const local = await getLocalRunById(runId);
            if (local) {
                setRun(fromLocal(local));
            }

            try {
                const remote = await fetchRunByIdApi(runId);
                setRun({
                    id: remote.id,
                    startedAt: remote.started_at,
                    endedAt: remote.ended_at || undefined,
                    distanceKm: Number(remote.distance_km) || 0,
                    durationSeconds: Number(remote.duration_seconds) || 0,
                    avgPace: remote.avg_pace !== null ? Number(remote.avg_pace) : null,
                    cadenceSpm: null,
                    points: remote.points.map((point) => ({
                        latitude: Number(point.latitude),
                        longitude: Number(point.longitude),
                    })),
                });
            } catch {
                // Keep local details if API request fails.
            }
        };

        load().catch(() => {
            // Keep best-known run state.
        });
    }, [runId]);

    const initialRegion = useMemo(() => {
        if (!run || run.points.length === 0) {
            return {
                latitude: 18.5204,
                longitude: 73.8567,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
        }

        return {
            latitude: run.points[0].latitude,
            longitude: run.points[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
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
                <MapView style={styles.map} initialRegion={initialRegion}>
                    {run.points.length > 0 && <Polyline coordinates={run.points} strokeColor="#ef4444" strokeWidth={5} />}
                </MapView>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f172a',
    },
    meta: {
        marginTop: 6,
        color: '#64748b',
        marginBottom: 12,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    metricLabel: {
        color: '#475569',
        fontWeight: '600',
    },
    metricValue: {
        marginTop: 4,
        color: '#0f172a',
        fontWeight: '800',
        fontSize: 16,
    },
    mapWrap: {
        marginTop: 16,
        borderRadius: 14,
        overflow: 'hidden',
        height: 340,
    },
    map: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    emptyText: {
        color: '#64748b',
        fontWeight: '700',
    },
});
