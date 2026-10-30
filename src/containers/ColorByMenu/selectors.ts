import { chunk, map, reduce, values } from "lodash";
import { createSelector } from "reselect";

import {
    DISABLE_COLOR,
    DOWNLOAD_CONFIG_TYPE_PROTEIN,
    DOWNLOAD_CONFIG_TYPE_SELECTION_SET,
    OFF_COLOR,
} from "../../constants/index";
import { getLabelsPerCell } from "../../state/metadata/selectors";
import {
    MappingOfMeasuredValuesArrays,
    MeasuredFeatureDef,
    MeasuredFeaturesOption,
} from "../../state/metadata/types";
import {
    MISSING_CATEGORY_COLOR,
    MISSING_CATEGORY_KEY,
    MISSING_CATEGORY_LABEL,
} from "../../state/selection/constants";
import {
    getApplyColorToSelections,
    getColorBySelection,
    getDownloadConfig,
    getDownloadRoot,
    getSelectedGroupKeys,
    getSelectedGroups,
    getSelectedSetTotals,
    getSelectionSetColors,
    getGroupingCategoryNames,
    getGroupByFeatureOptionsAsList,
    getGroupByCategory,
    getCategoryGroupColorsAndNames,
    getGroupByFeatureDef,
    getGroupingCategoryNamesAsArray,
    getYValues,
    getXValues,
    getColorOverrides,
    getGroupByFilter,
} from "../../state/selection/selectors";
import {
    ColorForPlot,
    DiscreteFilterData,
    LassoOrBoxSelectPointData,
} from "../../state/selection/types";
import { convertSingleImageIdToDownloadId } from "../../state/util";

import { PanelData } from "./types";

export const getDisplayableGroups = createSelector(
    [getXValues, getYValues, getGroupingCategoryNamesAsArray],
    (xValues, yValues, categoryNames): string[] => {
        // Could memoize this if performance becomes an issue
        const displayable = new Set<string>();
        for (let i = 0; i < xValues.length; i++) {
            if (xValues[i] !== null && yValues[i] !== null) {
                displayable.add(categoryNames[i]);
            }
        }
        return [...displayable];
    }
);

export const getGroupByTitle = createSelector(
    [getGroupByFeatureDef],
    (groupByFeatureDef: MeasuredFeatureDef): string => {
        return groupByFeatureDef.displayName;
    }
);

export const getCheckAllCheckboxIsIntermediate = createSelector(
    [getGroupByFilter, getGroupingCategoryNames],
    (groupByFilter, categoryNames: string[]): boolean => {
        const excludedValues = groupByFilter?.excludedValues;
        return (
            excludedValues !== undefined &&
            excludedValues.size > 0 &&
            excludedValues.size !== categoryNames.length
        );
    }
);

export const disambiguateCategoryNames = (options: MeasuredFeaturesOption[]): string[] => {
    const categoryNames: string[] = map(options, (option) => option.name);
    const keys: string[] = map(options, (option) => option.key || "");

    const repeatedNames: string[] = categoryNames.filter((name, i) => {
        return categoryNames.indexOf(name) !== i;
    });
    const disambiguatedNames: string[] = categoryNames.map((name, i) => {
        if (repeatedNames.includes(name)) {
            return `${name} (${keys[i]})`;
        }
        return name;
    });

    return disambiguatedNames;
};

export const getLegendColors = createSelector(
    [getCategoryGroupColorsAndNames, getGroupByCategory, getColorBySelection],
    (colorsAndNames, categoryToGroupBy, categoryToColorBy): ColorForPlot[] => {
        // if color by and group by are the same, the legend
        // is redundant
        if (categoryToColorBy === categoryToGroupBy) {
            return [];
        }
        return colorsAndNames;
    }
);

const getColorForCategory = (
    showGroupByColors: boolean,
    isExcluded: boolean,
    isDisabled: boolean,
    categoryColor: string,
    overrideColor: string | undefined
) => {
    if (isDisabled) {
        return DISABLE_COLOR;
    } else if (isExcluded) {
        return OFF_COLOR;
    } else if (showGroupByColors) {
        if (overrideColor) {
            return overrideColor;
        }
        return categoryColor;
    } else {
        return DISABLE_COLOR;
    }
};

