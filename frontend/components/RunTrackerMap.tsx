import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Button, Alert } from 'react-native';
import MapView, { Polyline, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import { usePedometer } from '../hooks/usePedometer';

// Haversine formula to calculate distance between two lat/long points in meters
const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Calculate approximate enclosed area of a polygon representing geographic coordinates
const calculatePolygonArea = (locations: { latitude: number, longitude: number }[]) => {
    if (locations.length < 3) return 0;
    const R = 6378137; // Earth's radius in meters

    // Convert geographic coordinates to flat Cartesian meters based on first point
    const refLat = locations[0].latitude;
    const refLon = locations[0].longitude;

    const points = locations.map(loc => {
        const x = (loc.longitude - refLon) * (Math.PI / 180) * R * Math.cos(refLat * (Math.PI / 180));
        const y = (loc.latitude - refLat) * (Math.PI / 180) * R;
        return { x, y };
    });

    // Standard Shoelace formula for polygon area
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
};

export default function RunTrackerMap() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
    const [territories, setTerritories] = useState<{ latitude: number; longitude: number }[][]>([]);

    const [isTracking, setIsTracking] = useState(false);
    const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);

    const { currentStepCount, isPedometerAvailable } = usePedometer(isTracking);
    const currentStepCountRef = useRef(0);
    const lastStepCount = useRef(0);

    useEffect(() => {
        currentStepCountRef.current = currentStepCount;
    }, [currentStepCount]);

    // --- MOCK DATA FOR EMULATOR TESTING (REAL STREETS IN GIRGAON) ---
    const MOCK_ROUTE = [
        { latitude: 18.9534, longitude: 72.8202 }, // Start on Charni Road East
        { latitude: 18.9535, longitude: 72.8220 }, // Move East towards intersection
        { latitude: 18.9525, longitude: 72.8222 }, // Move South down cross street
        { latitude: 18.9515, longitude: 72.8223 }, // Further South
        { latitude: 18.9514, longitude: 72.8205 }, // Move West
        { latitude: 18.9525, longitude: 72.8203 }, // Move North up parallel street
        { latitude: 18.9533, longitude: 72.8202 }, // Close the loop precisely near start
    ];

    const isMockingEnabled = true; // Toggle this to false for real physical devices

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.error('Permission to access location was denied');
                    return;
                }

                if (isMockingEnabled) {
                    // Force the map to center on our mock starting point
                    setLocation({
                        coords: {
                            ...MOCK_ROUTE[0],
                            altitude: 0, accuracy: 5, altitudeAccuracy: 5, heading: 0, speed: 0
                        },
                        timestamp: Date.now()
                    });
                    return;
                }

                // Use getLastKnownPositionAsync first, it's faster and less likely to throw on emulators
                let initialLocation = await Location.getLastKnownPositionAsync({});

                if (!initialLocation) {
                    // Try getting current position, but don't require high accuracy immediately on boot
                    initialLocation = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                }
                setLocation(initialLocation);
            } catch (error) {
                console.error("Error getting initial location:", error);
                // Fallback location or handle gracefully
            }
        })();
    }, []);

    const toggleTracking = async () => {
        if (isTracking) {
            // STOP tracking
            if (subscription) {
                subscription.remove();
                setSubscription(null);
            }
            setIsTracking(false);

            // Territory Capture Logic: Did they run in a loop?
            if (route.length > 3) { // Ensure minimum distance/points
                const startPoint = route[0];
                const endPoint = route[route.length - 1];

                // If they ended within 50 meters of their start point, it's a loop!
                const distance = getDistanceFromLatLonInMeters(
                    startPoint.latitude, startPoint.longitude,
                    endPoint.latitude, endPoint.longitude
                );

                if (distance < 75) { // Forgiving radius for street intersections 
                    const areaSqMeters = calculatePolygonArea(route);
                    const pointsEarned = Math.floor(areaSqMeters / 100); // e.g. 1 point per 100 sqm

                    Alert.alert(
                        "Territory Captured!",
                        `You enclosed ${Math.round(areaSqMeters)} sq meters and earned ${pointsEarned} XP!`
                    );
                    setTerritories((prev) => [...prev, route]); // Save as a shaded region
                } else {
                    Alert.alert("Run Finished", `But no loop was detected. You were ${Math.round(distance)}m away from your start point.`);
                }
            }
        } else {
            // START tracking
            setRoute([]); // Clear old line
            setIsTracking(true);

            if (isMockingEnabled) {
                // --- EMULATOR MOCK RUN (REAL STREETS) ---
                let step = 0;
                setRoute([MOCK_ROUTE[0]]); // Start immediately at point 0

                const mockInterval = setInterval(() => {
                    step++;

                    if (step < MOCK_ROUTE.length) {
                        const newPoint = MOCK_ROUTE[step];
                        setRoute(currentRoute => [...currentRoute, newPoint]);

                        // Also physically move the blue user dot camera to simulate running there
                        setLocation({
                            coords: {
                                ...newPoint,
                                altitude: 0, accuracy: 5, altitudeAccuracy: 5, heading: 0, speed: 2
                            },
                            timestamp: Date.now()
                        });
                    }

                    if (step >= MOCK_ROUTE.length - 1) {
                        clearInterval(mockInterval);
                        // Do not auto-stop. Let the user see the full route and press 'STOP' 
                        // themselves to trigger the accurate distance logic and coloring!
                    }
                }, 1500); // Wait 1.5 seconds between street coordinate nodes

                // Store the interval ID as if it was a subscription so it can be cleared
                setSubscription({ remove: () => clearInterval(mockInterval) } as any);
                return;
            }

            // --- REAL DEVICE GPS TRACKING ---
            const sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 2000,
                    distanceInterval: 1,
                },
                (loc) => {
                    setLocation(loc);

                    // GPS + Step Fusion Logic: Filter Noise
                    const latestSteps = currentStepCountRef.current;
                    const stepsTaken = latestSteps - lastStepCount.current;

                    if (stepsTaken > 0 || latestSteps === 0) {
                        setRoute((currentRoute) => [
                            ...currentRoute,
                            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                        ]);
                        lastStepCount.current = latestSteps;
                    } else {
                        console.log("GPS discarded: No steps detected");
                    }
                }
            );
            setSubscription(sub);
        }
    };

    return (
        <View style={styles.container}>
            {location ? (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    showsUserLocation
                >
                    {route.length > 0 && (
                        <Polyline
                            coordinates={route}
                            strokeColor="#FF0000" // red
                            strokeWidth={5}
                        />
                    )}

                    {territories.map((territoryRegion, index) => (
                        <Polygon
                            key={index}
                            coordinates={territoryRegion}
                            fillColor="rgba(0, 150, 255, 0.4)" // Translucent Blue overlay
                            strokeColor="rgba(0, 0, 255, 0.8)"
                            strokeWidth={2}
                        />
                    ))}
                </MapView>
            ) : (
                <Text>Getting Location...</Text>
            )}

            <View style={styles.controls}>
                <Button
                    title={isTracking ? '🏁 END RUN' : '🚀 START RUN'}
                    onPress={toggleTracking}
                    color={isTracking ? '#ef4444' : '#10b981'} // nicer red/green
                />
                <View style={styles.statsRow}>
                    <Text style={styles.stats}>📍 Points: {route.length}</Text>
                    <Text style={styles.stats}>👟 Steps: {currentStepCount}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    controls: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 20,
        marginBottom: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
        minWidth: 200,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 20,
    },
    stats: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155'
    },
});
