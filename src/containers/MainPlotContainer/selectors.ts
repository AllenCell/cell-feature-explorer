import { includes, map, find, findIndex, isEmpty } from "lodash";
import { PlotData } from "plotly.js";
import { createSelector } from "reselect";

import {
    ARRAY_OF_CELL_IDS_KEY,
    CELL_ID_KEY,
    FOV_ID_KEY,
    GENERAL_PLOT_SETTINGS,
    GROUP_BY_KEY,
    PALETTE,
    SCATTER_PLOT_NAME,
    SELECTIONS_PLOT_NAME,
    THUMBNAIL_PATH,
} from "../../constants";
import { getCategoricalFeatureKeys, getMeasuredFeaturesDefs } from "../../state/metadata/selectors";
import {
    DataForPlot,
    FileInfo,
    MeasuredFeatureDef,
    MeasuredFeaturesOptions,
} from "../../state/metadata/types";
import {
    getApplyColorToSelections,
    getClickedCellsFileInfo,
    getColorBySelection,
    getFilteredColorByValues,
    getCategoryGroupColorsAndNames,
    getFilteredCellData,
    getHoveredCardId,
    getFilteredIds,
    getPlotByOnX,
    getPlotByOnY,
    getSelectedGroupsData,
    getFilteredXValues,
    getFilteredYValues,
    getGroupByCategory,
    getGroupingCategoryNamesAsArray,
    getHoveredPointData,
    getXValues,
    getYValues,
    getMainPlotSettings,
    getFilteredConnectByFeatureValues,
    getShowConnectLines,
    getFilteredConnectByCategoryValues,
    getLineMovingAverageWindow,
    getConnectByFeature,
    getConnectByCategory,
} from "../../state/selection/selectors";
import {
    ColorForPlot,
    MainPlotSettings,
    SelectedPointData,
    TickConversion,
} from "../../state/selection/types";
import {
    AnnotationData,
    ContinuousPlotData,
    PlotlyCustomData,
    GroupedPlotData,
    DataType,
    LinePlotData,
} from "../../state/types";
import { findFeature } from "../../state/util";
import { getGroupByTitle } from "../ColorByMenu/selectors";
import { PlotlyAnnotation } from "../../components/MainPlot";
import { getMovingAverage } from "../../util/math";

export const handleNullValues = (
    inputXValues: (number | null)[],
    inputYValues: (number | null)[]
): { xValues: (number | null)[]; yValues: (number | null)[] } => {
    let canPlot = false;
    let xValues = inputXValues.slice();
    let yValues = inputYValues.slice();

    if (xValues.length !== yValues.length) {
        console.error(
            "Cannot handleNullValues between two arrays because they have unequal length"
        );
        return {
            xValues: xValues,
            yValues: yValues,
        };
    }

    // At every index where one array has a null value, the other array must
    // also have a null value
    for (let i = 0; i < xValues.length; i++) {
        if (xValues[i] === null) {
            yValues[i] = null;
        } else if (yValues[i] === null) {
            xValues[i] = null;
        } else {
            canPlot = true;
        }
    }

    // If both xValues and yValues only contain nulls, then set them to
    // empty arrays to avoid plotting errors
    if (!canPlot) {
        xValues = [];
        yValues = [];
    }

    return {
        xValues: xValues,
        yValues: yValues,
    };
};

export const getPlotlyCustomData = createSelector(
    [getFilteredCellData, getShowConnectLines, getConnectByFeature],
    (
        filteredCellData: DataForPlot,
        showConnectByLines: boolean,
        connectByFeature: string
    ): PlotlyCustomData[] => {
        const thumbnailPaths = filteredCellData.labels.thumbnailPaths;
        const srcPaths = filteredCellData.labels.sourcePaths;
        const indices = filteredCellData.indices;
        const connectByFeatureValues = showConnectByLines
            ? filteredCellData.values[connectByFeature]
            : undefined;
        return map(indices, (cellIndex, i) => {
            return {
                index: cellIndex,
                thumbnailPath: thumbnailPaths[i],
                srcPath: srcPaths?.[i],
                connectByFeature: connectByFeatureValues?.[i],
            };
        });
    }
);

