import type { SelectedGroups } from "..";
import { CELL_ID_KEY, GENERAL_PLOT_SETTINGS } from "../../constants";
import type { URLSearchParamMap } from "../../util/UrlState";
import type { FileInfo } from "../metadata/types";

export interface SelectionStateBranch {
    applySelectionSetColoring: boolean;
    cellSelectedFor3D: string;
    colorBy: string;
    dataset: string;
    /** Source of the URL for a CSV file. */
    csvUrl: string;
    downloadConfig: DownloadConfig;
    filterExclude: string[];
    galleryCollapsed: boolean;
    hoveredCardId: string;
    hoveredPointData: SelectedPointData | null;
    mousePosition: MousePosition;
    plotByOnX: string;
    plotByOnY: string;
    groupBy: string;
    defaultColors: string[];
    colorOverrides: (string | undefined)[];
    pointRadius: number;
    pointOpacity: number;
    selectedAlbum: number;
    selectedGroupColors: { [key: string]: string };
    selectedGroups: SelectedGroups;
    selectedAlbumFileInfo: FileInfo[];
    selectedPoints: FileInfo[];
    initSelectedPoints: string[];
    thumbnailRoot: string;
    downloadRoot: string;
    volumeViewerDataRoot: string;
    alignActive: boolean;
}

export interface CellDataArrays {
    [key: string]: number[] | FileInfo[] | string[];
}

export interface DownloadConfig {
    key: string;
    type: string;
}

export interface MousePosition {
    pageX: number;
    pageY: number;
}

export type MainPlotSettings = typeof GENERAL_PLOT_SETTINGS;

export interface LassoOrBoxSelectPointData {
    pointIndex: number;
    cellId: string;
}
export interface LassoOrBoxSelectAction {
    key: string | number;
    payload: LassoOrBoxSelectPointData[];
    type: string;
}

export interface SelectAxisAction {
    axisId: string;
    payload: string;
    type: string;
}

export interface DeselectPointAction {
    payload: string;
    type: string;
}

export interface DeselectGroupOfPointsAction {
    payload: number | string;
    type: string;
}

export interface SyncStateWithURLAction {
    payload: URLSearchParamMap;
    type: string;
}

export interface SelectPointAction {
    payload: {
        id: string;
        index?: number;
    };
    type: string;
}

export interface ResetSelectionAction {
    type: string;
}

export interface ChangeSelectionAction {
    payload: string;
    type: string;
}

export interface ChangeDownloadConfigAction {
    payload: DownloadConfig;
    type: string;
}
export interface BoolToggleAction {
    payload: boolean;
    type: string;
}

export interface ChangeMousePositionAction {
    payload: MousePosition;
    type: string;
}

export interface SelectedPointData {
    [CELL_ID_KEY]: string;
    index: number;
    thumbnailPath: string;
    srcPath: string;
    groupBy?: string;
    xValue?: number | string;
    yValue?: number | string;
}

export interface ChangeHoveredPointAction {
    payload: SelectedPointData;
    type: string;
}

export interface ChangeSelectedDatasetAction {
    payload: {
        dataset: string;
        thumbnailRoot: string;
        downloadRoot: string;
        volumeViewerDataRoot: string;
    };
    type: string;
}

export interface SelectAlbumAction {
    payload: number;
    type: string;
}

export interface TickConversion {
    tickText: string[];
    tickValues: number[];
}

export interface ColorForPlot {
    color: string;
    name: string;
    label: string;
}

export interface RequestFileInfoByCellIDAction {
    payload: string;
    type: string;
}

export interface ReceiveCellFileInfoAction {
    payload: FileInfo;
    type: string;
}

export interface ReceiveArrayOfPointsAction {
    payload: FileInfo[];
    type: string;
}

export interface SelectArrayOfPointsAction {
    payload: string[];
    type: string;
}

export interface SetHoveredCardAction {
    payload: SelectedPointData;
    type: string;
}

export interface ClearDatasetAction {
    type: string;
}

export interface SetCsvUrlAction {
    type: string;
    payload: string;
}
export interface ChangeGroupByCategory {
    payload: string;
    type: string;
}

export interface SetColorOverrideAction {
    payload: { index: number; color: string | undefined };
    type: string;
}

export interface SetColorOverridesAction {
    payload: (string | undefined)[];
    type: string;
}

export interface SetPointRadiusAction {
    payload: number;
    type: string;
}

export interface SetPointOpacityAction {
    payload: number;
    type: string;
}
