import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { runSphereTheme } from '@/constants/runSphereTheme';

export default function SignupScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async () => {
        try {
            const response = await fetch('http://10.0.2.2:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'Account created! Please login.');
                router.replace('/' as any);
            } else {
                Alert.alert('Error', data.error || 'Signup failed');
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
                    <Text style={styles.kicker}>NEW RUNNER</Text>
                    <Text style={styles.logoText}>Join RunSphere</Text>
                    <Text style={styles.subtitle}>Start claiming your streets today.</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>Create Account</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor="#6f7d70"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
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

                    <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
                        <Text style={styles.primaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.footerLink}>Log In</Text>
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
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#cbe8fa',
        top: -90,
        left: -40,
    },
    blobBottom: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: '#fee6bc',
        bottom: -120,
        right: -120,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    kicker: {
        fontSize: 11,
        letterSpacing: 1.6,
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '800',
    },
    logoText: {
        fontSize: 38,
        color: runSphereTheme.colors.ink,
        letterSpacing: 0.2,
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