import { URLSearchParamMap } from "../../util/UrlState";
import { FileInfo } from "../metadata/types";

import {
    CHANGE_AXIS,
    CHANGE_HOVERED_GALLERY_CARD,
    CHANGE_HOVERED_POINT_ID,
    CHANGE_SELECTED_ALBUM,
    DESELECT_ALL_POINTS,
    DESELECT_GROUP_OF_POINTS,
    DESELECT_POINT,
    OPEN_CELL_IN_3D,
    SELECT_GROUP_VIA_PLOT,
    SELECT_POINT,
    SET_DOWNLOAD_CONFIG,
    SET_MOUSE_POSITION,
    SYNC_STATE_WITH_URL,
    TOGGLE_APPLY_SELECTION_SET_COLOR,
    TOGGLE_FILTER_BY_CATEGORY_NAME,
    TOGGLE_GALLERY_OPEN_CLOSE,
    CHANGE_DATASET,
    RECEIVE_FILE_INFO,
    REQUEST_CELL_FILE_INFO_BY_CELL_ID,
    SELECT_ARRAY_OF_POINTS,
    CLEAR_DATASET,
    CHANGE_GROUP_BY_CATEGORY,
    SET_ALIGN_ACTIVE,
    SET_CSV_URL,
    SET_COLOR_OVERRIDE,
    SET_COLOR_OVERRIDES,
    SET_POINT_RADIUS,
    SET_POINT_OPACITY,
    CHANGE_CONNECT_BY_CATEGORY,
    CHANGE_CONNECT_BY_FEATURE,
    SET_SHOW_CONNECT_LINES,
} from "./constants";
import {
    BoolToggleAction,
    ChangeDownloadConfigAction,
    ChangeGroupByCategory,
    ChangeHoveredPointAction,
    ChangeMousePositionAction,
    ChangeSelectionAction,
    ClearDatasetAction,
    DeselectGroupOfPointsAction,
    DeselectPointAction,
    DownloadConfig,
    LassoOrBoxSelectAction,
    LassoOrBoxSelectPointData,
    MousePosition,
    RequestFileInfoByCellIDAction,
    ResetSelectionAction,
    SelectAlbumAction,
    SelectArrayOfPointsAction,
    SelectAxisAction,
    SelectedPointData,
    SelectPointAction,
    SetColorOverrideAction,
    SetColorOverridesAction,
    SetCsvUrlAction,
    SetPointOpacityAction,
    SetPointRadiusAction,
    SyncStateWithURLAction,
} from "./types";

export function changeAxis(axisId: string, payload: string): SelectAxisAction {
    return {
        axisId,
        payload,
        type: CHANGE_AXIS,
    };
}

export function changeGroupByCategory(payload: string): ChangeGroupByCategory {
    return {
        payload,
        type: CHANGE_GROUP_BY_CATEGORY,
    };
}

export function changeConnectByCategory(payload: string): ChangeSelectionAction {
    return {
        payload,
        type: CHANGE_CONNECT_BY_CATEGORY,
    };
}

export function changeConnectByFeature(payload: string): ChangeSelectionAction {
    return {
        payload,
        type: CHANGE_CONNECT_BY_FEATURE,
    };
}

export function setShowConnectLines(payload: boolean): BoolToggleAction {
    return {
        payload,
        type: SET_SHOW_CONNECT_LINES,
    };
}

export function lassoOrBoxSelectGroup(
    key: string | number,
    payload: LassoOrBoxSelectPointData[]
): LassoOrBoxSelectAction {
    return {
        key,
        payload,
        type: SELECT_GROUP_VIA_PLOT,
    };
}

export function deselectGroupOfPoints(payload: string | number): DeselectGroupOfPointsAction {
    return {
        payload,
        type: DESELECT_GROUP_OF_POINTS,
    };
}

export function deselectPoint(payload: string): DeselectPointAction {
    return {
        payload,
        type: DESELECT_POINT,
    };
}