export const getMainPlotData = createSelector(
    [
        getFilteredXValues,
        getFilteredYValues,
        getFilteredIds,
        getPlotlyCustomData,
        getFilteredColorByValues,
        getColorBySelection,
        getGroupByCategory,
        getCategoryGroupColorsAndNames,
        getCategoricalFeatureKeys,
    ],
    (
        xValues,
        yValues,
        ids,
        customData,
        colorByValues,
        categoryToColorBy,
        categoryToGroupBy,
        colorsForPlot,
        categoricalFeatures
    ): GroupedPlotData | ContinuousPlotData => {
        // Only preserve values at indices where both x and y values are not null,
        // because a coordinate like (3, null) won't be plotted anyway and produces
        // inaccurate histograms.
        const newXAndYValues = handleNullValues(xValues, yValues);
        const isGrouped: boolean = includes(categoricalFeatures, categoryToColorBy);
        if (isGrouped) {
            return {
                color: categoryToColorBy === categoryToGroupBy ? undefined : colorByValues,
                dataType: DataType.GROUPED,
                groupSettings: colorsForPlot,
                groups: colorByValues as string[],
                ids,
                x: newXAndYValues.xValues,
                y: newXAndYValues.yValues,
                customdata: customData,
            };
        } else {
            return {
                color: categoryToColorBy === categoryToGroupBy ? undefined : colorByValues,
                dataType: DataType.CONTINUOUS,
                ids,
                x: newXAndYValues.xValues,
                y: newXAndYValues.yValues,
                customdata: customData,
            };
        }
    }
);

/**
 * Returns the data for the line plot trace. Points in the same category are
 * connected in the same line, sorted in order of the specified feature value.
 */
export const getLinePlotData = createSelector(
    [
        getFilteredXValues,
        getFilteredYValues,
        getFilteredConnectByCategoryValues,
        getFilteredConnectByFeatureValues,
        getShowConnectLines,
        getLineMovingAverageWindow,
        // Line appearance
        getCategoryGroupColorsAndNames,
        getColorBySelection,
        getConnectByCategory,
    ],
    calculateLinePlotData
);

export function calculateLinePlotData(
    xValues: (number | null)[],
    yValues: (number | null)[],
    connectByCategoryValues: (number | null)[],
    connectByFeatureValues: (number | null)[],
    showConnectingLines: boolean,
    movingAverageWindow: number,
    colorsForPlot: ColorForPlot[],
    colorByFeature: string,
    connectByCategory: string
): LinePlotData[] | null {
    if (!showConnectingLines) {
        return null;
    }
    ({ xValues, yValues } = handleNullValues(xValues, yValues));
    const indicesByGroup: Map<number, number[]> = new Map();

    // Group data point indices by their category
    for (let i = 0; i < connectByCategoryValues.length; i++) {
        const category = connectByCategoryValues[i];
        if (category === null) {
            continue;
        }
        if (!indicesByGroup.has(category)) {
            indicesByGroup.set(category, []);
        }
        const indices = indicesByGroup.get(category);
        if (indices) {
            indices.push(i);
        }
    }

    const lineData: LinePlotData[] = [];
    for (const [group, indices] of indicesByGroup.entries()) {
        const x: (number | null)[] = [];
        const y: (number | null)[] = [];
        // Sort each category's data by the feature values.
        indices.sort((aIndex, bIndex) => {
            const a = connectByFeatureValues[aIndex] ?? Infinity;
            const b = connectByFeatureValues[bIndex] ?? Infinity;
            return a - b;
        });
        for (const i of indices) {
            x.push(xValues[i]);
            y.push(yValues[i]);
        }
        lineData.push({ x: x, y: y, groupIndex: group });
    }

    // Apply moving average to each line
    if (movingAverageWindow > 1) {
        for (const line of lineData) {
            line.y = getMovingAverage(line.y, movingAverageWindow, true);
            line.x = getMovingAverage(line.x, movingAverageWindow, true);
        }
    }

    if (colorByFeature === connectByCategory) {
        // Apply group colors to the lines
        const groupToColors: { [key: number]: string } = {};
        for (const colorSetting of colorsForPlot) {
            groupToColors[colorSetting.key] = colorSetting.color;
        }
        for (const line of lineData) {
            line.color = groupToColors[line.groupIndex];
        }
    }

    return lineData;
}

