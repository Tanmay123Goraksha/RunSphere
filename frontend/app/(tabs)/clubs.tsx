import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { runSphereTheme } from '@/constants/runSphereTheme';
import { Club, createClubApi, fetchClubs, fetchMyClubs, joinClubApi, leaveClubApi } from '@/services/clubApi';

export default function ClubsScreen() {
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [myClubs, setMyClubs] = useState<Club[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const [all, mine] = await Promise.all([fetchClubs(), fetchMyClubs()]);
            setAllClubs(all);
            setMyClubs(mine);
        } catch {
            Alert.alert('Error', 'Failed to load clubs right now.');
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load().catch(() => {
            // Error handled in loader.
        });
    }, [load]);

    const mySet = new Set(myClubs.map((club) => club.id));

    const onCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Club name is required.');
            return;
        }

        try {
            setCreating(true);
            await createClubApi({ name: name.trim(), description: description.trim() || undefined });
            setName('');
            setDescription('');
            await load();
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to create club');
        } finally {
            setCreating(false);
        }
    };

    const onJoinLeave = async (clubId: string, isMember: boolean) => {
        try {
            if (isMember) {
                await leaveClubApi(clubId);
            } else {
                await joinClubApi(clubId);
            }
            await load();
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Action failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.kicker}>COMMUNITY</Text>
            <Text style={styles.title}>Clubs</Text>

            <ScrollView
                style={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
                contentContainerStyle={styles.content}
            >
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Create Club</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Club name"
                        placeholderTextColor="#6f7d70"
                        style={styles.input}
                    />
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Description (optional)"
                        placeholderTextColor="#6f7d70"
                        style={[styles.input, styles.inputMultiline]}
                        multiline
                    />

                    <TouchableOpacity style={styles.primaryButton} onPress={onCreate} disabled={creating}>
                        <Text style={styles.primaryText}>{creating ? 'Creating...' : 'Create Club'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>My Clubs</Text>
                    {myClubs.length === 0 ? (
                        <Text style={styles.emptyText}>Join or create a club to start competing together.</Text>
                    ) : (
                        myClubs.map((club) => (
                            <View key={`my-${club.id}`} style={styles.clubRow}>
                                <View style={styles.clubMeta}>
                                    <Text style={styles.clubName}>{club.name}</Text>
                                    <Text style={styles.clubDesc}>{club.role || 'MEMBER'}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Explore Clubs</Text>
                    {allClubs.length === 0 ? (
                        <Text style={styles.emptyText}>No clubs yet. Be the first creator.</Text>
                    ) : (
                        allClubs.map((club) => {
                            const isMember = mySet.has(club.id);
                            return (
                                <View key={club.id} style={styles.clubRow}>
                                    <View style={styles.clubMeta}>
                                        <Text style={styles.clubName}>{club.name}</Text>
                                        <Text style={styles.clubDesc}>{club.description || 'No description'}</Text>
                                        <Text style={styles.memberCount}>{Number(club.member_count || 0)} members</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.joinButton, isMember ? styles.leaveButton : styles.joinButtonActive]}
                                        onPress={() => onJoinLeave(club.id, isMember)}
                                    >
                                        <Text style={[styles.joinText, isMember && styles.leaveText]}>
                                            {isMember ? 'Leave' : 'Join'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: runSphereTheme.colors.background,
        paddingTop: 56,
        paddingHorizontal: 16,
    },
    kicker: {
        color: runSphereTheme.colors.inkMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    title: {
        fontFamily: runSphereTheme.font.heading,
        fontSize: 34,
        color: runSphereTheme.colors.ink,
        marginTop: 2,
    },
    scroll: {
        marginTop: 12,
    },
    content: {
        paddingBottom: 24,
        gap: 12,
    },
    card: {
        backgroundColor: runSphereTheme.colors.surface,
        borderRadius: runSphereTheme.radius.md,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
        padding: 14,
        ...runSphereTheme.shadow.card,
    },
    cardTitle: {
        color: runSphereTheme.colors.ink,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 10,
    },
    input: {
        backgroundColor: runSphereTheme.colors.surfaceMuted,
        borderWidth: 1,
        borderColor: runSphereTheme.colors.line,
        borderRadius: runSphereTheme.radius.sm,
        color: runSphereTheme.colors.ink,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    inputMultiline: {
        minHeight: 72,
        textAlignVertical: 'top',
    },
    primaryButton: {
        backgroundColor: runSphereTheme.colors.accentStrong,
        borderRadius: runSphereTheme.radius.pill,
        alignItems: 'center',
        paddingVertical: 11,
    },
    primaryText: {
        color: '#f0fdf4',
        fontWeight: '800',
    },
    clubRow: {
        borderTopWidth: 1,
        borderTopColor: runSphereTheme.colors.line,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    clubMeta: {
        flex: 1,
    },
    clubName: {
        color: runSphereTheme.colors.ink,
        fontWeight: '800',
    },
    clubDesc: {
        marginTop: 2,
        color: runSphereTheme.colors.inkMuted,
        fontSize: 12,
    },
    memberCount: {
        marginTop: 4,
        color: runSphereTheme.colors.accentStrong,
        fontSize: 12,
        fontWeight: '700',
    },
    joinButton: {
        borderRadius: runSphereTheme.radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    joinButtonActive: {
        backgroundColor: runSphereTheme.colors.accentSoft,
    },
    leaveButton: {
        backgroundColor: '#ffe4e6',
    },
    joinText: {
        color: runSphereTheme.colors.accentStrong,
        fontWeight: '800',
        fontSize: 12,
    },
    leaveText: {
        color: '#b91c1c',
    },
    emptyText: {
        color: runSphereTheme.colors.inkMuted,
        fontWeight: '600',
    },
});