export function selectPoint(payload: { id: string; index?: number }): SelectPointAction {
    return {
        payload,
        type: SELECT_POINT,
    };
}

export function clearAllSelectedPoints(): ResetSelectionAction {
    return {
        type: DESELECT_ALL_POINTS,
    };
}

export function setColorOverride(payload: {
    index: number;
    color: string | undefined;
}): SetColorOverrideAction {
    return {
        payload,
        type: SET_COLOR_OVERRIDE,
    };
}

export function setColorOverrides(payload: (string | undefined)[]): SetColorOverridesAction {
    return {
        payload,
        type: SET_COLOR_OVERRIDES,
    };
}

export function setPointRadius(payload: number): SetPointRadiusAction {
    return {
        payload,
        type: SET_POINT_RADIUS,
    };
}

export function setPointOpacity(payload: number): SetPointOpacityAction {
    return {
        payload,
        type: SET_POINT_OPACITY,
    };
}

export function toggleFilterByCategoryName(payload: string): ChangeSelectionAction {
    return {
        payload,
        type: TOGGLE_FILTER_BY_CATEGORY_NAME,
    };
}

export function selectCellFor3DViewer(payload: { id: string }): SelectPointAction {
    return {
        payload,
        type: OPEN_CELL_IN_3D,
    };
}

export function syncStateWithURL(payload: URLSearchParamMap): SyncStateWithURLAction {
    return {
        payload,
        type: SYNC_STATE_WITH_URL,
    };
}

export function toggleApplySelectionSetColors(payload: boolean): BoolToggleAction {
    return {
        payload,
        type: TOGGLE_APPLY_SELECTION_SET_COLOR,
    };
}

export function changeDownloadSettings(payload: DownloadConfig): ChangeDownloadConfigAction {
    return {
        payload,
        type: SET_DOWNLOAD_CONFIG,
    };
}

export function changeMousePosition(payload: MousePosition): ChangeMousePositionAction {
    return {
        payload,
        type: SET_MOUSE_POSITION,
    };
}

export function changeHoveredPoint(payload: SelectedPointData): ChangeHoveredPointAction {
    return {
        payload,
        type: CHANGE_HOVERED_POINT_ID,
    };
}

export function setHoveredGalleryCard(payload: SelectedPointData): ChangeHoveredPointAction {
    return {
        payload,
        type: CHANGE_HOVERED_GALLERY_CARD,
    };
}

export function selectAlbum(payload: number): SelectAlbumAction {
    return {
        payload,
        type: CHANGE_SELECTED_ALBUM,
    };
}

export function toggleGallery(payload: boolean): BoolToggleAction {
    return {
        payload,
        type: TOGGLE_GALLERY_OPEN_CLOSE,
    };
}

export function changeDataset(payload: string): ChangeSelectionAction {
    return {
        payload,
        type: CHANGE_DATASET,
    };
}

export function clearDataset(): ClearDatasetAction {
    return {
        type: CLEAR_DATASET,
    };
}

export function setCsvUrl(payload: string): SetCsvUrlAction {
    return {
        payload,
        type: SET_CSV_URL,
    };
}

export function receiveFileInfoDataForCell(payload: FileInfo) {
    return {
        payload,
        type: RECEIVE_FILE_INFO,
    };
}

export function requestCellFileInfoByCellId(payload: string): RequestFileInfoByCellIDAction {
    return {
        payload,
        type: REQUEST_CELL_FILE_INFO_BY_CELL_ID,
    };
}

export function requestCellFileInfoByArrayOfCellIds(payload: string[]): SelectArrayOfPointsAction {
    return {
        payload,
        type: SELECT_ARRAY_OF_POINTS,
    };
}

export function setAlignActive(payload: boolean) {
    return {
        payload,
        type: SET_ALIGN_ACTIVE,
    };
}