const getAnnotationData = createSelector(
    [getFilteredCellData, getClickedCellsFileInfo, getPlotByOnX, getPlotByOnY, getHoveredCardId],
    (
        filteredCellData: DataForPlot,
        clickedCellsFileInfo: FileInfo[],
        xAxis,
        yAxis,
        currentHoveredCellId
    ): AnnotationData[] => {
        if (isEmpty(filteredCellData.values) || isEmpty(filteredCellData.labels)) {
            return [];
        }
        const initAcc: AnnotationData[] = [];
        return clickedCellsFileInfo.reduce((acc, data) => {
            const cellID = data[CELL_ID_KEY];
            const fovID = data[FOV_ID_KEY] || "";
            const thumbnailPath = data[THUMBNAIL_PATH] || "";

            const cellIds = filteredCellData.labels[ARRAY_OF_CELL_IDS_KEY];
            // FileInfo is typed with `index` as optional because it gets added to the
            // data from the database. However, at this point, index will always be defined, but since
            // typescript doesn't know that, we still have this backup to find it in the
            // id array but that code should never be executed.
            const pointIndex =
                data.index !== undefined ? data.index : findIndex(cellIds, (id) => id === cellID);
            const x = filteredCellData.values[xAxis][pointIndex];
            const y = filteredCellData.values[yAxis][pointIndex];
            if (pointIndex >= 0 && x !== null && y !== null) {
                acc.push({
                    cellID,
                    fovID,
                    hovered: cellID === currentHoveredCellId,
                    pointIndex,
                    x,
                    y,
                    thumbnailPath,
                });
            }
            return acc;
        }, initAcc);
    }
);

export const composePlotlyData = createSelector(
    [getMainPlotData, getApplyColorToSelections, getSelectedGroupsData, getLinePlotData],
    (
        mainPlotDataValues: ContinuousPlotData | GroupedPlotData,
        applyColorToSelections,
        selectedGroups,
        linePlotData
    ): {
        mainPlotData: ContinuousPlotData | GroupedPlotData;
        selectedGroupPlotData: ContinuousPlotData | null;
        linePlotData: LinePlotData[] | null;
    } => {
        const mainPlotData = {
            ...mainPlotDataValues,
            plotName: SCATTER_PLOT_NAME,
        };
        if (
            mainPlotDataValues.dataType === DataType.GROUPED &&
            mainPlotData.dataType === DataType.GROUPED
        ) {
            // NOTE: because of line 213, if one of these are true,
            // both are true, but typescript wanted both to be checked
            mainPlotData.groupSettings = {
                ...mainPlotDataValues.groupSettings,
            };
        }
        const selectedGroupPlotData = applyColorToSelections
            ? {
                  ...selectedGroups,
                  dataType: "continuous" as DataType.CONTINUOUS,
                  plotName: SELECTIONS_PLOT_NAME,
              }
            : null;
        return {
            mainPlotData,
            selectedGroupPlotData,
            linePlotData,
        };
    }
);

function colorSettings(
    plotSettings: Partial<PlotData>,
    plotData: GroupedPlotData | ContinuousPlotData,
    mainPlotSettings: MainPlotSettings
): Partial<PlotData> {
    if (plotData.dataType === DataType.GROUPED) {
        return {
            ...plotSettings,
            transforms: [
                {
                    groups: plotData.groups,
                    nameformat: `%{group}`,
                    styles: map(plotData.groupSettings, (ele) => {
                        return {
                            target: ele.name,
                            value: {
                                marker: {
                                    color: ele.color,
                                    opacity: mainPlotSettings.unselectedCircleOpacity,
                                },
                            },
                        };
                    }),
                    // literal typing to avoid a widened type inferred
                    type: "groupby" as const,
                },
            ],
        };
    }

    return {
        ...plotSettings,
        marker: {
            ...plotSettings.marker,
            color: plotData.color,
            opacity: plotData.opacity ?? mainPlotSettings.unselectedCircleOpacity,
        },
    };
}

function makeScatterPlotData(
    plotData: ContinuousPlotData | GroupedPlotData,
    mainPlotSettings: MainPlotSettings
): Partial<PlotData> {
    const plotSettings = {
        hoverinfo: "none" as const,
        ids: plotData.ids,
        customdata: plotData.customdata as any,
        marker: {
            size: mainPlotSettings.circleRadius,
            symbol: "circle",
        },
        // literal typing to avoid a widened type inferred
        mode: "markers" as const,
        name: plotData.plotName,
        showlegend: false,
        // literal typing to avoid a widened type inferred
        type: "scattergl" as const,
        x: plotData.x,
        y: plotData.y,
        z: [],
    };
    return colorSettings(plotSettings, plotData, mainPlotSettings);
}

// TODO: Add the ability to adjust the line settings via an additional selector
function makeLinePlotTrace(data: LinePlotData, settings: MainPlotSettings): Partial<PlotData> {
    let color = settings.connectionLineDefaultColor;
    if (data.color) {
        // Color is a hex string; apply transparency
        const opacityHex = Math.round(settings.unselectedCircleOpacity * 255);
        color = data.color + opacityHex.toString(16).padStart(2, "0");
    }
    return {
        type: "scattergl",
        mode: "lines",
        hoverinfo: "skip",
        x: data.x,
        y: data.y,
        showlegend: false,
        line: {
            width: settings.connectionLineWidth,
            color: color,
        },
    };
}

