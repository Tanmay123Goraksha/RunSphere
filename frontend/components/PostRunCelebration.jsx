import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { runSphereTheme } from '@/constants/runSphereTheme';

const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function PostRunCelebration({
    visible,
    distanceKm,
    durationSeconds,
    avgPace,
    zonesCaptured,
    xpEarned,
    territoryCaptured,
    territoryMessage,
    achievements,
    onDismiss,
}) {
    const containerOpacity = useRef(new Animated.Value(0)).current;
    const bannerTranslateY = useRef(new Animated.Value(-100)).current;
    const statsScale = useRef(new Animated.Value(0.5)).current;
    const xpTranslateY = useRef(new Animated.Value(20)).current;
    const xpOpacity = useRef(new Animated.Value(0)).current;
    const badgeScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) {
            containerOpacity.setValue(0);
            return;
        }

        Animated.sequence([
            Animated.timing(containerOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(bannerTranslateY, {
                toValue: 0,
                friction: 6,
                tension: 100,
                useNativeDriver: true,
            }),
            Animated.spring(statsScale, {
                toValue: 1,
                friction: 5,
                tension: 120,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(xpOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(xpTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            Animated.spring(badgeScale, {
                toValue: 1,
                friction: 3,
                tension: 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.overlay, { opacity: containerOpacity }]}>
            <View style={styles.container}>
                {/* Header banner */}
                <Animated.View style={[styles.banner, { transform: [{ translateY: bannerTranslateY }] }]}>
                    <Text style={styles.bannerEmoji}>{territoryCaptured ? '🏴' : '🏃'}</Text>
                    <Text style={styles.bannerTitle}>
                        {territoryCaptured ? 'Territory Claimed!' : 'Run Complete!'}
                    </Text>
                    <Text style={styles.bannerSubtitle}>{territoryMessage}</Text>
                </Animated.View>

                {/* Stats grid */}
                <Animated.View style={[styles.statsGrid, { transform: [{ scale: statsScale }] }]}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{distanceKm.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>km</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
                        <Text style={styles.statLabel}>duration</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {avgPace && avgPace > 0 ? avgPace.toFixed(1) : '--'}
                        </Text>
                        <Text style={styles.statLabel}>min/km</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, styles.zoneStatValue]}>{zonesCaptured}</Text>
                        <Text style={styles.statLabel}>zones</Text>
                    </View>
                </Animated.View>

                {/* XP earned */}
                {xpEarned > 0 && (
                    <Animated.View
                        style={[
                            styles.xpRow,
                            { opacity: xpOpacity, transform: [{ translateY: xpTranslateY }] },
                        ]}
                    >
                        <Text style={styles.xpText}>+{xpEarned} XP</Text>
                    </Animated.View>
                )}

                {/* Achievement badges */}
                {achievements.length > 0 && (
                    <Animated.View style={[styles.achievementSection, { transform: [{ scale: badgeScale }] }]}>
                        <Text style={styles.achievementTitle}>🏆 Achievements Unlocked</Text>
                        {achievements.map((a) => (
                            <View key={a.code} style={styles.achievementRow}>
                                <Text style={styles.achievementName}>{a.name}</Text>
                                <Text style={styles.achievementXP}>+{a.xp_reward} XP</Text>
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* Dismiss button */}
                <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.8}>
                    <Text style={styles.dismissText}>CONTINUE</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(5, 5, 15, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    container: {
        width: '90%',
        alignItems: 'center',
        paddingVertical: 30,
    },
    banner: {
        alignItems: 'center',
        marginBottom: 24,
    },
    bannerEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    bannerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: runSphereTheme.colors.accent,
        fontFamily: runSphereTheme.font.heading,
        letterSpacing: 0.5,
    },
    bannerSubtitle: {
        marginTop: 6,
        fontSize: 14,
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '600',
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        width: '45%',
        backgroundColor: runSphereTheme.colors.surface,
        borderRadius: runSphereTheme.radius.md,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.glassBorder,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: runSphereTheme.colors.ink,
        fontFamily: runSphereTheme.font.heading,
    },
    zoneStatValue: {
        color: runSphereTheme.colors.accent,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: runSphereTheme.colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    xpRow: {
        marginBottom: 20,
    },
    xpText: {
        fontSize: 28,
        fontWeight: '900',
        color: runSphereTheme.colors.xp,
        fontFamily: runSphereTheme.font.heading,
        textShadowColor: 'rgba(255, 214, 0, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
    achievementSection: {
        width: '100%',
        marginBottom: 20,
    },
    achievementTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: runSphereTheme.colors.xp,
        textAlign: 'center',
        marginBottom: 10,
    },
    achievementRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: runSphereTheme.colors.xpSoft,
        borderRadius: runSphereTheme.radius.sm,
        padding: 12,
        marginBottom: 6,
    },
    achievementName: {
        color: runSphereTheme.colors.ink,
        fontWeight: '700',
    },
    achievementXP: {
        color: runSphereTheme.colors.xp,
        fontWeight: '800',
    },
    dismissButton: {
        backgroundColor: runSphereTheme.colors.accent,
        borderRadius: runSphereTheme.radius.lg,
        paddingVertical: 16,
        paddingHorizontal: 48,
        ...runSphereTheme.shadow.accentButton,
    },
    dismissText: {
        color: '#0a0a1a',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
});
