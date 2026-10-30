import { ViewerChannelSettings } from "@aics/vole-app";
import {
    ARRAY_OF_CELL_IDS_KEY,
    CELL_ID_KEY,
    FOV_ID_KEY,
    FOV_THUMBNAIL_PATH,
    FOV_VOLUME_VIEWER_PATH,
    THUMBNAIL_PATH,
    VOLUME_VIEWER_PATH,
} from "../../constants";
import { initialState as initialImageDataset } from "../image-dataset/reducer";
import { initialState as initialMetaData } from "../metadata/reducer";
import { DataForPlot, FileInfo, MeasuredFeatureDef } from "../metadata/types";
import { INITIAL_COLORS } from "../selection/constants";
import { initialState as initialSelectionState } from "../selection/reducer";
import type { FilterData } from "../selection/types";

export const selectedCellFileInfo: FileInfo[] = [
    {
        [CELL_ID_KEY]: "1",
        [FOV_ID_KEY]: "12762",
        [FOV_THUMBNAIL_PATH]: "path",
        [FOV_VOLUME_VIEWER_PATH]: "path",
        [THUMBNAIL_PATH]: "path",
        [VOLUME_VIEWER_PATH]: "path",
    },
    {
        [CELL_ID_KEY]: "2",
        [FOV_ID_KEY]: "12762",
        [FOV_THUMBNAIL_PATH]: "path",
        [FOV_VOLUME_VIEWER_PATH]: "path",
        [THUMBNAIL_PATH]: "path",
        [VOLUME_VIEWER_PATH]: "path",
    },
];

const fileInfo: FileInfo[] = [
    {
        [CELL_ID_KEY]: "1",
        [FOV_ID_KEY]: "12762",
        [FOV_THUMBNAIL_PATH]: "path",
        [FOV_VOLUME_VIEWER_PATH]: "path",
        [THUMBNAIL_PATH]: "path",
        [VOLUME_VIEWER_PATH]: "path",
    },
    {
        [CELL_ID_KEY]: "2",
        [FOV_ID_KEY]: "12762",
        [FOV_THUMBNAIL_PATH]: "path",
        [FOV_VOLUME_VIEWER_PATH]: "path",
        [THUMBNAIL_PATH]: "path",
        [VOLUME_VIEWER_PATH]: "path",
    },
];

const measuredFeaturesDefs: MeasuredFeatureDef[] = [
    {
        key: "cell-line",
        displayName: "Labeled Structure",
        unit: "",
        description:
            "Name of the cellular structure that has been fluorescently labeled in each cell line",
        tooltip:
            "Name of the cellular structure that has been fluorescently labeled in each cell line",
        discrete: true,
        options: {
            "5": {
                color: "#77207C",
                name: "Matrix adhesions",
                key: "Paxillin",
                count: 1,
            },
            "7": {
                color: "#FF96FF",
                name: "Actin filaments",
                key: "Alpha-actinin-1",
                count: 1,
            },
            "10": {
                color: "#FFFFB5",
                name: "Endoplasmic reticulum",
                key: "Sec61 beta",
            },
            "11": {
                color: "#FFD184",
                name: "Mitochondria",
                key: "Tom20",
            },
            "12": {
                color: "#6B4500",
                name: "Microtubules",
                key: "Alpha-tubulin",
            },
        },
    },
    {
        discrete: false,
        displayName: "Apical Proximity",
        key: "apical-proximity",
        unit: "unitless",
        tooltip: "tooltip",
        description: "description",
    },
    {
        displayName: "Anaphase segmentation complete",
        description:
            "Whether the segmentation contains the entirety of the cell boundary (only determined for cells in anaphase).",
        tooltip:
            "Whether the segmentation contains the entirety of the cell boundary (only determined for cells in anaphase).",
        unit: "unitless",
        key: "anaphase-segmentation-complete",
        discrete: true,
        options: {
            "0": {
                color: "#fed98e",
                name: "Incomplete",
            },
            "1": {
                color: "#7f48f3",
                name: "Complete",
            },
            "-1": {
                color: "#838383",
                name: "Not determined",
            },
        },
    },
    {
        discrete: false,
        displayName: "Cell Surface area",
        key: "cellular-surface-area",
        unit: "µm²",
        tooltip: "tooltip",
        description: "description",
    },
    {
        discrete: false,
        displayName: "Missing data",
        key: "missing-data",
        unit: "µm²",
        tooltip: "tooltip",
        description: "description",
    },
];
const featureData: DataForPlot = {
    indices: [0, 1],
    values: {
        "cell-line": [5, 7],
        "apical-proximity": [-0.25868651080317, -0.1],
        "anaphase-segmentation-complete": [1, 0],
        "cellular-surface-area": [702.3191, 702.3191],
        "missing-data": [null, null],
    },
    labels: {
        [ARRAY_OF_CELL_IDS_KEY]: ["1", "2"],
        thumbnailPaths: ["path1", "path2"],
    },
};

const displayableGroups: string[] = ["Paxillin", "Alpha-actinin-1"];
const INITIAL_COLOR_AND_GROUP_BY = "cell-line";

export const mockState = {
    imageDataset: initialImageDataset,
    metadata: {
        ...initialMetaData,
        cellFileInfo: fileInfo,
        featureData: featureData,
        measuredFeaturesDefs: measuredFeaturesDefs,
        viewerChannelSettings: {} as ViewerChannelSettings,
    },
    selection: {
        ...initialSelectionState,
        colorBy: INITIAL_COLOR_AND_GROUP_BY,
        downloadConfig: {
            key: "",
            type: "",
        },
        downloadRoot: "dlurl/",
        groupBy: INITIAL_COLOR_AND_GROUP_BY,
        plotByOnX: "apical-proximity",
        plotByOnY: "anaphase-segmentation-complete",
        defaultColors: INITIAL_COLORS,
        colorOverrides: [],
        selectedGroupColors: {},
        selectedGroups: {},
        selectedPoints: selectedCellFileInfo,
        displayableGroups: displayableGroups,
        filters: new Map<string, FilterData>(),
    },
};
