import { parseViewerUrlParams, ViewerChannelSettings } from "@aics/vole-app";
import { Album } from "../..";
import * as Papa from "papaparse";
import {
    DataForPlot,
    MeasuredFeatureDef,
    FileInfo,
    MeasuredFeaturesOption,
    DiscreteMeasuredFeatureDef,
    ContinuousMeasuredFeatureDef,
} from "../../metadata/types";
import { ImageDataset, InitialDatasetSelections, Megaset } from "../types";
import firebase from "firebase/compat/app";
import {
    CELL_ID_KEY,
    FOV_ID_KEY,
    FOV_THUMBNAIL_PATH,
    FOV_VOLUME_VIEWER_PATH,
    GROUP_BY_KEY,
    THUMBNAIL_PATH,
    TRANSFORM,
    VOLE_PARAMS,
    VOLUME_VIEWER_PATH,
} from "../../../constants";
import { sortNumeric } from "../../util";
import { DEFAULT_CATEGORICAL_PALETTE } from "./constants";

export const DEFAULT_CSV_DATASET_KEY = "csv";
export const DEFAULT_GROUPBY_NONE = "_defaultGroupByNone";

const BFF_FILE_ID_KEY = "File ID";
const BFF_THUMBNAIL_PATH_KEY = "Thumbnail";
const BFF_FILE_PATH_KEY = "File Path";
const BFF_DEFAULT_GROUP_BY_KEY = "Cell Line";
const BFF_FILENAME_KEY = "File Name";
const BFF_FILE_SIZE_KEY = "File Size";
const BFF_UPLOADED_KEY = "Uploaded";

// FMS keys are identical to BFF keys but use snake_case
const FMS_FILE_ID_KEY = "file_id";
const FMS_THUMBNAIL_PATH_KEY = "thumbnail";
const FMS_FILE_PATH_KEY = "file_path";
const FMS_FILENAME_KEY = "file_name";
const FMS_FILE_SIZE_KEY = "file_size";
const FMS_UPLOADED_KEY = "uploaded";

/**
 * Optional column containing Vol-E URL query parameters, which will be applied
 * to the file when opened in the 3D viewer. This can either be a full Vol-E URL
 * (`https://vole.allencell.org/viewer?<params>`) or just the query parameters
 * (`?<params>` or `<params>`).
 *
 * The full list of supported parameters is available in the Vol-E
 * documentation:
 * https://github.com/allen-cell-animated/vole-app/blob/main/documentation/URL_SPEC.md
 */
const LINK_PATH_KEY = "Link Path";

const METADATA_KEYS = new Set([
    CELL_ID_KEY,
    FOV_ID_KEY,
    FOV_THUMBNAIL_PATH,
    FOV_VOLUME_VIEWER_PATH,
    THUMBNAIL_PATH,
    VOLUME_VIEWER_PATH,
    TRANSFORM,
    BFF_FILE_ID_KEY,
    BFF_THUMBNAIL_PATH_KEY,
    BFF_FILE_PATH_KEY,
    BFF_FILENAME_KEY,
    BFF_FILE_SIZE_KEY,
    BFF_UPLOADED_KEY,
    FMS_FILE_PATH_KEY,
    FMS_FILENAME_KEY,
    FMS_FILE_ID_KEY,
    FMS_THUMBNAIL_PATH_KEY,
    FMS_FILE_SIZE_KEY,
    FMS_UPLOADED_KEY,
    LINK_PATH_KEY,
]);

const enum FeatureType {
    CONTINUOUS,
    DISCRETE,
}

type FeatureInfo =
    | {
          type: FeatureType.CONTINUOUS;
          def: ContinuousMeasuredFeatureDef;
          data: (number | null)[];
      }
    | {
          type: FeatureType.DISCRETE;
          def: DiscreteMeasuredFeatureDef;
          data: (number | null)[];
      };

type FeatureData = (number | null)[] | (string | null)[];

/**
 * Returns true if and only if a value is `null` or a numeric string (including
 * "NaN" or "nan").
 */
function isNullOrNumericString(value: string | null): boolean {
    if (value === null) {
        return true;
    } else if (typeof value != "string") {
        return false;
    } else if (value.trim().toLowerCase() === "nan") {
        // String values that match "NaN" or "nan" can be considered as numbers.
        return true;
    }

    // Catch string values that are not numbers (but aren't explicitly "NaN" or
    // "nan")
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
}

