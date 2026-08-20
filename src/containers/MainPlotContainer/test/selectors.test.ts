import { describe, it, expect } from "vitest";

import { mockState, selectedCellFileInfo } from "../../../state/test/mocks";
import type { State, AnnotationData } from "../../../state/types";
import {
    calculateLinePlotData,
    getAnnotations,
    getFormattedHoveredXValue,
    getFormattedHoveredYValue,
    getXDisplayName,
    getYDisplayName,
    handleNullValues,
    makeAnnotations,
} from "../selectors";
import type { PlotlyAnnotation } from "../../../components/MainPlot";
import { CELL_ID_KEY, PALETTE } from "../../../constants";

describe("MainPlotContainer selectors", () => {
    const newMockState = mockState;

    describe("handleNullValues helper function", () => {
        it("syncs null values between two arrays", () => {
            const array1 = [null, 3, 5, null];
            const array2 = [2, 4, null, null];
            const result = handleNullValues(array1, array2);

            expect(result.xValues).to.deep.equal([null, 3, null, null]);
            expect(result.yValues).to.deep.equal([null, 4, null, null]);
        });
        it("replaces arrays full of nulls with empty arrays", () => {
            const array1 = [null, 3, 5, null];
            const array2 = [2, null, null, null];
            const result = handleNullValues(array1, array2);

            expect(result.xValues).to.deep.equal([]);
            expect(result.yValues).to.deep.equal([]);
        });
    });
    describe("getAnnotations selector", () => {
        it("it returns an Annotation object for every index in selectedPoints array", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "apical-proximity",
                    plotByOnY: "apical-proximity",
                    selectedPoints: selectedCellFileInfo,
                },
            };
            const result: PlotlyAnnotation[] = getAnnotations(state);
            expect(result).to.have.lengthOf(2);
        });
    });
    describe("getAnnotations selector", () => {
        it("it filters out non visible points", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "apical-proximity",
                    plotByOnY: "missing-data",
                    selectedPoints: selectedCellFileInfo,
                },
            };
            const result: PlotlyAnnotation[] = getAnnotations(state);
            expect(result).to.have.lengthOf(0);
        });
    });
    describe("getAnnotations selector", () => {
        it("it still shows points whose values are zero", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "apical-proximity",
                    plotByOnY: "anaphase-segmentation-complete",
                    selectedPoints: selectedCellFileInfo,
                },
            };
            const result: PlotlyAnnotation[] = getAnnotations(state);
            expect(result).to.have.lengthOf(2);
        });
    });
    describe("getXDisplayName", () => {
        it("returns the displayName for a continuous feature", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, plotByOnX: "apical-proximity" },
            };
            expect(getXDisplayName(state)).to.equal("Apical Proximity");
        });

        it("returns the displayName for a discrete feature", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, plotByOnX: "cell-line" },
            };
            expect(getXDisplayName(state)).to.equal("Labeled Structure");
        });

        it("falls back to the raw key when the feature is not found", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, plotByOnX: "unknown-feature" },
            };
            expect(getXDisplayName(state)).to.equal("unknown-feature");
        });
    });

    describe("getYDisplayName", () => {
        it("returns the displayName for a continuous feature", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, plotByOnY: "cellular-surface-area" },
            };
            expect(getYDisplayName(state)).to.equal("Cell Surface area");
        });

        it("returns the displayName for a discrete feature", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnY: "anaphase-segmentation-complete",
                },
            };
            expect(getYDisplayName(state)).to.equal("Anaphase segmentation complete");
        });

        it("falls back to the raw key when the feature is not found", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, plotByOnY: "unknown-feature" },
            };
            expect(getYDisplayName(state)).to.equal("unknown-feature");
        });
    });

    describe("getFormattedHoveredXValue", () => {
        it("returns empty string when no point is hovered", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, hoveredPointData: null },
            };
            expect(getFormattedHoveredXValue(state)).to.equal("");
        });

        it("formats a continuous numeric value to 4 significant figures", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "apical-proximity",
                    hoveredPointData: {
                        [CELL_ID_KEY]: "1",
                        index: 0,
                        thumbnailPath: "path1",
                        srcPath: "",
                        xValue: -0.25868651080317,
                        yValue: 1,
                    },
                },
            };
            expect(getFormattedHoveredXValue(state)).to.equal(
                Number(-0.25868651080317).toPrecision(4)
            );
        });

        it("resolves a categorical value to its display label", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "cell-line",
                    hoveredPointData: {
                        [CELL_ID_KEY]: "1",
                        index: 0,
                        thumbnailPath: "path1",
                        srcPath: "",
                        xValue: 5,
                        yValue: 0,
                    },
                },
            };
            expect(getFormattedHoveredXValue(state)).to.equal("Matrix adhesions");
        });

        it("returns empty string for a non-finite value", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "apical-proximity",
                    hoveredPointData: {
                        [CELL_ID_KEY]: "1",
                        index: 0,
                        thumbnailPath: "path1",
                        srcPath: "",
                        xValue: NaN,
                        yValue: 0,
                    },
                },
            };
            expect(getFormattedHoveredXValue(state)).to.equal("");
        });
    });

    describe("getFormattedHoveredYValue", () => {
        it("returns empty string when no point is hovered", () => {
            const state: State = {
                ...newMockState,
                selection: { ...newMockState.selection, hoveredPointData: null },
            };
            expect(getFormattedHoveredYValue(state)).to.equal("");
        });

        it("formats a continuous numeric value to 4 significant figures", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnY: "cellular-surface-area",
                    hoveredPointData: {
                        [CELL_ID_KEY]: "1",
                        index: 0,
                        thumbnailPath: "path1",
                        srcPath: "",
                        xValue: 0,
                        yValue: 702.3191,
                    },
                },
            };
            expect(getFormattedHoveredYValue(state)).to.equal(Number(702.3191).toPrecision(4));
        });

        it("resolves a categorical value to its display label", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnY: "anaphase-segmentation-complete",
                    hoveredPointData: {
                        [CELL_ID_KEY]: "1",
                        index: 0,
                        thumbnailPath: "path1",
                        srcPath: "",
                        xValue: 0,
                        yValue: 1,
                    },
                },
            };
            expect(getFormattedHoveredYValue(state)).to.equal("Complete");
        });

        it("returns empty string for a non-finite value", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnY: "cellular-surface-area",
                    hoveredPointData: {
                        [CELL_ID_KEY]: "1",
                        index: 0,
                        thumbnailPath: "path1",
                        srcPath: "",
                        xValue: 0,
                        yValue: Infinity,
                    },
                },
            };
            expect(getFormattedHoveredYValue(state)).to.equal("");
        });
    });

    describe("makeAnnotations", () => {
        const baseAnnotation: AnnotationData = {
            cellID: "cell-42",
            fovID: "fov-1",
            hovered: false,
            pointIndex: 3,
            thumbnailPath: "/some/path",
            x: 1.5,
            y: 2.5,
        };

        it("returns non-hovered annotation with translucent white arrow/border, empty text, and ay of 0", () => {
            const result = makeAnnotations([{ ...baseAnnotation, hovered: false }]);
            expect(result).to.have.lengthOf(1);
            const annotation = result[0];
            expect(annotation.arrowcolor).to.equal(PALETTE.translucentWhite);
            expect(annotation.bordercolor).to.equal(PALETTE.translucentWhite);
            expect(annotation.text).to.equal("");
            expect(annotation.ay).to.equal(0);
        });

        it("returns hovered annotation with bright green arrow/border, cell ID text, and ay of -20", () => {
            const result = makeAnnotations([{ ...baseAnnotation, hovered: true }]);
            expect(result).to.have.lengthOf(1);
            const annotation = result[0];
            expect(annotation.arrowcolor).to.equal(PALETTE.brightGreen);
            expect(annotation.bordercolor).to.equal(PALETTE.brightGreen);
            expect(annotation.text).to.equal(`ID: ${baseAnnotation.cellID}`);
            expect(annotation.ay).to.equal(-20);
        });

        it("preserves x, y, cellID, fovID, and pointIndex on the annotation", () => {
            const result = makeAnnotations([baseAnnotation]);
            const annotation = result[0];
            expect(annotation.x).to.equal(baseAnnotation.x);
            expect(annotation.y).to.equal(baseAnnotation.y);
            expect(annotation.cellID).to.equal(baseAnnotation.cellID);
            expect(annotation.fovID).to.equal(baseAnnotation.fovID);
            expect(annotation.pointIndex).to.equal(baseAnnotation.pointIndex);
        });
    });

    describe("calculateLinePlotData", () => {
        it("handles empty data", () => {
            const result = calculateLinePlotData([], [], [], [], true, 1);
            expect(result).to.deep.equal([]);
        });

        it("returns null when connecting lines are disabled", () => {
            const result = calculateLinePlotData([1, 2], [3, 4], [1, 1], [5, 6], false, 1);
            expect(result).to.equal(null);
        });

        it("splits data by groups", () => {
            const xValues = [1, 2, 3, 4, 5];
            const yValues = [6, 7, 8, 9, 10];
            const connectByCategoryValues = [1, 1, 2, 2, 3];
            const connectByFeatureValues = [1, 2, 3, 4, 5];
            const result = calculateLinePlotData(
                xValues,
                yValues,
                connectByCategoryValues,
                connectByFeatureValues,
                true,
                1
            );
            expect(result).to.deep.equal([
                { x: [1, 2], y: [6, 7] },
                { x: [3, 4], y: [8, 9] },
                { x: [5], y: [10] },
            ]);
        });

        it("sorts by connecting feature value", () => {
            const xValues = [1, 2, 3, 4, 5];
            const yValues = [1, 2, 3, 4, 5];
            const connectByCategoryValues = [1, 1, 1, 1, 1];
            const connectByFeatureValues = [5, 4, 3, 2, 1];
            const result = calculateLinePlotData(
                xValues,
                yValues,
                connectByCategoryValues,
                connectByFeatureValues,
                true,
                1
            );
            expect(result).to.deep.equal([{ x: [5, 4, 3, 2, 1], y: [5, 4, 3, 2, 1] }]);
        });

        it("applies moving average to x and y values", () => {
            const xValues = [10, 20, 30, 40, 50];
            const yValues = [10, 20, 30, 40, 50];
            const connectByCategoryValues = [1, 1, 1, 1, 1];
            const connectByFeatureValues = [1, 2, 3, 4, 5];
            const result = calculateLinePlotData(
                xValues,
                yValues,
                connectByCategoryValues,
                connectByFeatureValues,
                true,
                3
            );
            expect(result).to.deep.equal([{ x: [15, 20, 30, 40, 45], y: [15, 20, 30, 40, 45] }]);
        });
    });
});
