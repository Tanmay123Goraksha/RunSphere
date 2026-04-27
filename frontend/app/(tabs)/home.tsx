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
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.kicker}>LIVE TERRITORY</Text>
          <Text style={styles.headerTitle}>RunSphere</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: 'rgba(15, 118, 110, 0.88)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: runSphereTheme.radius.md,
    shadowColor: '#09322f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#d1fae5',
    fontWeight: '700',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 24,
    color: '#f0fdf4',
    fontFamily: runSphereTheme.font.heading,
  },
  logoutButton: {
    backgroundColor: '#ecfccb',
    borderRadius: runSphereTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#365314',
    fontWeight: '800',
    fontSize: 13,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
