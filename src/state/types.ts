import { AxiosInstance } from "axios";
import { Color } from "plotly.js";
import { Action } from "redux";

import { FileInfo, MetadataStateBranch } from "./metadata/types";
import { LassoOrBoxSelectPointData, SelectionStateBranch } from "./selection/types";
import { ImageDatasetStateBranch } from "./image-dataset/types";

export type NumberOrString = number | string;

export interface ActionDescription {
    accepts: (action: Action) => boolean;
    perform: (state: any, action: any) => any;
}

export interface BatchedAction<A extends Action = Action> {
    type: string;
    batch: boolean;
    payload: A[];
}

export interface ReduxLogicDeps<A extends Action = Action> {
    action: A;
    httpClient: AxiosInstance;
    getState: () => State;
    ctx?: any;
}

export type ReduxLogicNextCb = (action: Action) => void;

export interface State {
    metadata: MetadataStateBranch;
    selection: SelectionStateBranch;
    imageDataset: ImageDatasetStateBranch;
}

export interface TypeToDescriptionMap {
    [propName: string]: ActionDescription;
}

export interface AnnotationData {
    cellID: string;
    hovered: boolean;
    fovID: string;
    pointIndex: number;
    thumbnailPath: string;
    x: number;
    y: number;
}

export interface Thumbnail {
    downloadHref: string;
    category: string;
    mitoticStage: string;
    src: string;
    cellID: string;
    empty?: boolean;
    fullFieldDownloadHref: string;
    fileInfo: FileInfo;
}

export interface SelectedGroupDatum {
    groupColor: Color;
    x: number;
    y: number;
}

export interface PlotlyCustomData {
    thumbnailPath: string;
    index: number;
    srcPath?: string;
    connectByFeatureValue?: number | null;
}

/**
 * Data for a single scatter trace. `color` is either a numeric array (plotted
 * with a continuous colorscale) or an array of per-point color strings.
 */
export interface ScatterPlotData {
    color?: Color | Color[] | number | number[];
    ids?: string[];
    x: (number | null)[];
    y: (number | null)[];
    customdata?: PlotlyCustomData[];
    opacity?: number[];
    plotName?: string;
}

export interface LinePlotData {
    x: (number | null)[];
    y: (number | null)[];
    groupIndex: number;
    color?: string;
}

export interface SelectedGroup {
    groupColor: Color[];
    x: number[];
    y: number[];
}

export interface SelectedGroupData {
    [key: string]: SelectedGroupDatum[];
}

export interface SelectedGroups {
    [key: string]: LassoOrBoxSelectPointData[];
}

export interface Album {
    album_id: number | string;
    cell_ids: number[];
    title: string;
}
