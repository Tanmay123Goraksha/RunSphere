import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back to RunSphere</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title="Login" onPress={handleLogin} />

            <View style={styles.footer}>
                <Text>Don't have an account?</Text>
                <Button title="Sign Up" onPress={() => router.push('/signup' as any)} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
    footer: { marginTop: 20, alignItems: 'center' },
});