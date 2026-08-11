import {
    castArray,
    includes,
    isBoolean,
    isEmpty,
    isNaN,
    isNil,
    isString,
    map,
    mergeWith,
    reduce,
    isEqual,
} from "lodash";
import type { Action } from "redux";

import {
    CELL_ID_KEY,
    COLOR_BY_SELECTOR,
    GROUP_BY_KEY,
    HEX_COLOR_REGEX,
    X_AXIS_ID,
    Y_AXIS_ID,
} from "../constants";
import type { FileInfo } from "../state/metadata/types";
import {
    changeAxis,
    changeConnectByCategory,
    changeConnectByFeature,
    changeDataset,
    changeGroupByCategory,
    selectAlbum,
    selectCellFor3DViewer,
    selectPoint,
    setColorOverrides,
    setConnectLineDefaultColor,
    setConnectLineMovingAverageWindow,
    setConnectLineWidth,
    setCsvUrl,
    setPointOpacity,
    setPointRadius,
    setShowConnectLines,
    toggleGallery,
} from "../state/selection/actions";
import { initialState } from "../state/selection/reducer";
import type { SelectionStateBranch } from "../state/selection/types";
import { connect } from "react-redux";

export enum URLSearchParam {
    cellSelectedFor3D = "cellSelectedFor3D",
    colorBy = "colorBy",
    groupBy = "groupBy",
    dataset = "dataset",
    plotByOnX = "plotByOnX",
    plotByOnY = "plotByOnY",
    connectBy = "connectBy",
    connectByCategory = "connectByCategory",
    connectByFeature = "connectByFeature",
    connectLineMovingAverageWindow = "lineWindow",
    connectLineWidth = "lineWidth",
    connectLineDefaultColor = "lineColor",
    selectedPoint = "selectedPoint",
    selectedAlbum = "selectedAlbum",
    galleryCollapsed = "galleryCollapsed",
    csvUrl = "csvUrl",
    colorOverrides = "colorOverrides",
    plotPointRadius = "ptRadius",
    plotPointOpacity = "ptOpacity",
}

type StateValue = any; // types are narrowed in mappings
type URLSearchParamValue = string | string[];

export interface URLSearchParamMap {
    [index: string]: URLSearchParamValue;
}

interface URLSearchParamToActionCreatorMap {
    [index: string]: (
        value: URLSearchParamValue,
        collection: URLSearchParamMap
    ) => Action | Action[];
}

interface URLSearchParamToStateMap {
    [index: string]: (
        value: URLSearchParamValue,
        collection: URLSearchParamMap
    ) => { [key: string]: StateValue };
}

interface StateToUrlSearchParamMap {
    [index: string]: (value: StateValue) => { [key: string]: URLSearchParamValue };
}

export default class UrlState {
    public static toAppState(searchParameterMap: URLSearchParamMap): Partial<SelectionStateBranch> {
        const initial: Partial<SelectionStateBranch> = {};
        return reduce(
            searchParameterMap,
            (accum, searchParamValue, searchParamKey) => {
                if (UrlState.urlParamToStateMap.hasOwnProperty(searchParamKey)) {
                    const result = UrlState.urlParamToStateMap[searchParamKey](
                        searchParamValue,
                        searchParameterMap
                    );
                    return mergeWith({}, accum, result, (accumValue, resultValue) => {
                        if (Array.isArray(accumValue)) {
                            return accumValue.concat(resultValue);
                        }
                    });
                }
                return accum;
            },
            initial
        );
    }

    public static paramChanged(
        key: string,
        newParams: URLSearchParamMap,
        currentParams: URLSearchParamMap
    ): boolean {
        return !isEqual(currentParams[key], newParams[key]);
    }

    public static paramsChanged(
        newParamsFromState: URLSearchParamMap,
        currentParams: URLSearchParamMap
    ): boolean {
        return !isEqual(currentParams, newParamsFromState);
    }

    public static toReduxActions(searchParameterMap: URLSearchParamMap): Action[] {
        const initial: Action[] = [];
        return reduce(
            searchParameterMap,
            (accum, searchParamValue, searchParamKey) => {
                if (UrlState.urlParamToActionCreatorMap.hasOwnProperty(searchParamKey)) {
                    const action = UrlState.urlParamToActionCreatorMap[searchParamKey](
                        searchParamValue,
                        searchParameterMap
                    );

                    if (action) {
                        return [...accum, ...castArray(action)];
                    }
                }
                return accum;
            },
            initial
        );
    }

