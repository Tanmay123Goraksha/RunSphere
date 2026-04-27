import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { runSphereTheme } from '@/constants/runSphereTheme';
import { fetchLeaderboard, LeaderboardEntry } from '@/services/leaderboardApi';

type Scope = 'global' | 'weekly' | 'nearby';

export default function LeaderboardScreen() {
    const [scope, setScope] = useState<Scope>('global');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        const resolveLocation = async () => {
            try {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status !== 'granted') return;

                const current = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                setCoords({
                    latitude: current.coords.latitude,
                    longitude: current.coords.longitude,
                });
            } catch {
                // Nearby leaderboard gracefully falls back.
            }
        };

        resolveLocation();
    }, []);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const payload =
                scope === 'nearby' && coords
                    ? await fetchLeaderboard({
                        scope: 'nearby',
                        limit: 25,
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        radiusKm: 4,
                    })
                    : await fetchLeaderboard({ scope: scope === 'nearby' ? 'global' : scope, limit: 25 });

            setEntries(payload.entries || []);
        } catch (loadError: any) {
            setError(loadError?.message || 'Failed to load leaderboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [scope, coords]);

    useEffect(() => {
        load().catch(() => {
            // Error state handled in loader.
        });
    }, [load]);

    return (
        <View style={styles.container}>
            <Text style={styles.kicker}>COMPETITIVE RANKING</Text>
            <Text style={styles.title}>Leaderboards</Text>

            <View style={styles.scopeRow}>
                {(['global', 'weekly', 'nearby'] as Scope[]).map((item) => (
                    <TouchableOpacity
                        key={item}
                        style={[styles.scopeButton, scope === item && styles.scopeButtonActive]}
                        onPress={() => setScope(item)}
                    >
                        <Text style={[styles.scopeText, scope === item && styles.scopeTextActive]}>{item.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color={runSphereTheme.colors.accentStrong} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                >
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {entries.length === 0 ? (
                        <Text style={styles.empty}>No ranking data yet. Complete a run to appear here.</Text>
                    ) : (
                        entries.map((entry) => (
                            <View key={`${entry.userId}-${entry.rank}`} style={styles.rowCard}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>#{entry.rank}</Text>
                                </View>

                                <View style={styles.metaWrap}>
                                    <Text style={styles.userText}>{entry.userId.slice(0, 8)}...</Text>
                                    <Text style={styles.scoreText}>{Math.round(entry.score)} pts</Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
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
    scopeRow: {
        flexDirection: 'row',
        marginTop: 14,
        gap: 8,
    },
    scopeButton: {
        backgroundColor: runSphereTheme.colors.surfaceMuted,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: runSphereTheme.radius.pill,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
    },
    scopeButtonActive: {
        backgroundColor: runSphereTheme.colors.accentStrong,
        borderColor: runSphereTheme.colors.accentStrong,
    },
    scopeText: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '700',
        fontSize: 11,
    },
    scopeTextActive: {
        color: '#f0fdf4',
    },
    scroll: {
        marginTop: 14,
    },
    rowCard: {
        backgroundColor: runSphereTheme.colors.surface,
        borderRadius: runSphereTheme.radius.md,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...runSphereTheme.shadow.card,
    },
    rankBadge: {
        minWidth: 56,
        borderRadius: runSphereTheme.radius.sm,
        backgroundColor: runSphereTheme.colors.accentSoft,
        paddingVertical: 8,
        alignItems: 'center',
    },
    rankText: {
        color: runSphereTheme.colors.accentStrong,
        fontWeight: '900',
    },
    metaWrap: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userText: {
        color: runSphereTheme.colors.ink,
        fontWeight: '700',
    },
    scoreText: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '800',
    },
    loaderWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        marginTop: 40,
        color: runSphereTheme.colors.inkMuted,
        textAlign: 'center',
        fontWeight: '700',
    },
    errorText: {
        marginBottom: 8,
        color: runSphereTheme.colors.warn,
        fontWeight: '700',
    },
});
