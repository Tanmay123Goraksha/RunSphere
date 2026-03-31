import { StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import RunTrackerMap from '@/components/RunTrackerMap';

export default function HomeScreen() {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    router.replace('/' as any);
  };

  return (
    <View style={styles.container}>
      <RunTrackerMap />
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>RunSphere</Text>
        <Button title="Logout" onPress={handleLogout} color="#475569" />
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
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
