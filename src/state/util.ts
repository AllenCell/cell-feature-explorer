import { find } from "lodash";
import type { Action, Reducer } from "redux";

import { APP_ID, CELL_ID_KEY } from "../constants";

import {
    DataForPlot,
    DiscreteMeasuredFeatureDef,
    FileInfo,
    MeasuredFeatureDef,
} from "./metadata/types";
import { BatchedAction, TypeToDescriptionMap } from "./types";
import { FilterData, NumericFilter } from "./selection/types";

const HTTP_REGEX = /^https?:\/\//;

export function makeConstant<R extends string, A extends string>(
    associatedReducer: R,
    actionType: A
): `${typeof APP_ID}/${Uppercase<R>}/${Uppercase<A>}` {
    return `${APP_ID}/${associatedReducer.toUpperCase() as Uppercase<R>}/${
        actionType.toUpperCase() as Uppercase<A>
    }`;
}

export function makeReducer<S>(
    typeToDescriptionMap: TypeToDescriptionMap,
    initialState: S
): Reducer<S> {
    return (state: S = initialState, action: Action) => {
        const description = typeToDescriptionMap[action.type];
        if (!description) {
            return state;
        }

        if (description.accepts(action)) {
            return description.perform(state, action);
        }

        return state;
    };
}

export const BATCH_ACTIONS = makeConstant("batch", "batch-actions");

export function batchActions<A extends Action>(
    actions: A[],
    type: string = BATCH_ACTIONS
): BatchedAction<A> {
    return { type, batch: true, payload: actions };
}

function actionIsBatched<A extends Action>(action: Action): action is BatchedAction<A> {
    return (
        action &&
        (action as BatchedAction).batch &&
        Array.isArray((action as BatchedAction).payload)
    );
}

export function enableBatching<S, A extends Action = Action>(
    reducer: Reducer<S, A>,
    initialState: S
): Reducer<S, A | BatchedAction<A>> {
    return function batchingReducer(state: S = initialState, action: A | BatchedAction<A>): S {
        if (actionIsBatched<A>(action)) {
            return action.payload.reduce(batchingReducer, state);
        }
        return reducer(state, action);
    };
}

export function getFileInfoDatumFromCellId(
    fileInfoArray: FileInfo[],
    cellId: string
): FileInfo | undefined {
    return find(fileInfoArray, (datum: FileInfo) => datum[CELL_ID_KEY].toString() === cellId);
}

export function convertFullFieldIdToDownloadId(id: number | string): string {
    // Only attach prefix if id is a number (not already prefixed with a letter)
    if (!isNaN(Number(id))) {
        return `F${id}`;
    } else {
        return id as string;
    }
}

export function convertSingleImageIdToDownloadId(id: string): string {
    // Only attach prefix if id is a number (not already prefixed with a letter)
    if (!isNaN(Number(id))) {
        return `C${id}`;
    } else {
        return id;
    }
}

export function formatDownloadOfIndividualFile(root: string, id: string): string {
    // if no downloadRoot is present, then return empty string
    return root === "" ? "" : `${root}&id=${id}`;
}

export function formatThumbnailSrc(thumbnailRoot: string, thumbnailPath: string): string {
    // Don't modify HTTP(S) thumbnail paths
    if (HTTP_REGEX.test(thumbnailPath)) {
        return thumbnailPath;
    }
    if (!thumbnailRoot || !thumbnailPath) {
        return "";
    }
    return `${thumbnailRoot}/${thumbnailPath}`;
}

export function findFeature(features: MeasuredFeatureDef[], searchKey: string) {
    return find(features, { key: searchKey });
}

export function getCategoryString(
    groupByFeatureDef: DiscreteMeasuredFeatureDef,
    optionKey?: string
): string {
    if (!optionKey) {
        return "";
    }
    if (!groupByFeatureDef.options) {
        return "" + optionKey;
    }
    const groupCategoryInfo = groupByFeatureDef.options[optionKey];
    // key is the most specific but only used if the names are not unique.
    // name is the display name for the category.
    return groupCategoryInfo.key || groupCategoryInfo.name;
}

/**
 * Sorts an array of values in-place, with respect to numeric values, and
 * returns the same sorted array.
 *
 * Respects numeric values in strings, so that, for example, "category 2" will be
 * sorted before "category 10".
 */
export function sortNumeric<T>(arr: T[], toString: (item: T) => string): T[] {
    const collator = new Intl.Collator("en", { numeric: true });
    arr.sort((a, b) => collator.compare(toString(a), toString(b)));
    return arr;
}

/**
 * Transforms a FilterData object into a NumericFilter object based on the
 * feature definition, which can be compared against raw (numeric) feature
 * values.
 */
export const getNumericFilterFromFeature = (
    featureDef: MeasuredFeatureDef,
    filter: FilterData | undefined
): NumericFilter | undefined => {
    if (!filter) {
        return undefined;
    }
    if (featureDef.discrete && filter.discrete) {
        // For discrete features, values are marked as excluded based on the
        // string value, but the actual feature data is stored as an integer.
        // Map the excluded string values to their corresponding integer
        // indices.
        const optionKeys = Object.keys(featureDef.options).map(Number);
        const optionValues = Object.values(featureDef.options).map(
            (option) => option.key ?? option.name
        );
        const excludedIndices = new Set<number>();
        for (let i = 0; i < optionKeys.length; i++) {
            if (filter.excludedValues.has(optionValues[i])) {
                excludedIndices.add(optionKeys[i]);
            }
        }
        return {
            featureKey: featureDef.key,
            excludedIndices: excludedIndices,
        };
    } else if (!featureDef.discrete && !filter.discrete) {
        return {
            featureKey: featureDef.key,
            range: filter.range,
        };
    } else {
        console.error(
            `Feature '${featureDef.displayName}' (key: '${featureDef.key}') type and filter type are mismatched and will be skipped.`,
            featureDef,
            filter
        );
        return undefined;
    }
};

/**
 * Returns whether the specified cell index is excluded by the provided filters,
 * using the current feature data.
 * @param id The cell index to check for exclusion.
 * @param cellData The current feature data for all cells.
 * @param numericFilters The set of numeric filters to apply.
 * @returns whether the cell is excluded by the provided filters.
 */
export function isIdExcludedByFilters(
    id: number,
    cellData: DataForPlot,
    numericFilters: Map<string, NumericFilter | undefined>
): boolean {
    let isExcluded = false;
    for (const [featureKey, numericFilter] of numericFilters) {
        const value = cellData.values[featureKey][id];
        if (numericFilter && value !== null) {
            if (numericFilter.range !== undefined) {
                if (value < numericFilter.range[0] || value > numericFilter.range[1]) {
                    isExcluded = true;
                    break;
                }
            } else if (numericFilter.excludedIndices) {
                if (numericFilter.excludedIndices.has(value)) {
                    isExcluded = true;
                    break;
                }
            }
        }
    }
    return isExcluded;
}
