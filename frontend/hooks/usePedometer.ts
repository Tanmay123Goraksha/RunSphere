import { useState, useEffect } from 'react';
import { Pedometer } from 'expo-sensors';

export const usePedometer = (isTracking: boolean) => {
    const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
    const [currentStepCount, setCurrentStepCount] = useState(0);

    useEffect(() => {
        let subscription: Pedometer.Subscription | null = null;

        const subscribe = async () => {
            const isAvailable = await Pedometer.isAvailableAsync();
            setIsPedometerAvailable(String(isAvailable));

            if (isAvailable) {
                subscription = Pedometer.watchStepCount((result) => {
                    setCurrentStepCount(result.steps);
                });
            }
        };

        if (isTracking) {
            subscribe();
        } else {
            if (subscription) {
                (subscription as Pedometer.Subscription).remove();
                subscription = null;
            }
            setCurrentStepCount(0); // Reset or keep? Usually reset for new run.
        }

        return () => {
            if (subscription) {
                (subscription as Pedometer.Subscription).remove();
            }
        };
    }, [isTracking]);

    return { isPedometerAvailable, currentStepCount, setCurrentStepCount };
};