function makeHistogramPlotX(data: (number | null)[]) {
    return {
        marker: {
            color: GENERAL_PLOT_SETTINGS.histogramColor,
            line: {
                color: GENERAL_PLOT_SETTINGS.textColor,
                width: 1,
            },
        },
        name: `x histogram`,
        nbinsx: 60,
        showlegend: false,
        // literal typing to avoid a widened type inferred
        type: "histogram" as const,
        x: data,
        yaxis: "y2",
    };
}

function makeHistogramPlotY(data: (number | null)[]) {
    return {
        marker: {
            color: GENERAL_PLOT_SETTINGS.histogramColor,
            line: {
                color: GENERAL_PLOT_SETTINGS.textColor,
                width: 1,
            },
        },
        name: `y histogram`,
        nbinsy: 60,
        showlegend: false,
        // literal typing to avoid a widened type inferred
        type: "histogram" as const,
        xaxis: "x2",
        y: data,
    };
}

export function makeAnnotations(annotations: AnnotationData[]): PlotlyAnnotation[] {
    return annotations.map((point) => {
        return {
            align: "left",
            arrowcolor: point.hovered ? PALETTE.brightGreen : PALETTE.translucentWhite,
            arrowhead: 6,
            ax: 0,
            ay: point.hovered ? -20 : 0,
            bgcolor: PALETTE.lightGray,
            bordercolor: point.hovered ? PALETTE.brightGreen : PALETTE.translucentWhite,
            borderpad: 0,
            borderwidth: 1,
            captureevents: true,
            cellID: point.cellID,
            font: {
                color: PALETTE.white,
                size: 11,
            },
            fovID: point.fovID,
            pointIndex: point.pointIndex,
            text: point.hovered ? `ID: ${point.cellID}` : "",
            x: point.x,
            y: point.y,
        };
    });
}

export const getAnnotations = createSelector(
    [getAnnotationData],
    (annotationData): PlotlyAnnotation[] => {
        return makeAnnotations(annotationData);
    }
);

export const getScatterPlotDataArray = createSelector(
    [composePlotlyData, getMainPlotSettings],
    (allPlotData, mainPlotSettings): Partial<PlotData>[] => {
        const { mainPlotData, selectedGroupPlotData } = allPlotData;
        let traces = [
            makeHistogramPlotX(mainPlotData.x),
            makeHistogramPlotY(mainPlotData.y),
            makeScatterPlotData(mainPlotData, mainPlotSettings),
        ];
        if (selectedGroupPlotData) {
            traces.push(makeScatterPlotData(selectedGroupPlotData, mainPlotSettings));
        }
        if (allPlotData.linePlotData) {
            const lineTraces = allPlotData.linePlotData.map((line) =>
                makeLinePlotTrace(line, mainPlotSettings)
            );
            traces = [...lineTraces, ...traces];
        }

        return traces;
    }
);

export const getXDisplayOptions = createSelector(
    [getMeasuredFeaturesDefs],
    (featureNames): MeasuredFeatureDef[] => {
        return featureNames;
    }
);

export const getYDisplayOptions = createSelector(
    [getMeasuredFeaturesDefs],
    (featureNames): MeasuredFeatureDef[] => {
        return featureNames;
    }
);

export const getColorByDisplayOptions = createSelector(
    [getMeasuredFeaturesDefs, getGroupByTitle],
    (featureDefs): MeasuredFeatureDef[] => {
        // TODO: use "exclude" in database to filter measured features
        return featureDefs;
    }
);

export const getGroupByDisplayOptions = createSelector(
    [getMeasuredFeaturesDefs, getGroupByTitle],
    (featureDefs): MeasuredFeatureDef[] => {
        // Only discrete features can be used for groupBy
        // TODO: group by chunked ranges of continuous features?
        return featureDefs.filter((feature) => feature.discrete);
    }
);

const makeNumberToTextConversion = (options: MeasuredFeaturesOptions): TickConversion => {
    return {
        tickText: map(options, "name"),
        tickValues: map(options, (_, key) => Number(key)),
    };
};

const makeNumberAxis = (): TickConversion => {
    // return placeholder values for consistent data structure, plotly will auto compute the real values.
    return {
        tickText: [""],
        tickValues: [0],
    };
};

