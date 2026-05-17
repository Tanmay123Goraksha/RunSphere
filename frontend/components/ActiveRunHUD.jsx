import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { runSphereTheme } from '@/constants/runSphereTheme';
import { useGlowPulse } from '@/hooks/useAnimations';

const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ActiveRunHUD({
    distanceMeters,
    elapsedSeconds,
    paceMinPerKm,
    currentStepCount,
    cadenceSpm,
    zonesCaptured,
    gpsHealthy,
    simulateRun,
    isTracking,
    onStop,
}) {
    const { glow } = useGlowPulse(isTracking);

    return (
        <View style={styles.container}>
            {/* Primary metrics row */}
            <View style={styles.primaryRow}>
                <View style={styles.primaryMetric}>
                    <Text style={styles.primaryValue}>
                        {distanceMeters > 0 ? (distanceMeters / 1000).toFixed(2) : '0.00'}
                    </Text>
                    <Text style={styles.primaryUnit}>km</Text>
                </View>

                <View style={[styles.primaryMetric, styles.primaryMetricCenter]}>
                    <Text style={styles.primaryValue}>{formatTime(elapsedSeconds)}</Text>
                    <Text style={styles.primaryUnit}>time</Text>
                </View>

                <View style={styles.primaryMetric}>
                    <Text style={styles.primaryValue}>
                        {paceMinPerKm > 0 ? paceMinPerKm.toFixed(1) : '--'}
                    </Text>
                    <Text style={styles.primaryUnit}>min/km</Text>
                </View>
            </View>

            {/* Secondary metrics row */}
            <View style={styles.secondaryRow}>
                <View style={styles.secondaryMetric}>
                    <Text style={styles.secondaryIcon}>👟</Text>
                    <Text style={styles.secondaryValue}>{currentStepCount}</Text>
                </View>

                <View style={styles.secondaryMetric}>
                    <Text style={styles.secondaryIcon}>⚡</Text>
                    <Text style={styles.secondaryValue}>
                        {cadenceSpm > 0 ? Math.round(cadenceSpm) : 0} spm
                    </Text>
                </View>

                <View style={styles.secondaryMetric}>
                    <Text style={styles.secondaryIcon}>⬡</Text>
                    <Text style={[styles.secondaryValue, styles.zoneCount]}>{zonesCaptured}</Text>
                </View>
            </View>

            {/* GPS status */}
            <Text style={[styles.gpsStatus, gpsHealthy ? styles.gpsOk : styles.gpsWarn]}>
                {simulateRun
                    ? '◉ Simulation active'
                    : gpsHealthy
                        ? '◉ GPS locked'
                        : '◌ GPS searching...'}
            </Text>

            {/* Stop button */}
            <Animated.View style={[styles.stopWrap, { opacity: Animated.add(0.7, glow) }]}>
                <TouchableOpacity style={styles.stopButton} onPress={onStop} activeOpacity={0.8}>
                    <Text style={styles.stopText}>STOP RUN</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: runSphereTheme.colors.glassBackground,
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.glassBorder,
        paddingTop: 16,
        paddingBottom: 28,
        paddingHorizontal: 20,
    },
    primaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    primaryMetric: {
        flex: 1,
        alignItems: 'center',
    },
    primaryMetricCenter: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: runSphereTheme.colors.line,
    },
    primaryValue: {
        fontSize: 28,
        fontWeight: '800',
        color: runSphereTheme.colors.ink,
        fontFamily: runSphereTheme.font.heading,
    },
    primaryUnit: {
        fontSize: 10,
        fontWeight: '700',
        color: runSphereTheme.colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    secondaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
    },
    secondaryMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    secondaryIcon: {
        fontSize: 14,
    },
    secondaryValue: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '700',
        fontSize: 13,
    },
    zoneCount: {
        color: runSphereTheme.colors.accent,
        fontWeight: '800',
    },
    gpsStatus: {
        textAlign: 'center',
        marginTop: 10,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    gpsOk: {
        color: runSphereTheme.colors.success,
    },
    gpsWarn: {
        color: runSphereTheme.colors.warn,
    },
    stopWrap: {
        marginTop: 14,
        alignItems: 'center',
    },
    stopButton: {
        backgroundColor: runSphereTheme.colors.danger,
        borderRadius: runSphereTheme.radius.lg,
        minWidth: 200,
        minHeight: 56,
        justifyContent: 'center',
        alignItems: 'center',
        ...runSphereTheme.shadow.dangerButton,
    },
    stopText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
});
