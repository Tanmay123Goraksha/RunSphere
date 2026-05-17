import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { runSphereTheme } from '@/constants/runSphereTheme';

export default function RunTrackerMap() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>🗺️ Map tracking is available on the mobile app.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: runSphereTheme.colors.surfaceElevated,
    },
    text: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 14,
        fontWeight: '600',
    }
});
