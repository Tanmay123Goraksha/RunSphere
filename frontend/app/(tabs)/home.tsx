import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import RunTrackerMap from '@/components/RunTrackerMap';
import { runSphereTheme } from '@/constants/runSphereTheme';

export default function HomeScreen() {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    router.replace('/' as any);
  };

  return (
    <View style={styles.container}>
      <RunTrackerMap />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.kicker}>LIVE TERRITORY</Text>
          <Text style={styles.headerTitle}>RunSphere</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Zone Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Territory</Text>
        <View style={styles.legendGrid}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(0, 229, 255, 0.30)', borderColor: 'rgba(0, 229, 255, 0.6)' }]} />
            <Text style={styles.legendText}>Mine</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(0, 230, 118, 0.25)', borderColor: 'rgba(0, 230, 118, 0.6)' }]} />
            <Text style={styles.legendText}>Club</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 23, 68, 0.28)', borderColor: 'rgba(255, 23, 68, 0.5)' }]} />
            <Text style={styles.legendText}>Enemy</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: runSphereTheme.colors.background,
  },
  headerBar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: runSphereTheme.colors.glassBackground,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: runSphereTheme.radius.md,
    borderWidth: 1,
    borderColor: runSphereTheme.colors.glassBorder,
    ...runSphereTheme.shadow.card,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: runSphereTheme.colors.accent,
    fontWeight: '700',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 24,
    color: runSphereTheme.colors.ink,
    fontFamily: runSphereTheme.font.heading,
  },
  logoutButton: {
    backgroundColor: runSphereTheme.colors.dangerSoft,
    borderRadius: runSphereTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: runSphereTheme.colors.danger,
  },
  logoutText: {
    color: runSphereTheme.colors.danger,
    fontWeight: '800',
    fontSize: 12,
  },
  legendContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    backgroundColor: runSphereTheme.colors.glassBackground,
    borderRadius: runSphereTheme.radius.sm,
    padding: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: runSphereTheme.colors.glassBorder,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: runSphereTheme.colors.inkMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendGrid: {
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10,
    color: runSphereTheme.colors.inkMuted,
    fontWeight: '600',
  },
});
