import { useState, useEffect } from 'react';
import { Pedometer } from 'expo-sensors';

export const usePedometer = (isTracking, elapsedSeconds = 0) => {
    const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
    const [currentStepCount, setCurrentStepCount] = useState(0);

    useEffect(() => {
        let subscription = null;

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
                subscription.remove();
                subscription = null;
            }
            setCurrentStepCount(0); // Reset or keep? Usually reset for new run.
        }

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [isTracking]);

    const cadenceSpm = elapsedSeconds > 0 ? (currentStepCount / elapsedSeconds) * 60 : 0;

    return { isPedometerAvailable, currentStepCount, cadenceSpm, setCurrentStepCount };
};
