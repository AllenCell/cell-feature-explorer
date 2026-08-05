import { useCallback, useEffect, useRef, useState } from "react";

type TimeoutId = ReturnType<typeof setTimeout> | null;

/**
 * Debounces changes to a state value by wrapping its value and setter function,
 * to reduce overhead for expensive setter function calls (e.g., Redux actions).
 * @param value The state value to debounce.
 * @param setter The setter function for the state value; will be called once no
 * changes have occurred for the specified debounce delay.
 * @param delayMs The debounce delay in milliseconds. Defaults to 200ms.
 * @returns A tuple containing the current value and a setter function.
 */
const useDebouncedSetter = <T>(
    value: T,
    setter: (value: T) => void,
    delayMs: number = 200
): [T, (value: T) => void] => {
    const timeoutRef = useRef<TimeoutId>(null);
    const [pendingValue, setPendingValue] = useState<T | undefined>(undefined);

    const setValueDebounce = useCallback(
        (value: T) => {
            setPendingValue(value);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setter(value);
                setPendingValue(undefined);
            }, delayMs);
        },
        [delayMs, setter]
    );

    // On unmount, clear the timeout
    useEffect(() => {
        return () => {
            clearTimeout(timeoutRef.current ?? undefined);
        };
    }, []);

    return [pendingValue ?? value, setValueDebounce];
};

export default useDebouncedSetter;