    public static toUrlSearchParameterMap(
        selections: Partial<SelectionStateBranch>
    ): URLSearchParamMap {
        const initial: URLSearchParamMap = {};
        return reduce(
            selections,
            (accum, selectionStateValue, selectionStateKey) => {
                if (
                    UrlState.stateToUrlParamMap.hasOwnProperty(selectionStateKey) &&
                    UrlState.valueIsMeaningfulToSerialize(selectionStateValue) &&
                    UrlState.valueIsNotDefault(selectionStateValue, selectionStateKey)
                ) {
                    return {
                        ...accum,
                        ...this.stateToUrlParamMap[selectionStateKey](selectionStateValue),
                    };
                }
                return accum;
            },
            initial
        );
    }

    private static parseColorOverridesParam(param: string): (string | undefined)[] {
        return map(param.split("-"), (color) =>
            HEX_COLOR_REGEX.test(color) ? `#${color.toLowerCase()}` : undefined
        );
    }

    private static serializeColorOverridesParam(colorOverrides: (string | undefined)[]): string {
        // Remove trailing undefined values
        const param = colorOverrides
            .map((color) => (color ? String(color).substring(1) : ""))
            .join("-");
        return param.replace(/(-)+$/g, ""); // remove trailing `-` characters
    }

    private static urlParamToActionCreatorMap: URLSearchParamToActionCreatorMap = {
        [URLSearchParam.cellSelectedFor3D]: (cellId, params) => {
            const selectCellFor3DAction = selectCellFor3DViewer({ id: String(cellId) });

            // add this cell to the list of selected points if it does not already exist
            if (!includes(castArray(params[URLSearchParam.selectedPoint]), cellId)) {
                return [selectPoint({ id: String(cellId) }), selectCellFor3DAction];
            }

            return selectCellFor3DAction;
        },
        [URLSearchParam.groupBy]: (groupBy) => changeGroupByCategory(String(groupBy)),
        [URLSearchParam.colorBy]: (colorBy) => changeAxis(COLOR_BY_SELECTOR, String(colorBy)),
        [URLSearchParam.dataset]: (id) => changeDataset(String(id)),
        [URLSearchParam.csvUrl]: (url) => setCsvUrl(decodeURIComponent(String(url))),
        [URLSearchParam.galleryCollapsed]: (galleryCollapsed) =>
            toggleGallery(galleryCollapsed === "true"),
        [URLSearchParam.plotByOnX]: (plotByOnX) => changeAxis(X_AXIS_ID, String(plotByOnX)),
        [URLSearchParam.plotByOnY]: (plotByOnY) => changeAxis(Y_AXIS_ID, String(plotByOnY)),
        [URLSearchParam.connectBy]: (connectBy) => setShowConnectLines(connectBy === "true"),
        [URLSearchParam.connectByCategory]: (connectByCategory) =>
            changeConnectByCategory(String(connectByCategory)),
        [URLSearchParam.connectByFeature]: (connectByFeature) =>
            changeConnectByFeature(String(connectByFeature)),
        [URLSearchParam.connectLineMovingAverageWindow]: (window) =>
            setConnectLineMovingAverageWindow(Number(window)),
        [URLSearchParam.connectLineWidth]: (width) => setConnectLineWidth(Number(width)),
        [URLSearchParam.connectLineDefaultColor]: (color) =>
            setConnectLineDefaultColor(String(color)),
        [URLSearchParam.selectedAlbum]: (album) => selectAlbum(Number(album)),
        [URLSearchParam.selectedPoint]: (selection) => {
            if (Array.isArray(selection)) {
                return map<number | string, Action>(selection, (point) =>
                    selectPoint({ id: String(point) })
                );
            }
            return selectPoint({ id: String(selection) });
        },
        [URLSearchParam.colorOverrides]: (colorOverrides) => {
            const parsedColorOverrides = UrlState.parseColorOverridesParam(String(colorOverrides));
            return setColorOverrides(parsedColorOverrides);
        },
        [URLSearchParam.plotPointRadius]: (pointRadius) => setPointRadius(Number(pointRadius)),
        [URLSearchParam.plotPointOpacity]: (pointOpacity) => setPointOpacity(Number(pointOpacity)),
    };

