import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// ─── Sonar Ping: expanding ring fade ─────────────────────────────────────
export const useSonarPing = (active) => {
    const scale = useRef(new Animated.Value(0.4)).current;
    const opacity = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (!active) {
            scale.setValue(0.4);
            opacity.setValue(0.8);
            return;
        }

        const loop = Animated.loop(
            Animated.parallel([
                Animated.timing(scale, {
                    toValue: 2.5,
                    duration: 2000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [active]);

    return { scale, opacity };
};

// ─── Zone shimmer: slow ownership pulse ───────────────────────────────────
export const useShimmer = (active) => {
    const opacity = useRef(new Animated.Value(0.40)).current;

    useEffect(() => {
        if (!active) {
            opacity.setValue(0.40);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.55,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.40,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [active]);

    return { opacity };
};

// ─── Contested pulse: rapid alerting pulse ────────────────────────────────
export const useContestedPulse = (active) => {
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (!active) {
            opacity.setValue(0.5);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.8,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.5,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [active]);

    return { opacity };
};

// ─── XP Float: upward float + fade text animation ────────────────────────
export const useXPFloat = () => {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const trigger = (callback?: () => void) => {
        translateY.setValue(0);
        opacity.setValue(1);

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -80,
                duration: 1200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 1200,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(callback);
    };

    return { translateY, opacity, trigger };
};

// ─── Badge Unlock: scale bounce 0 → 1.2 → 1 ─────────────────────────────
export const useBadgeUnlock = () => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const trigger = (callback?: () => void) => {
        scale.setValue(0);
        opacity.setValue(0);

        Animated.sequence([
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1.2,
                    friction: 3,
                    tension: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]),
            Animated.spring(scale, {
                toValue: 1,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start(callback);
    };

    return { scale, opacity, trigger };
};

// ─── Counter tick: animates a number going up ─────────────────────────────
export const useCountUp = (target, duration = 600) => {
    const value = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(value, {
            toValue: target,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();
    }, [target]);

    return value;
};

// ─── Glow pulse: for buttons and highlights ───────────────────────────────
export const useGlowPulse = (active) => {
    const glow = useRef(new Animated.Value(0.2)).current;

    useEffect(() => {
        if (!active) {
            glow.setValue(0.2);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, {
                    toValue: 0.6,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glow, {
                    toValue: 0.2,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [active]);

    return { glow };
};