export const getInteractivePanelData = createSelector(
    [
        getGroupByCategory,
        getColorBySelection,
        getGroupByFeatureOptionsAsList,
        getGroupByFilter,
        getDisplayableGroups,
        getGroupingCategoryNamesAsArray,
        getColorOverrides,
    ],
    (
        categoryToGroupBy: keyof MappingOfMeasuredValuesArrays,
        categoryToColorBy: keyof MappingOfMeasuredValuesArrays,
        categories: MeasuredFeaturesOption[],
        groupByFilter: DiscreteFilterData | undefined,
        displayableGroups: string[],
        categoryNamesArray: string[],
        colorOverrides: (string | undefined)[]
    ): PanelData[] => {
        // Calculate actual counts from the data
        const countsByCategory: { [key: string]: number } = reduce(
            categoryNamesArray,
            (acc, categoryName) => {
                acc[categoryName] = (acc[categoryName] || 0) + 1;
                return acc;
            },
            {} as { [key: string]: number }
        );

        if (countsByCategory[MISSING_CATEGORY_KEY] > 0) {
            // Some data points have no data for this category. Modify categories
            // to include an N/A entry.
            categories = [
                ...categories,
                {
                    color: MISSING_CATEGORY_COLOR,
                    name: MISSING_CATEGORY_LABEL,
                    key: MISSING_CATEGORY_KEY,
                },
            ];
        }

        const names = disambiguateCategoryNames(categories);
        return map(categories, (category: MeasuredFeaturesOption, index: number) => {
            const id = category.key ?? category.name;
            const total: number = countsByCategory[id] || category.count || 0;
            const disabled = !displayableGroups.includes(id);
            const excluded = groupByFilter?.excludedValues.has(id) ?? false;
            const color = getColorForCategory(
                categoryToColorBy === categoryToGroupBy,
                excluded,
                disabled,
                category.color,
                colorOverrides[index]
            );
            return {
                checked: !excluded,
                color: color,
                id: id,
                name: names[index],
                disabled: disabled,
                total,
            };
        });
    }
);

export const getSelectionPanelData = createSelector(
    [getApplyColorToSelections, getSelectionSetColors, getSelectedGroupKeys, getSelectedSetTotals],
    (
        applyColorToSelections,
        selectedSetColors,
        selectedSetNames,
        selectedSetTotals
    ): PanelData[] => {
        return map(selectedSetNames, (name, index) => {
            const color = applyColorToSelections ? values(selectedSetColors)[index] : DISABLE_COLOR;
            const displayName = Number(name) ? index : name;
            return {
                color,
                id: name.toString(),
                name: displayName.toString(),
                total: selectedSetTotals[index],
            };
        });
    }
);

export const getListOfCellIdsByDownloadConfig = createSelector(
    [getLabelsPerCell, getGroupingCategoryNamesAsArray, getDownloadConfig, getSelectedGroups],
    (labelsPerCell, namePerCell: string[], downloadConfig, selectedGroups): string[] => {
        const returnArray: string[] = [];
        if (downloadConfig.type === DOWNLOAD_CONFIG_TYPE_PROTEIN) {
            return reduce(
                namePerCell,
                (acc, categoryName: string, index) => {
                    if (categoryName === downloadConfig.key) {
                        acc.push(convertSingleImageIdToDownloadId(labelsPerCell.cellIds[index]));
                    }
                    return acc;
                },
                returnArray
            );
        } else if (downloadConfig.type === DOWNLOAD_CONFIG_TYPE_SELECTION_SET) {
            const selectedCells = selectedGroups[downloadConfig.key];
            return selectedCells.map((point: LassoOrBoxSelectPointData) =>
                convertSingleImageIdToDownloadId(point.cellId)
            );
        }
        return returnArray;
    }
);

export const createUrlFromListOfIds = createSelector(
    [getDownloadRoot, getListOfCellIdsByDownloadConfig],
    (downloadRoot: string, cellIdsToDownload): string[] => {
        if (downloadRoot === "") {
            return [];
        }
        const chunkSize = 300;
        const chunksOfIds = chunk(cellIdsToDownload, chunkSize);
        return map(
            chunksOfIds,
            (listOfIds) => `${downloadRoot}${map(listOfIds, (cellId) => `&id=${cellId}`).join("")}`
        );
    }
);