/**
 * Determines whether a feature data object is a string array (vs. a number array).
 * If all values are `null`, returns false.
 */
function isStringArray(data: FeatureData): data is (string | null)[] {
    // Find first non-null value and determine type from it
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== null) {
            return typeof data[i] === "string";
        }
    }
    return false;
}

/**
 * Returns true if the feature data array contains at least one non-null value.
 * If all values are `null` (or the array is empty), returns false.
 */
function isValidFeatureArray(data: FeatureData): boolean {
    if (data.length === 0) {
        return false;
    }
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== null) {
            return true;
        }
    }
    return false;
}

/**
 * Parses and mocks an ImageDataset from a provided CSV string with a header row.
 *
 * The CSV must contain:
 * - URL paths to volume data, under the column name "volumeViewerPath" or "File Path"
 *
 * Optionally, the CSV can contain:
 * - Thumbnail paths, under the column name "thumbnailPath" or "Thumbnail"
 * - Cell IDs, under the column name "CellId" or "File ID"
 * - FOV IDs, under the column name "FOVId"
 * - FOV thumbnail paths, under the column name "fovThumbnailPath"
 * - FOV volume data, under the column name "fovVolumeviewerPath"
 *
 * Some data will be ignored by default:
 * - Transform data, under the column name "transform"
 * - Filename, under the column name "File Name"
 * - File size, under the column name "File Size"
 * - Uploaded, a 0/1 flag stored under the column name "Uploaded"
 *
 * Any other columns will be interpreted as features:
 * - Columns containing only number and `null` values will be treated as numeric ("continuous") data.
 *   (note: `NaN` values are allowed.)
 * - Columns containing ANY non-numeric or non-null data will be treated as
 *   category ("discrete") data.
 */
class CsvRequest implements ImageDataset {
    csvData: Record<string, string>[];
    idToIndex: Record<string, number>;
    featureInfo: Map<string, FeatureInfo>;

    defaultGroupByFeatureKey: string;

    constructor(csvFileContents: string) {
        this.csvData = [];
        this.idToIndex = {};
        this.featureInfo = new Map();
        this.defaultGroupByFeatureKey = "";
        this.parseCsvData(csvFileContents);
    }

    /**
     * Returns all of the column names that are not empty or reserved for metadata,
     * with the assumption that they are features.
     */
    private getFeatureKeysFromColumnNames(csvData: Record<string, string>[]): string[] {
        const keys = Object.keys(csvData[0]);
        return keys.filter((key) => !METADATA_KEYS.has(key) && key !== "");
    }

    /**
     * Used for default initialization. Returns the feature key at the given index,
     * clamped to the length of the features array.
     */
    private getFeatureKeyClamped(featureKeys: string[], index: number): string {
        const lastIndex = featureKeys.length - 1;
        return featureKeys[Math.min(Math.max(index, 0), lastIndex)];
    }

    private getFeatureKeysByTerm(featureKeys: string[], term: string): string {
        return featureKeys.find((key) => key.toLowerCase().includes(term.toLowerCase())) ?? "";
    }

    /**
     * Returns the feature data as a map from the feature name to a array of either
     * numeric or string values.
     */
    private getFeatureDataAsColumns(
        csvData: Record<string, string>[],
        featureKeys: string[]
    ): Map<string, FeatureData> {
        const featureData = new Map<string, FeatureData>();
        for (const key of featureKeys) {
            const rawValues: (string | null)[] = [];
            let isContinuous = true;
            for (const row of csvData) {
                const value = row[key] ?? null;
                if (value === null || (typeof value === "string" && value.trim() === "")) {
                    rawValues.push(null);
                } else {
                    rawValues.push(value);
                    if (!isNullOrNumericString(value)) {
                        isContinuous = false;
                    }
                }
            }

            if (isContinuous) {
                // Feature is continuous, parse all values as numeric
                // TODO: Handle empty/blank values
                const values = rawValues.map((val) => (val ? Number.parseFloat(val) : null));
                featureData.set(key, values);
            } else {
                // Feature is discrete, return directly
                featureData.set(key, rawValues);
            }
        }
        return featureData;
    }

