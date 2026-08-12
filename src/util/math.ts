/**
 * Returns the moving average for a list of values, using a specified window
 * size.
 * @param values A list of numeric values. Non-finite or null values will be
 * ignored in the average calculation.
 * @param windowSize The window size for the moving average. Rounds up to the
 * nearest positive, odd integer.
 * @param includeEnds Whether to calculate the average for values at the end of
 * the list that do not have enough neighbors to fill the window size. If false,
 * the returned list will have `Math.floor(windowSize / 2)` fewer values at the
 * beginning and end.
 */
export function getMovingAverage(
    values: (number | null)[] | Uint32Array | Float32Array,
    windowSize: number,
    includeEnds = false
): number[] {
    // Number of values forward and backwards to include in the average.
    // For a window size of 7, the window offset will be 3.
    const windowOffset = Math.max(0, Math.floor(windowSize / 2));
    const ret: number[] = [];

    const clampBounds = (value: number): number => Math.max(0, Math.min(value, values.length - 1));

    const start = includeEnds ? 0 : windowOffset;
    const end = includeEnds ? values.length : values.length - windowOffset;
    for (let i = start; i < end; i++) {
        let sum = 0;
        let count = 0;
        for (let j = clampBounds(i - windowOffset); j <= clampBounds(i + windowOffset); j++) {
            const value = values[j];
            if (value === null || !Number.isFinite(value)) {
                continue;
            }
            sum += value;
            count++;
        }
        if (count === 0) {
            ret.push(NaN);
        } else {
            ret.push(sum / count);
        }
    }
    return ret;
}
