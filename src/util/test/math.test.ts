import { describe, it, expect } from "vitest";

import { getMovingAverage } from "../math";

describe("getMovingAverage", () => {
    it("handles window size of 0", () => {
        const values = [1, 2, 3, 4, 5];
        // Will round up to window size of 1
        const result = getMovingAverage(values, 0, true);
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it("handles empty array", () => {
        const values: number[] = [];
        const result = getMovingAverage(values, 3, true);
        expect(result).to.deep.equal([]);
    });

    it("handles window size of 1", () => {
        const values = [1, 2, 3, 4, 5];
        const result = getMovingAverage(values, 1, true);
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it("includes ends when window size is 1", () => {
        const values = [1, 2, 3, 4, 5];
        const result = getMovingAverage(values, 1, false);
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it("returns a rolling average for window size of 3", () => {
        const values = [10, 20, 30, 40, 50];
        const result = getMovingAverage(values, 3, false);
        expect(result).to.deep.equal([20, 30, 40]);

        const resultWithEnds = getMovingAverage(values, 3, true);
        expect(resultWithEnds).to.deep.equal([15, 20, 30, 40, 45]);
    });

    it("returns a rolling average for window size of 5", () => {
        const values = [10, 20, 30, 40, 50];
        const result = getMovingAverage(values, 5, false);
        expect(result).to.deep.equal([30]);

        const resultWithEnds = getMovingAverage(values, 5, true);
        expect(resultWithEnds).to.deep.equal([20, 25, 30, 35, 40]);
    });

    function approximatelyEqual(arr1: number[], arr2: number[], epsilon: number): boolean {
        if (arr1.length !== arr2.length) {
            return false;
        }
        return arr1.every((value, index) => Math.abs(value - arr2[index]) < epsilon);
    }

    it("handles float values", () => {
        const values = [1.1, 2.2, 3.3, 4.4, 5.5];
        const result = getMovingAverage(values, 3, false);
        expect(approximatelyEqual(result, [2.2, 3.3, 4.4], 0.0001)).to.be.true;

        const resultWithEnds = getMovingAverage(values, 3, true);
        expect(approximatelyEqual(resultWithEnds, [1.65, 2.2, 3.3, 4.4, 4.95], 0.0001)).to.be.true;
    });

    it("skips NaN values", () => {
        const values = [10, 20, NaN, 40, 50];
        const result = getMovingAverage(values, 3, false);
        expect(result).to.deep.equal([15, 30, 45]);
    });

    it("skips infinite values", () => {
        const values = [10, 20, Infinity, 40, 50];
        const result = getMovingAverage(values, 3, false);
        expect(result).to.deep.equal([15, 30, 45]);
    });

    it("returns NaN when only non-finite values are within window", () => {
        const values = [10, 20, NaN, NaN, NaN, Infinity];
        const result = getMovingAverage(values, 3, true);
        expect(result).to.deep.equal([15, 15, 20, NaN, NaN, NaN]);
    });
});
