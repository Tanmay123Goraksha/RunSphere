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
                router.replace('/(tabs)/home');
            }
        };
        checkSession();
    }, []);

    const handleLogin = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('userToken', data.token);
                Alert.alert('Success', 'Logged in successfully!');
                router.replace('/(tabs)/home');
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
                {/* Decorative glow circles */}
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

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
                        placeholderTextColor={runSphereTheme.colors.inkSubtle}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={runSphereTheme.colors.inkSubtle}
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
                    <TouchableOpacity onPress={() => router.push('/signup')}>
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
    glowTop: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(0, 229, 255, 0.04)',
        top: -100,
        right: -60,
    },
    glowBottom: {
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: 'rgba(168, 85, 247, 0.04)',
        bottom: -140,
        left: -120,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    kicker: {
        fontSize: 11,
        letterSpacing: 1.4,
        color: runSphereTheme.colors.accent,
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
        borderColor: runSphereTheme.colors.glassBorder,
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
        backgroundColor: runSphereTheme.colors.accent,
        paddingVertical: 16,
        borderRadius: runSphereTheme.radius.md,
        alignItems: 'center',
        marginTop: 8,
        ...runSphereTheme.shadow.accentButton,
    },
    primaryButtonText: {
        color: '#0a0a1a',
        fontSize: 18,
        fontWeight: '900',
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
        color: runSphereTheme.colors.accent,
    }
});