    private static urlParamToStateMap: URLSearchParamToStateMap = {
        [URLSearchParam.cellSelectedFor3D]: (cellId, params) => {
            const base = { cellSelectedFor3D: String(cellId) };

            // add this cell to the list of selected points if it does not already exist
            if (!includes(castArray(params[URLSearchParam.selectedPoint]), cellId)) {
                Object.assign(base, { initSelectedPoints: [String(cellId)] });
            }

            return base;
        },
        [URLSearchParam.groupBy]: (groupBy) => ({ [GROUP_BY_KEY]: String(groupBy) }),
        [URLSearchParam.colorBy]: (colorBy) => ({ [COLOR_BY_SELECTOR]: String(colorBy) }),
        [URLSearchParam.dataset]: (id) => ({ dataset: String(id) }),
        [URLSearchParam.galleryCollapsed]: (galleryCollapsed) => ({
            galleryCollapsed: galleryCollapsed === "true",
        }),
        [URLSearchParam.plotByOnX]: (plotByOnX) => ({ [X_AXIS_ID]: String(plotByOnX) }),
        [URLSearchParam.plotByOnY]: (plotByOnY) => ({ [Y_AXIS_ID]: String(plotByOnY) }),
        [URLSearchParam.connectBy]: (connectBy) => ({
            showConnectLines: connectBy === "true",
        }),
        [URLSearchParam.connectByCategory]: (key) => ({
            connectByCategory: String(key),
        }),
        [URLSearchParam.connectByFeature]: (key) => ({
            connectByFeature: String(key),
        }),
        [URLSearchParam.connectLineMovingAverageWindow]: (window) => ({
            connectLineMovingAverageWindow: Number(window),
        }),
        [URLSearchParam.connectLineWidth]: (width) => ({
            connectLineWidth: Number(width),
        }),
        [URLSearchParam.connectLineDefaultColor]: (color) => ({
            connectLineDefaultColor: String(color),
        }),
        [URLSearchParam.selectedAlbum]: (album) => ({ selectedAlbum: Number(album) }),
        [URLSearchParam.selectedPoint]: (selection) => ({
            initSelectedPoints: map(castArray(selection), String),
        }),
        [URLSearchParam.colorOverrides]: (colorOverrides) => ({
            colorOverrides: UrlState.parseColorOverridesParam(String(colorOverrides)),
        }),
        [URLSearchParam.plotPointRadius]: (pointRadius) => ({
            pointRadius: Number(pointRadius),
        }),
        [URLSearchParam.plotPointOpacity]: (pointOpacity) => ({
            pointOpacity: Number(pointOpacity),
        }),
    };

    private static stateToUrlParamMap: StateToUrlSearchParamMap = {
        cellSelectedFor3D: (value) => ({ [URLSearchParam.cellSelectedFor3D]: String(value) }),
        [COLOR_BY_SELECTOR]: (value) => ({ [URLSearchParam.colorBy]: String(value) }),
        [GROUP_BY_KEY]: (value) => ({ [URLSearchParam.groupBy]: String(value) }),
        dataset: (id) => ({ [URLSearchParam.dataset]: String(id) }),
        csvUrl: (url) => ({ [URLSearchParam.csvUrl]: String(encodeURIComponent(url)) }),
        galleryCollapsed: (value) => ({ [URLSearchParam.galleryCollapsed]: String(value) }),
        selectedAlbum: (value) => ({ [URLSearchParam.selectedAlbum]: String(value) }),
        selectedPoints: (value: FileInfo[]) => {
            const arrayOfIds = map(value, (ele: FileInfo) => String(ele[CELL_ID_KEY]));
            return { [URLSearchParam.selectedPoint]: arrayOfIds };
        },
        [X_AXIS_ID]: (value) => ({ [URLSearchParam.plotByOnX]: String(value) }),
        [Y_AXIS_ID]: (value) => ({ [URLSearchParam.plotByOnY]: String(value) }),
        showConnectLines: (value) => ({ [URLSearchParam.connectBy]: String(value) }),
        connectByCategory: (value) => ({ [URLSearchParam.connectByCategory]: String(value) }),
        connectByFeature: (value) => ({ [URLSearchParam.connectByFeature]: String(value) }),
        connectLineMovingAverageWindow: (value) => ({
            [URLSearchParam.connectLineMovingAverageWindow]: String(value),
        }),
        connectLineWidth: (value) => ({
            [URLSearchParam.connectLineWidth]: String(value),
        }),
        connectLineDefaultColor: (value) => ({
            [URLSearchParam.connectLineDefaultColor]: String(value),
        }),
        colorOverrides: (value: (string | undefined)[]) => ({
            [URLSearchParam.colorOverrides]: UrlState.serializeColorOverridesParam(value),
        }),
        pointRadius: (value) => ({ [URLSearchParam.plotPointRadius]: String(value) }),
        pointOpacity: (value) => ({ [URLSearchParam.plotPointOpacity]: String(value) }),
    };

    private static valueIsMeaningfulToSerialize(selection: any): boolean {
        /**
         * Return false if value is not a boolean and it is an empty array, empty string, NaN, undefined, or null
         * Else, return true
         */
        if (isBoolean(selection)) {
            return true;
        }

        if (Array.isArray(selection) || isString(selection)) {
            return !isEmpty(selection);
        }

        return !isNaN(selection) && !isNil(selection);
    }

    private static valueIsNotDefault(selection: any, key: string): boolean {
        return (initialState as any)[key] !== selection;
    }
}
