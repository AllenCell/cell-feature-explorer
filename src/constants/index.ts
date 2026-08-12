export const APP_ID = "cell-feature-explorer";
export const API_VERSION = "v1";
export const X_AXIS_ID = "plotByOnX";
export const Y_AXIS_ID = "plotByOnY";
export const ARRAY_OF_CELL_IDS_KEY = "cellIds";
export const ARRAY_OF_FILE_INFO_KEY = "fileInfo";
export const SCATTER_PLOT_NAME = "features-scatter-plot";
export const SELECTIONS_PLOT_NAME = "selections-scatter-plot";
export const COLOR_BY_SELECTOR = "colorBy";
export const GROUP_BY_KEY = "groupBy";

export const CELL_ID_KEY = "CellId";
export const FOV_ID_KEY = "FOVId";
export const FOV_THUMBNAIL_PATH = "fovThumbnailPath";
export const FOV_VOLUME_VIEWER_PATH = "fovVolumeviewerPath";
export const THUMBNAIL_PATH = "thumbnailPath";
export const VOLUME_VIEWER_PATH = "volumeviewerPath";
export const TRANSFORM = "transform";
export const VOLE_PARAMS = "voleUrlParams";

export type FILE_INFO_KEY =
    | typeof CELL_ID_KEY
    | typeof FOV_ID_KEY
    | typeof THUMBNAIL_PATH
    | typeof VOLUME_VIEWER_PATH
    | typeof FOV_THUMBNAIL_PATH
    | typeof FOV_VOLUME_VIEWER_PATH;
// this defines the order they appear in the data files
export const FILE_INFO_KEYS = Object.freeze([
    CELL_ID_KEY,
    FOV_ID_KEY,
    GROUP_BY_KEY,
    THUMBNAIL_PATH,
    VOLUME_VIEWER_PATH,
    FOV_THUMBNAIL_PATH,
    FOV_VOLUME_VIEWER_PATH,
]);

export const DOWNLOAD_CONFIG_TYPE_PROTEIN = "protein";
export const DOWNLOAD_CONFIG_TYPE_SELECTION_SET = "selectionSet";
export const MITOTIC_STAGE_KEY = "interphase-and-mitotic-stages"; // TODO: add display info for thumbnail cards to file info so this won't be needed on the front end

export const MY_SELECTIONS_ID = 0;

export const DISABLE_COLOR = "#6e6e6e";
export const OFF_COLOR = "#000";

export const HEX_COLOR_REGEX = /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i;
const BASE_PALETTE_COLORS = {
    purple: "#8950d9",
    darkGray: "#313131",
    mediumDarkGray: "#4b4b4b",
    mediumGray: "#6e6e6e",
    lightGray: "#a0a0a0",
    extraLightGray: "#d8d8d8",
    brightGreen: "#b2d030",
    brightBlue: "#00a0ff",
    white: "#ffffff",
    translucentWhite: "#ffffffab",
} as const;

export const GENERAL_PLOT_SETTINGS = {
    backgroundColor: "#000",
    cellName: CELL_ID_KEY,
    chartParent: "ace-scatter-chart",
    circleRadius: 4,
    connectionLineWidth: 1.5,
    connectionLineDefaultColor: BASE_PALETTE_COLORS.mediumDarkGray as string,
    histogramColor: BASE_PALETTE_COLORS.lightGray,
    legend: {
        font: {
            color: BASE_PALETTE_COLORS.white,
        },
        orientation: "h" as const,
        y: 60,
    },
    margin: {
        b: 50,
        l: 60,
        r: 40,
        t: 10,
    },
    moveDropdownCutoffWidth: 370,
    heightMargin: 56 + 74 + 140, // header height + tab height + margins
    showLegendCutoffHeight: 635,
    showLegendCutoffWidth: 692,
    spikeColor: BASE_PALETTE_COLORS.translucentWhite,
    textColor: BASE_PALETTE_COLORS.white,
    unselectedCircleOpacity: 0.5,
};

export const NO_DOWNLOADS_TOOLTIP = "Direct download is not available for this dataset.";

export const PALETTE = {
    ...BASE_PALETTE_COLORS,
    headerGray: BASE_PALETTE_COLORS.mediumDarkGray,
    collapseHeaderGray: "#464646",
    collapseContentGray: BASE_PALETTE_COLORS.darkGray,
    galleryBackground: BASE_PALETTE_COLORS.mediumDarkGray + "d1",
    linkHover: BASE_PALETTE_COLORS.brightBlue,
} as const;
