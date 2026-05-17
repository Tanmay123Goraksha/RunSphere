import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { runSphereTheme } from '@/constants/runSphereTheme';

const formatPace = (pace) => {
    if (!pace) return '--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatDuration = (since) => {
    if (!since) return '--';
    const ms = Date.now() - new Date(since).getTime();
    const days = Math.floor(ms / 86400000);
    if (days > 0) return `${days}d`;
    const hrs = Math.floor(ms / 3600000);
    return hrs > 0 ? `${hrs}h` : '<1h';
};

export default function ZoneDetailCard({ visible, zone, onClose, onChallenge }) {
    if (!visible || !zone) return null;

    const stateLabel = zone.state === 'OWNED'
        ? (zone.is_mine ? 'YOUR ZONE' : 'ENEMY ZONE')
        : zone.state;

    const stateColor = zone.state === 'OWNED'
        ? (zone.is_mine ? runSphereTheme.colors.accent : runSphereTheme.colors.secondary)
        : zone.state === 'CONTESTED'
            ? runSphereTheme.colors.warn
            : runSphereTheme.colors.inkMuted;

    return (
        <View style={styles.backdrop}>
            <View style={styles.card}>
                <View style={styles.handle} />

                <View style={styles.header}>
                    <View>
                        <Text style={[styles.stateLabel, { color: stateColor }]}>{stateLabel}</Text>
                        <Text style={styles.hexId}>⬡ {zone.h3_index.slice(-8)}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {zone.owner_name && (
                    <View style={styles.ownerRow}>
                        <View style={styles.ownerAvatar}>
                            <Text style={styles.ownerAvatarText}>
                                {zone.owner_name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.ownerName}>{zone.owner_name}</Text>
                            <Text style={styles.ownerSub}>Zone Owner</Text>
                        </View>
                    </View>
                )}

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatPace(zone.best_pace)}</Text>
                        <Text style={styles.statLabel}>Best Pace</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{zone.total_defenses || 0}</Text>
                        <Text style={styles.statLabel}>Defenses</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatDuration(zone.held_since)}</Text>
                        <Text style={styles.statLabel}>Held</Text>
                    </View>
                </View>

                {zone.user_best_pace && (
                    <View style={styles.userPaceRow}>
                        <Text style={styles.userPaceLabel}>Your Best</Text>
                        <Text style={styles.userPaceValue}>{formatPace(zone.user_best_pace)} /km</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    {!zone.is_mine && zone.state !== 'UNCLAIMED' && onChallenge && (
                        <TouchableOpacity style={styles.challengeBtn} onPress={onChallenge}>
                            <Text style={styles.challengeBtnText}>⚔ CHALLENGE</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
    },
    card: {
        backgroundColor: runSphereTheme.colors.surface,
        borderTopLeftRadius: runSphereTheme.radius.xl,
        borderTopRightRadius: runSphereTheme.radius.xl,
        borderTopWidth: 1,
        borderColor: runSphereTheme.colors.glassBorder,
        padding: 20,
        paddingBottom: 32,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: runSphereTheme.colors.inkSubtle,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stateLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    hexId: {
        fontSize: 16,
        fontWeight: '800',
        color: runSphereTheme.colors.ink,
        marginTop: 2,
        fontFamily: runSphereTheme.font.heading,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: runSphereTheme.colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 14,
        fontWeight: '700',
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
    },
    ownerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: runSphereTheme.colors.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerAvatarText: {
        color: runSphereTheme.colors.accent,
        fontSize: 16,
        fontWeight: '900',
    },
    ownerName: {
        color: runSphereTheme.colors.ink,
        fontWeight: '800',
    },
    ownerSub: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: runSphereTheme.colors.ink,
        fontFamily: runSphereTheme.font.heading,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: runSphereTheme.colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 2,
    },
    userPaceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
    },
    userPaceLabel: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '700',
    },
    userPaceValue: {
        color: runSphereTheme.colors.accent,
        fontWeight: '800',
    },
    actions: {
        marginTop: 16,
        gap: 10,
    },
    challengeBtn: {
        backgroundColor: runSphereTheme.colors.secondarySoft,
        borderRadius: runSphereTheme.radius.pill,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: runSphereTheme.colors.secondary,
    },
    challengeBtnText: {
        color: runSphereTheme.colors.secondary,
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
});