const getFeatureTickConversion = (
    featureKey: string,
    featureDefs: MeasuredFeatureDef[]
): TickConversion => {
    const feature = find(featureDefs, { key: featureKey });
    if (feature && feature.discrete) {
        return makeNumberToTextConversion(feature.options);
    }
    return makeNumberAxis();
};

export const getXTickConversion = createSelector(
    [getPlotByOnX, getMeasuredFeaturesDefs],
    getFeatureTickConversion
);

export const getYTickConversion = createSelector(
    [getPlotByOnY, getMeasuredFeaturesDefs],
    getFeatureTickConversion
);

export const getConnectByFeatureTickConversion = createSelector(
    [getConnectByFeature, getMeasuredFeaturesDefs],
    getFeatureTickConversion
);

export const getDataForOverlayCard = createSelector(
    [getHoveredPointData, getGroupingCategoryNamesAsArray],
    (pointData, categoryNames): SelectedPointData | null => {
        if (!pointData || !categoryNames.length || pointData.index === undefined) {
            return pointData;
        }
        return {
            ...pointData,
            [GROUP_BY_KEY]: categoryNames[pointData.index],
        };
    }
);

/**
 * Calculate axis ranges from unfiltered data so axes don't rescale when hiding groups
 */
const getAxisRange = (values: (number | null)[]): [number, number] | undefined => {
    let min: number | undefined;
    let max: number | undefined;

    for (const v of values) {
        if (v == null) continue;
        if (min === undefined || v < min) min = v;
        if (max === undefined || v > max) max = v;
    }
    if (min === undefined || max === undefined) return undefined;
    return [min, max];
};

export const getXAxisRange = createSelector(
    [getXValues],
    (xValues: (number | null)[]): [number, number] | undefined => {
        return getAxisRange(xValues);
    }
);

export const getYAxisRange = createSelector(
    [getYValues],
    (yValues: (number | null)[]): [number, number] | undefined => {
        return getAxisRange(yValues);
    }
);

export const getXDisplayName = createSelector(
    [getPlotByOnX, getMeasuredFeaturesDefs],
    (plotByOnX, featureDefs): string => {
        const feature = findFeature(featureDefs, plotByOnX);
        return feature?.displayName ?? plotByOnX;
    }
);

export const getYDisplayName = createSelector(
    [getPlotByOnY, getMeasuredFeaturesDefs],
    (plotByOnY, featureDefs): string => {
        const feature = findFeature(featureDefs, plotByOnY);
        return feature?.displayName ?? plotByOnY;
    }
);

export const getConnectByFeatureDisplayName = createSelector(
    [getConnectByFeature, getMeasuredFeaturesDefs],
    (connectByFeature, featureDefs): string => {
        const feature = findFeature(featureDefs, connectByFeature);
        return feature?.displayName ?? connectByFeature;
    }
);

function formatAxisValue(
    value: number | string | undefined,
    isCategorical: boolean,
    tickConversion: TickConversion
): string {
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    if (!isFinite(value)) return "";
    if (isCategorical) {
        const idx = tickConversion.tickValues.indexOf(value);
        if (idx >= 0) return tickConversion.tickText[idx];
    }
    return Number(value).toPrecision(4);
}

export const getFormattedHoveredXValue = createSelector(
    [getHoveredPointData, getCategoricalFeatureKeys, getPlotByOnX, getXTickConversion],
    (hoveredPointData, categoricalFeatures, xKey, xTickConversion): string => {
        return formatAxisValue(
            hoveredPointData?.xValue,
            includes(categoricalFeatures, xKey),
            xTickConversion
        );
    }
);

export const getFormattedHoveredYValue = createSelector(
    [getHoveredPointData, getCategoricalFeatureKeys, getPlotByOnY, getYTickConversion],
    (hoveredPointData, categoricalFeatures, yKey, yTickConversion): string => {
        return formatAxisValue(
            hoveredPointData?.yValue,
            includes(categoricalFeatures, yKey),
            yTickConversion
        );
    }
);

export const getFormattedHoveredConnectByFeatureValue = createSelector(
    [
        getHoveredPointData,
        getCategoricalFeatureKeys,
        getConnectByFeature,
        getConnectByFeatureTickConversion,
    ],
    (hoveredPointData, categoricalFeatures, connectByKey, tickConversion): string => {
        const value = hoveredPointData?.connectByFeatureValue ?? undefined;
        return formatAxisValue(value, includes(categoricalFeatures, connectByKey), tickConversion);
    }
);
