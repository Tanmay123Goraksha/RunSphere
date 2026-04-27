import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runSphereTheme } from '@/constants/runSphereTheme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        const checkSession = async () => {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                router.replace('/(tabs)/home' as any);
            }
        };
        checkSession();
    }, []);

    const handleLogin = async () => {
        try {
            // Use 10.0.2.2 for Android emulator pointing to local host
            const response = await fetch('http://10.0.2.2:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('userToken', data.token);
                Alert.alert('Success', 'Logged in successfully!');
                router.replace('/(tabs)/home' as any);
            } else {
                Alert.alert('Error', data.error || 'Login failed');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not connect to server');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
        >
            <View style={styles.container}>
                <View style={styles.blobTop} />
                <View style={styles.blobBottom} />

                <View style={styles.headerContainer}>
                    <Text style={styles.kicker}>TERRITORY RUNNING</Text>
                    <Text style={styles.logoText}>RunSphere</Text>
                    <Text style={styles.subtitle}>Own the map one stride at a time.</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>Welcome Back</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#6f7d70"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#6f7d70"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                        <Text style={styles.primaryButtonText}>Log In</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/signup' as any)}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: runSphereTheme.colors.background,
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    blobTop: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: '#c7f0cf',
        top: -80,
        right: -40,
    },
    blobBottom: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#fee6bc',
        bottom: -120,
        left: -100,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    kicker: {
        fontSize: 11,
        letterSpacing: 1.4,
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '800',
    },
    logoText: {
        fontSize: 44,
        color: runSphereTheme.colors.ink,
        letterSpacing: 0.4,
        marginTop: 4,
        fontFamily: runSphereTheme.font.heading,
    },
    subtitle: {
        fontSize: 16,
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '600',
        marginTop: 4,
    },
    formContainer: {
        backgroundColor: runSphereTheme.colors.surface,
        padding: 24,
        borderRadius: runSphereTheme.radius.lg,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
        ...runSphereTheme.shadow.card,
    },
    formTitle: {
        color: runSphereTheme.colors.ink,
        fontSize: 20,
        marginBottom: 14,
        fontWeight: '800',
    },
    input: {
        backgroundColor: runSphereTheme.colors.surfaceMuted,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
        padding: 16,
        marginBottom: 16,
        borderRadius: 12,
        fontSize: 16,
        color: runSphereTheme.colors.ink,
    },
    primaryButton: {
        backgroundColor: runSphereTheme.colors.accentStrong,
        paddingVertical: 16,
        borderRadius: runSphereTheme.radius.md,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: runSphereTheme.colors.accentStrong,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.26,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        marginTop: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    footerText: {
        fontSize: 15,
        color: runSphereTheme.colors.inkMuted,
    },
    footerLink: {
        fontSize: 15,
        fontWeight: '800',
        color: runSphereTheme.colors.accentStrong,
    }
});