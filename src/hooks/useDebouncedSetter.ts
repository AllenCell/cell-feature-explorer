import { useCallback, useEffect, useRef, useState } from "react";

type TimeoutId = ReturnType<typeof setTimeout> | null;

/**
 * Debounces changes to a state value by wrapping its value and setter function,
 * to reduce overhead for expensive setter function calls (e.g., Redux actions).
 * @param value The state value to debounce.
 * @param setValue The setter function for the state value; will be called once no
 * changes have occurred for the specified debounce delay.
 * @param delayMs The debounce delay in milliseconds. Defaults to 250ms.
 * @returns A tuple containing the current value and a setter function.
 */
const useDebouncedSetter = <T>(
    value: T,
    setValue: (value: T) => void,
    delayMs = 250
): [T, (value: T) => void] => {
    const timeoutRef = useRef<TimeoutId>(null);
    const [currentValue, setCurrentValue] = useState<T>(value);

    const setValueDebounce = useCallback(
        (value: T) => {
            setCurrentValue(value);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setValue(value);
            }, delayMs);
        },
        [delayMs, setValue]
    );

    // Sync changes to upstream value
    useEffect(() => {
        // Clear timers if set
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setCurrentValue(value);
    }, [value]);

    // On unmount, clear the timeout
    useEffect(() => {
        return () => {
            clearTimeout(timeoutRef.current ?? undefined);
        };
    }, []);

    return [currentValue, setValueDebounce];
};

export default useDebouncedSetter;
