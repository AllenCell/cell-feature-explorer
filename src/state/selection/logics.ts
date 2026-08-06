import { createLogic } from "redux-logic";
import { filter, find, indexOf, map, remove } from "lodash";

import { UrlState } from "../../util";
import { InitialDatasetSelections } from "../image-dataset/types";
import { requestFeatureData, requestViewerChannelSettings } from "../metadata/actions";
import { getDatasets, getPerCellDataForPlot } from "../metadata/selectors";
import { ReduxLogicDeps } from "../types";
import { batchActions } from "../util";

import {
    CHANGE_DATASET,
    CHANGE_SELECTED_ALBUM,
    CSV_DATASET_NAME,
    RECEIVE_FILE_INFO_FOR_ALBUM_CELLS,
    RECEIVE_FILE_INFO_FOR_SELECTED_ARRAY_OF_CELLS,
    RECEIVE_FILE_INFO_FOR_SELECTED_CELL,
    SELECT_ARRAY_OF_POINTS,
    SELECT_POINT,
    SET_DATASET,
    SYNC_STATE_WITH_URL,
} from "./constants";
import { COLOR_BY_SELECTOR, X_AXIS_ID, Y_AXIS_ID } from "../../constants";
import {
    changeAxis,
    changeConnectByCategory,
    changeConnectByFeature,
    changeGroupByCategory,
} from "./actions";
import { FileInfo } from "../metadata/types";
import { DatasetMetaData } from "../image-dataset/types";
import { getImageDataset } from "../image-dataset/selectors";
import {
    ChangeSelectionAction,
    SelectAlbumAction,
    SelectArrayOfPointsAction,
    SelectPointAction,
    SyncStateWithURLAction,
} from "./types";

const syncStateWithUrl = createLogic({
    type: SYNC_STATE_WITH_URL,
    process({ action }: ReduxLogicDeps<SyncStateWithURLAction>, dispatch: any, done: any) {
        const searchParameterMap = action.payload;
        const actions = UrlState.toReduxActions(searchParameterMap);
        const logicActions = remove(actions, { type: CHANGE_DATASET });
        // batchActions doesn't include logics
        if (logicActions) {
            logicActions.forEach((action) => dispatch(action));
        }
        dispatch(batchActions(UrlState.toReduxActions(searchParameterMap)));
        done();
    },
});

const changeDatasetLogic = createLogic({
    type: CHANGE_DATASET,
    async process(deps: ReduxLogicDeps<ChangeSelectionAction>, dispatch: any, done: any) {
        const { action, getState } = deps;
        const state = getState();
        const imageDataSet = getImageDataset(state);

        if (!action.payload) {
            return dispatch({
                type: SET_DATASET,
                payload: action.payload,
            });
        }
        let selectedDataset: DatasetMetaData | undefined;
        const datasets = getDatasets(getState());
        if (!datasets.length) {
            // if user goes directly to a dataset ie cfe.allencell.org/?dataset=[DATASET],
            // the datasets may not have been saved in state yet. So we need to fetch
            // all available dataset descriptions again and find the dataset we need.
            const megasets = await imageDataSet.getAvailableDatasets();
            for (let i = 0; i < megasets.length; i++) {
                const matchingDataset = find(megasets[i].datasets, { id: action.payload });
                if (matchingDataset) {
                    selectedDataset = matchingDataset;
                    break;
                }
            }
        } else {
            selectedDataset = find(datasets, { id: action.payload });
        }
        if (selectedDataset === undefined) {
            if (action.payload !== CSV_DATASET_NAME) {
                console.error(`A dataset matching ${action.payload} is not available.`);
            }
            return done();
        }
        imageDataSet
            .selectDataset(selectedDataset.manifest)
            .then(async (selections: InitialDatasetSelections) => {
                const state = getState();
                const featureKeys = new Set(
                    (await imageDataSet.getMeasuredFeatureDefs()).map((def) => def.key)
                );
                const actions = [];
                if (!featureKeys.has(state.selection.plotByOnX)) {
                    actions.push(changeAxis(X_AXIS_ID, selections.defaultXAxis));
                }
                if (!featureKeys.has(state.selection.plotByOnY)) {
                    actions.push(changeAxis(Y_AXIS_ID, selections.defaultYAxis));
                }
                if (!featureKeys.has(state.selection.groupBy)) {
                    actions.push(changeGroupByCategory(selections.defaultGroupBy));
                }
                if (
                    !featureKeys.has(state.selection.connectByFeature) &&
                    selections.defaultConnectBy
                ) {
                    actions.push(changeConnectByFeature(selections.defaultConnectBy));
                }
                if (!featureKeys.has(state.selection.connectByCategory)) {
                    actions.push(changeConnectByCategory(selections.defaultGroupBy));
                }
                if (!featureKeys.has(state.selection.colorBy) && selections.defaultColorBy) {
                    actions.push(changeAxis(COLOR_BY_SELECTOR, selections.defaultColorBy));
                }
                dispatch(batchActions(actions));
                dispatch({
                    type: SET_DATASET,
                    payload: {
                        dataset: action.payload,
                        thumbnailRoot: selections.thumbnailRoot,
                        downloadRoot: selections.downloadRoot,
                        volumeViewerDataRoot: selections.volumeViewerDataRoot,
                    },
                });
                dispatch(requestFeatureData());
                dispatch(requestViewerChannelSettings());
                done();
            });
    },
});