    private parseDiscreteFeature(
        key: string,
        data: (string | null)[]
    ): { def: DiscreteMeasuredFeatureDef; data: (number | null)[] } {
        const remappedValues: (number | null)[] = [];

        // Sort unique string values and assign each a numeric index.
        const uniqueValues = new Set<string>();
        for (const value of data) {
            if (value !== null) {
                uniqueValues.add(value.trim());
            }
        }
        const values = sortNumeric(Array.from(uniqueValues), (value) => value);
        const strValueToIndex = new Map<string, { index: number; count: number }>(
            values.map((value, index) => [value, { index, count: 0 }])
        );

        // Iterate through all values and count them. Replace the values with their
        // corresponding index.
        for (let i = 0; i < data.length; i++) {
            const rawValue = data[i];
            if (rawValue === null) {
                remappedValues.push(null);
                continue;
            }
            const value = rawValue.trim();
            const indexInfo = strValueToIndex.get(value);
            if (!indexInfo) {
                // All values will already be in the map; this will not be
                // reachable.
                remappedValues.push(null);
                continue;
            }
            indexInfo.count++;
            remappedValues.push(indexInfo.index);
        }

        const options: Record<string, MeasuredFeaturesOption> = {};
        for (const [value, { index, count }] of strValueToIndex.entries()) {
            options[index.toString()] = {
                color: DEFAULT_CATEGORICAL_PALETTE[index % DEFAULT_CATEGORICAL_PALETTE.length],
                name: value,
                key: value,
                count: count,
            };
        }

        return {
            def: {
                discrete: true,
                displayName: key,
                description: key,
                key,
                options,
                tooltip: key,
            },
            data: remappedValues,
        };
    }

    private parseFeatures(csvData: Record<string, string>[]): void {
        this.featureInfo.clear();

        const featureKeys = this.getFeatureKeysFromColumnNames(csvData);
        const rawFeatureData = this.getFeatureDataAsColumns(csvData, featureKeys);

        for (const key of featureKeys) {
            const data = rawFeatureData.get(key);
            if (!data || !isValidFeatureArray(data)) {
                continue;
            }
            if (isStringArray(data)) {
                const { def, data: discreteData } = this.parseDiscreteFeature(key, data);
                this.featureInfo.set(key, {
                    type: FeatureType.DISCRETE,
                    def,
                    data: discreteData,
                });
            } else {
                const def: ContinuousMeasuredFeatureDef = {
                    discrete: false,
                    displayName: key,
                    description: key,
                    key,
                    tooltip: key,
                };
                this.featureInfo.set(key, {
                    type: FeatureType.CONTINUOUS,
                    def,
                    data: data,
                });
            }
        }

        // TODO: Feature defs can include units. Should we strip that from the feature column name?
    }

    /**
     * Assigns a default group-by feature key for the dataset. Datasets must have a
     * discrete group-by feature or CFE will crash.
     *
     * Key is chosen in the following order:
     * 1. Default BFF group by key ("Cell Line") if it exists
     * 2. First discrete feature key if it exists
     * 3. A default bin feature if no discrete feature exists
     */
    private assignDefaultGroupByFeatureKey(csvData: Record<string, string>[]): void {
        // Check if the BFF-specific default group-by feature exists.
        const firstRow = csvData[0];
        if (firstRow && firstRow[BFF_DEFAULT_GROUP_BY_KEY] !== undefined) {
            this.defaultGroupByFeatureKey = BFF_DEFAULT_GROUP_BY_KEY;
            return;
        }

        // If not, assign the first discrete feature as the default group-by feature if it exists.
        const firstDiscreteFeature = Array.from(this.featureInfo.values()).find(
            (info) => info.type === FeatureType.DISCRETE
        );
        if (firstDiscreteFeature) {
            this.defaultGroupByFeatureKey = firstDiscreteFeature.def.key;
            return;
        }

        // If no discrete feature is found, assign a default group-by feature.
        const options: Record<string, MeasuredFeaturesOption> = {
            "0": {
                color: DEFAULT_CATEGORICAL_PALETTE[0],
                name: "Default",
                key: "0",
                count: csvData.length,
            },
        };
        this.featureInfo.set(DEFAULT_GROUPBY_NONE, {
            type: FeatureType.DISCRETE,
            def: {
                discrete: true,
                displayName: "(None)",
                description: "(None)",
                key: DEFAULT_GROUPBY_NONE,
                tooltip: "(None)",
                options,
            },
            data: new Array(csvData.length).fill(0),
        });
        this.defaultGroupByFeatureKey = DEFAULT_GROUPBY_NONE;
    }

