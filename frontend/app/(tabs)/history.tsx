import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { fetchRunsApi, RunSummary } from '@/services/runApi';
import { getLocalRuns, LocalRun, upsertLocalRun } from '@/services/runStorage';

type RunRow = {
    id: string;
    distanceKm: number;
    durationSeconds: number;
    avgPace: number | null;
    startedAt: string;
    endedAt?: string;
    source: 'local' | 'remote';
};

const toRunRow = (localRun: LocalRun): RunRow => ({
    id: localRun.id,
    distanceKm: localRun.distanceKm,
    durationSeconds: localRun.durationSeconds,
    avgPace: localRun.avgPace,
    startedAt: localRun.startedAt,
    endedAt: localRun.endedAt,
    source: 'local',
});

const fromRemote = (remote: RunSummary): RunRow => ({
    id: remote.id,
    distanceKm: Number(remote.distance_km) || 0,
    durationSeconds: Number(remote.duration_seconds) || 0,
    avgPace: remote.avg_pace !== null ? Number(remote.avg_pace) : null,
    startedAt: remote.started_at,
    endedAt: remote.ended_at || undefined,
    source: 'remote',
});

const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
};

export default function HistoryScreen() {
    const [runs, setRuns] = useState<RunRow[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadRuns = useCallback(async () => {
        setRefreshing(true);

        const localRuns = await getLocalRuns();
        const byId = new Map<string, RunRow>(localRuns.map((run) => [run.id, toRunRow(run)]));

        try {
            const remoteRuns = await fetchRunsApi();
            remoteRuns.forEach((remoteRun) => {
                byId.set(remoteRun.id, fromRemote(remoteRun));
            });

            for (const remoteRun of remoteRuns) {
                await upsertLocalRun({
                    id: remoteRun.id,
                    startedAt: remoteRun.started_at,
                    endedAt: remoteRun.ended_at || undefined,
                    distanceKm: Number(remoteRun.distance_km) || 0,
                    durationSeconds: Number(remoteRun.duration_seconds) || 0,
                    avgPace: remoteRun.avg_pace !== null ? Number(remoteRun.avg_pace) : null,
                    cadenceSpm: null,
                    points: [],
                });
            }
        } catch {
            // Local cache remains the source of truth when offline.
        }

        const merged = Array.from(byId.values()).sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );

        setRuns(merged);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadRuns().catch(() => {
            setRefreshing(false);
        });
    }, [loadRuns]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Run History</Text>
            <FlatList
                data={runs}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRuns} />}
                ListEmptyComponent={<Text style={styles.empty}>No runs yet. Start your first run.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/run/[id]' as any, params: { id: item.id } })}
                        style={styles.card}
                    >
                        <View style={styles.row}>
                            <Text style={styles.metricLabel}>Distance</Text>
                            <Text style={styles.metricValue}>{item.distanceKm.toFixed(2)} km</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.metricLabel}>Duration</Text>
                            <Text style={styles.metricValue}>{formatDuration(item.durationSeconds)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.metricLabel}>Avg Pace</Text>
                            <Text style={styles.metricValue}>
                                {item.avgPace && item.avgPace > 0 ? `${item.avgPace.toFixed(2)} min/km` : '--'}
                            </Text>
                        </View>
                        <Text style={styles.meta}>
                            {new Date(item.startedAt).toLocaleString()} {item.source === 'local' ? '• local' : ''}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: 60,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 14,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    metricLabel: {
        color: '#475569',
        fontWeight: '600',
    },
    metricValue: {
        color: '#0f172a',
        fontWeight: '700',
    },
    meta: {
        marginTop: 6,
        color: '#64748b',
        fontSize: 12,
    },
    empty: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 24,
        fontWeight: '600',
    },
});