const requestCellFileInfoForSelectedPoint = createLogic({
    process(deps: ReduxLogicDeps<SelectPointAction>) {
        const { action, getState } = deps;
        const state = getState();
        const imageDataSet = getImageDataset(state);
        return imageDataSet
            .getFileInfoByCellId(action.payload.id.toString())
            .then((data?: FileInfo) => {
                if (!data) {
                    console.error(`No file info found for cell id ${action.payload.id}`); // tslint:disable-line:no-console
                    return {};
                }
                return { ...data, index: action.payload.index };
            })
            .catch((reason: string) => {
                console.log(
                    `Error requesting file info for cell id ${action.payload.id}: ${reason}`
                ); // tslint:disable-line:no-console
            });
    },
    processOptions: {
        successType: RECEIVE_FILE_INFO_FOR_SELECTED_CELL,
    },
    type: SELECT_POINT,
});

const getIndicesForCellIds = (cellIds: string[], fullArrayOfCelIds: string[]) => {
    /**
     * This will be called when there is an array of selected cells coming from the url.
     * All that is stored in the url is the cell id, so we need to find the index for each of these
     * ids, but we only need to do this once.
     */
    const indices: { [key: string]: number } = {};
    const idsInOrder = cellIds.sort((a: string, b: string) => Number(a) - Number(b));
    idsInOrder.forEach((id: string) => {
        const index = indexOf(fullArrayOfCelIds, id);
        indices[id] = index;
    });
    return indices;
};

const requestCellFileInfoForSelectedArrayOfPoints = createLogic({
    process(deps: ReduxLogicDeps<SelectArrayOfPointsAction>) {
        const { action, getState } = deps;
        const state = getState();
        const imageDataSet = getImageDataset(state);
        const plotData = getPerCellDataForPlot(state);
        const indices = getIndicesForCellIds(action.payload, plotData.labels.cellIds);

        return imageDataSet
            .getFileInfoByArrayOfCellIds(action.payload)
            .then((data: (FileInfo | undefined)[]) => {
                return filter(
                    map(data, (data) => {
                        return {
                            ...data,
                            // this is expected to always return data, this check
                            // is mostly for TypeScript (since there is also a catch block)
                            index: data ? indices[data.CellId] : -1,
                        };
                    })
                );
            })
            .catch((reason: string) => {
                console.log(`Error requesting file info for array of cell ids: ${reason}`); // tslint:disable-line:no-console
            });
    },
    processOptions: {
        successType: RECEIVE_FILE_INFO_FOR_SELECTED_ARRAY_OF_CELLS,
    },
    type: SELECT_ARRAY_OF_POINTS,
});

const selectAlbum = createLogic({
    process(deps: ReduxLogicDeps<SelectAlbumAction>) {
        const { action, getState } = deps;
        const state = getState();
        const imageDataSet = getImageDataset(state);
        if (!imageDataSet.getFileInfoByArrayOfCellIds) {
            return Promise.resolve({});
        }

        return imageDataSet
            .getFileInfoByArrayOfCellIds([action.payload.toString()])
            .then((data: (FileInfo | undefined)[]) => {
                return filter(data);
            })
            .catch((reason: string) => {
                console.log(reason); // tslint:disable-line:no-console
            });
    },
    processOptions: {
        successType: RECEIVE_FILE_INFO_FOR_ALBUM_CELLS,
    },
    type: CHANGE_SELECTED_ALBUM,
});

export default [
    syncStateWithUrl,
    changeDatasetLogic,
    requestCellFileInfoForSelectedPoint,
    selectAlbum,
    requestCellFileInfoForSelectedArrayOfPoints,
];