    /**
     * Copies the value of a column to another column if the destination column is empty.
     * Returns whether the column was copied.
     */
    private copyColumnIfEmpty(
        row: Record<string, string>,
        columnSrc: string,
        columnDst: string
    ): boolean {
        if (
            row[columnSrc] !== undefined &&
            (row[columnDst] === undefined || row[columnDst] === "")
        ) {
            row[columnDst] = row[columnSrc];
            return true;
        }
        return false;
    }

    private remapBffOrFmsKeys = (row: Record<string, string>): void => {
        // Use File ID preferentially, but fall back to Filename if File ID is empty
        const didCopyBffFileIdKey = this.copyColumnIfEmpty(row, BFF_FILE_ID_KEY, CELL_ID_KEY);
        const didCopyFmsFileIdKey = this.copyColumnIfEmpty(row, FMS_FILE_ID_KEY, CELL_ID_KEY);
        if (!didCopyBffFileIdKey && !didCopyFmsFileIdKey) {
            this.copyColumnIfEmpty(row, BFF_FILENAME_KEY, CELL_ID_KEY);
            this.copyColumnIfEmpty(row, FMS_FILENAME_KEY, CELL_ID_KEY);
        }
        this.copyColumnIfEmpty(row, BFF_THUMBNAIL_PATH_KEY, THUMBNAIL_PATH);
        this.copyColumnIfEmpty(row, FMS_THUMBNAIL_PATH_KEY, THUMBNAIL_PATH);
        this.copyColumnIfEmpty(row, BFF_FILE_PATH_KEY, VOLUME_VIEWER_PATH);
        this.copyColumnIfEmpty(row, FMS_FILE_PATH_KEY, VOLUME_VIEWER_PATH);
    };

    private parseCsvData(csvDataSrc: string): void {
        // TODO: handle URLs and files here: they need to be handled via async callbacks.
        // https://www.papaparse.com/docs#strings
        const config: Papa.ParseConfig = {
            header: true,
            transformHeader: (header: string) => header.trim(),
            skipEmptyLines: "greedy", // skips whitespace-only lines
        };
        const result = Papa.parse(csvDataSrc, config).data as Record<string, string>[];
        this.csvData = result as Record<string, string>[];

        // Some assertion tests, throw errors if data can't be parsed
        if (this.csvData.length === 0) {
            throw new Error("No data found in CSV");
        }

        // Map certain BFF/FMS keys to the standard keys
        for (let i = 0; i < this.csvData.length; i++) {
            this.remapBffOrFmsKeys(this.csvData[i]);
        }

        // Check if all rows have a cell ID. If not, we must use the row index
        // instead to prevent duplicate values from being added to the map.
        let useOriginalKey = true;
        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            if (row[CELL_ID_KEY] === undefined || row[CELL_ID_KEY].trim() === "") {
                useOriginalKey = false;
                break;
            }
        }

