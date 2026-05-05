// ─── RunSphere Dark Neon Design System ─────────────────────────────────────
// Think: cyberpunk territory map meets competitive fitness tracker

export const runSphereTheme = {
    colors: {
        // Core surfaces
        background: '#0a0a1a',
        backgroundAlt: '#0d0d24',
        surface: '#121228',
        surfaceElevated: '#1a1a3a',
        surfaceMuted: '#0f0f22',

        // Glass effect overlays
        glassBackground: 'rgba(18, 18, 40, 0.85)',
        glassBorder: 'rgba(0, 229, 255, 0.12)',

        // Text
        ink: '#e8eaed',
        inkMuted: '#8a8aad',
        inkSubtle: '#555577',

        // Primary accent — electric cyan
        accent: '#00E5FF',
        accentStrong: '#00BCD4',
        accentSoft: 'rgba(0, 229, 255, 0.12)',
        accentGlow: 'rgba(0, 229, 255, 0.25)',

        // Secondary — violet
        secondary: '#A855F7',
        secondarySoft: 'rgba(168, 85, 247, 0.15)',

        // Status
        danger: '#FF1744',
        dangerSoft: 'rgba(255, 23, 68, 0.12)',
        warn: '#FF9100',
        warnSoft: 'rgba(255, 145, 0, 0.12)',
        success: '#00E676',
        successSoft: 'rgba(0, 230, 118, 0.12)',

        // Gamification
        xp: '#FFD600',
        xpSoft: 'rgba(255, 214, 0, 0.12)',
        streak: '#FF6D00',

        // Zone colors
        zoneMyFill: 'rgba(0, 229, 255, 0.25)',
        zoneMyStroke: 'rgba(0, 229, 255, 0.8)',
        zoneMyGlow: 'rgba(0, 229, 255, 0.10)',

        zoneEnemyFill: 'rgba(168, 85, 247, 0.25)',
        zoneEnemyStroke: 'rgba(168, 85, 247, 0.8)',

        zoneContestedFill: 'rgba(255, 145, 0, 0.30)',
        zoneContestedStroke: 'rgba(255, 145, 0, 0.8)',

        zoneUnclaimedFill: 'rgba(255, 255, 255, 0.06)',
        zoneUnclaimedStroke: 'rgba(255, 255, 255, 0.20)',

        zoneClubFill: 'rgba(0, 230, 118, 0.20)',
        zoneClubStroke: 'rgba(0, 230, 118, 0.7)',

        // Polyline
        runPath: '#00E5FF',
        runPathGlow: 'rgba(0, 229, 255, 0.35)',

        // UI chrome
        line: 'rgba(255, 255, 255, 0.06)',
        lineStrong: 'rgba(255, 255, 255, 0.12)',
        tabBar: '#080818',
        tabBarBorder: 'rgba(0, 229, 255, 0.08)',
    },
    radius: {
        sm: 10,
        md: 16,
        lg: 24,
        xl: 32,
        pill: 999,
    },
    shadow: {
        card: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 8,
        },
        glow: {
            shadowColor: '#00E5FF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 6,
        },
        accentButton: {
            shadowColor: '#00E5FF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
        },
        dangerButton: {
            shadowColor: '#FF1744',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
        },
    },
    font: {
        heading: 'SpaceMono',
    },
};
