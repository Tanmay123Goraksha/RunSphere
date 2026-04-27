import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { runSphereTheme } from '@/constants/runSphereTheme';
import { fetchMyProgression, ProgressionSummary } from '@/services/progressionApi';
import { fetchPreRunRecommendations, RouteRecommendation } from '@/services/recommendationApi';

export default function ProgressionScreen() {
    const [summary, setSummary] = useState<ProgressionSummary | null>(null);
    const [recommendations, setRecommendations] = useState<RouteRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const progressionData = await fetchMyProgression();
            setSummary(progressionData);

            try {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status === 'granted') {
                    const current = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });

                    const recs = await fetchPreRunRecommendations({
                        latitude: current.coords.latitude,
                        longitude: current.coords.longitude,
                        radiusKm: 4,
                    });
                    setRecommendations(recs);
                }
            } catch {
                setRecommendations([]);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load().catch(() => {
            setLoading(false);
            setRefreshing(false);
        });
    }, [load]);

    if (loading && !summary) {
        return (
            <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={runSphereTheme.colors.accentStrong} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.kicker}>RUNNER PROFILE</Text>
            <Text style={styles.title}>Progression</Text>

            <ScrollView
                style={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                contentContainerStyle={styles.content}
            >
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Streak</Text>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Current</Text>
                        <Text style={styles.metricValue}>{summary?.streak.currentStreak || 0} days</Text>
                    </View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Longest</Text>
                        <Text style={styles.metricValue}>{summary?.streak.longestStreak || 0} days</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Performance Stats</Text>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Valid Runs</Text>
                        <Text style={styles.metricValue}>{summary?.stats.validRuns || 0}</Text>
                    </View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>{(summary?.stats.totalDistanceKm || 0).toFixed(2)} km</Text>
                    </View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Zone Captures</Text>
                        <Text style={styles.metricValue}>{summary?.stats.capturedEvents || 0}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Achievements</Text>
                    {summary?.achievements?.length ? (
                        summary.achievements.map((item) => (
                            <View key={`${item.code}-${item.unlocked_at}`} style={styles.achievementRow}>
                                <Text style={styles.achievementName}>{item.name}</Text>
                                <Text style={styles.achievementMeta}>+{item.xp_reward} XP</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No achievements unlocked yet.</Text>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Pre-Run Route Suggestions</Text>
                    {recommendations.length ? (
                        recommendations.map((item) => (
                            <View key={item.id} style={styles.recommendationRow}>
                                <View style={styles.recommendationMeta}>
                                    <Text style={styles.recommendationName}>{item.title}</Text>
                                    <Text style={styles.recommendationSub}>
                                        {item.distanceKm.toFixed(2)} km • score {item.score.composite.toFixed(1)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Allow location access to fetch route recommendations.</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: runSphereTheme.colors.background,
        paddingTop: 56,
        paddingHorizontal: 16,
    },
    loaderWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: runSphereTheme.colors.background,
    },
    kicker: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    title: {
        fontFamily: runSphereTheme.font.heading,
        fontSize: 34,
        color: runSphereTheme.colors.ink,
        marginTop: 2,
    },
    scroll: {
        marginTop: 12,
    },
    content: {
        paddingBottom: 24,
        gap: 12,
    },
    card: {
        backgroundColor: runSphereTheme.colors.surface,
        borderRadius: runSphereTheme.radius.md,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
        padding: 14,
        ...runSphereTheme.shadow.card,
    },
    cardTitle: {
        color: runSphereTheme.colors.ink,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    metricLabel: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '700',
    },
    metricValue: {
        color: runSphereTheme.colors.ink,
        fontWeight: '800',
    },
    achievementRow: {
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
        paddingVertical: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    achievementName: {
        color: runSphereTheme.colors.ink,
        fontWeight: '700',
    },
    achievementMeta: {
        color: runSphereTheme.colors.accentStrong,
        fontWeight: '800',
        fontSize: 12,
    },
    recommendationRow: {
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
        paddingVertical: 8,
    },
    recommendationMeta: {
        gap: 2,
    },
    recommendationName: {
        color: runSphereTheme.colors.ink,
        fontWeight: '800',
    },
    recommendationSub: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    emptyText: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '600',
    },
});