        // Map from cell IDs to row index. If no cell ID is provided, assign the row number.
        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            if (!useOriginalKey) {
                row[CELL_ID_KEY] = i.toString();
            }
            this.idToIndex[row[CELL_ID_KEY].trim()] = i;
        }

        this.parseFeatures(this.csvData);
        this.assignDefaultGroupByFeatureKey(this.csvData);
    }

    selectDataset(): Promise<InitialDatasetSelections> {
        const featureKeys = Array.from(this.featureInfo.keys());
        return Promise.resolve({
            defaultXAxis: this.getFeatureKeyClamped(featureKeys, 0),
            defaultYAxis: this.getFeatureKeyClamped(featureKeys, 1),
            defaultColorBy: this.defaultGroupByFeatureKey,
            defaultGroupBy: this.defaultGroupByFeatureKey,
            // Attempt to find a feature representing time for line drawing.
            defaultConnectBy:
                this.getFeatureKeysByTerm(featureKeys, "time") ||
                this.getFeatureKeysByTerm(featureKeys, "frame") ||
                this.getFeatureKeyClamped(featureKeys, 2),
            // TODO: Provide the containing folder of the CSV if the values for the columns (thumbnails,
            // downloads, volumes) are relative paths and not HTTPS URLs.
            thumbnailRoot: "",
            downloadRoot: "",
            volumeViewerDataRoot: "",
        });
    }

    getAvailableDatasets(): Promise<Megaset[]> {
        // Only has one dataset (imported CSV)
        const fakeSet: Megaset = {
            name: "csv",
            title: "CSV Dataset",
            production: false,
            dateCreated: firebase.firestore.Timestamp.now(),
            datasets: {
                csv: {
                    name: "csv",
                    title: "CSV Dataset",
                    version: "1",
                    id: DEFAULT_CSV_DATASET_KEY,
                    description: "A dataset imported from a CSV file",
                    index: 0,
                    userData: {},
                },
            },
        };

        return Promise.resolve([fakeSet]);
    }

    getViewerChannelSettings(): Promise<ViewerChannelSettings> {
        // By default, enable first three channels
        // TODO: Have this constant be exposed by w3cv?
        return Promise.resolve({
            groups: [
                {
                    name: "Channels",
                    channels: [
                        { match: [0, 1, 2], enabled: true },
                        { match: "(.+)", enabled: false },
                    ],
                },
            ],
        });
    }

    private getFeatureKeyToData(): Record<string, (number | null)[]> {
        const featureKeyToData: Record<string, (number | null)[]> = {};
        for (const [key, info] of this.featureInfo.entries()) {
            featureKeyToData[key] = info.data;
        }
        return featureKeyToData;
    }

    getFeatureData(): Promise<DataForPlot> {
        const indices = this.csvData.map((_row, index) => index);
        const values: Record<string, (number | null)[]> = this.getFeatureKeyToData();
        const thumbnailPaths = [];
        const cellIds = [];
        const sourcePaths = [];

        for (let i = 0; i < indices.length; i++) {
            const row = this.csvData[i];
            // Copy label data
            cellIds.push(row[CELL_ID_KEY]);
            thumbnailPaths.push(row[THUMBNAIL_PATH] || "");
            sourcePaths.push(row[VOLUME_VIEWER_PATH] || row[FOV_VOLUME_VIEWER_PATH] || "");
        }

        return Promise.resolve({
            indices,
            values,
            labels: {
                thumbnailPaths,
                cellIds,
                sourcePaths,
            },
        });
    }

    getAlbumData(): Promise<Album[]> {
        return Promise.resolve([]);
    }

    getMeasuredFeatureDefs(): Promise<MeasuredFeatureDef[]> {
        const featureDefsArray = Array.from(this.featureInfo.values()).map((info) => info.def);
        return Promise.resolve(featureDefsArray);
    }

    async getFileInfoByCellId(id: string): Promise<FileInfo | undefined> {
        const rowIndex = this.idToIndex[id];
        if (rowIndex === undefined) {
            return Promise.resolve(undefined);
        }
        const data = this.csvData[rowIndex];

        if (!data) {
            return Promise.resolve(undefined);
        }
        // Extract vole parameters from column if it exists
        let voleUrlParams: FileInfo[typeof VOLE_PARAMS];
        if (data[LINK_PATH_KEY]) {
            const split = data[LINK_PATH_KEY].split("?");
            // Get the last element after the last "?", which also works if
            // there is no "?". Note that this may not be safe if the URL
            // contains unescaped "?" characters in the query parameters
            // themselves, but this is non-standard.
            const queryParamString = split[split.length - 1] || "";
            voleUrlParams = await parseViewerUrlParams(queryParamString);
        }
        const fileInfo = {
            [CELL_ID_KEY]: data[CELL_ID_KEY],
            [FOV_ID_KEY]: data[FOV_ID_KEY],
            [FOV_THUMBNAIL_PATH]: data[FOV_THUMBNAIL_PATH],
            [FOV_VOLUME_VIEWER_PATH]: data[FOV_VOLUME_VIEWER_PATH],
            [THUMBNAIL_PATH]: data[THUMBNAIL_PATH],
            [VOLUME_VIEWER_PATH]: data[VOLUME_VIEWER_PATH],
            [GROUP_BY_KEY]: data[GROUP_BY_KEY] || this.defaultGroupByFeatureKey,
            [VOLE_PARAMS]: voleUrlParams,
        };
        return fileInfo;
    }

    async getFileInfoByArrayOfCellIds(ids: string[]): Promise<(FileInfo | undefined)[]> {
        const promises = ids.map((id) => this.getFileInfoByCellId(id));
        return Promise.all(promises);
    }
}

export default CsvRequest;
