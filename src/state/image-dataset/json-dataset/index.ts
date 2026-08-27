import axios, { AxiosResponse } from "axios";

import {
    FILE_INFO_KEYS,
    CELL_ID_KEY,
    FILE_INFO_KEY,
    ARRAY_OF_CELL_IDS_KEY,
} from "../../../constants";

import {
    DataForPlot,
    FileInfo,
    MappingOfMeasuredValuesArrays,
    MeasuredFeatureDef,
} from "../../metadata/types";

import { ImageDataset, DatasetMetaData, Megaset, InitialDatasetSelections } from "../types";
import { ViewerChannelSettings } from "@aics/vole-app";

interface DatasetInfo {
    name: string;
    version: string;
    id: string;
    image: string;
    description: string;
    userData: { [propName: string]: any };
    featureDefsPath: string;
    featuresDataPath: string;
    viewerSettingsPath: string;
    albumPath: string;
    thumbnailRoot: string;
    downloadRoot: string;
    volumeViewerDataRoot: string;
    xAxis: {
        default: string;
    };
    yAxis: {
        default: string;
    };
    colorBy: {
        default: string;
    };
    groupBy: {
        default: string;
    };
    featuresDisplayOrder: string[];
    featuresDataOrder: string[];
}

class JsonRequest implements ImageDataset {
    private listOfDatasetsDoc: string;
    private fileInfo: { [key: string]: FileInfo } = {};
    private viewerChannelSettings?: ViewerChannelSettings;
    private featureDefs?: MeasuredFeatureDef[];

    private dataPromise?: Promise<DataForPlot>;

    private datasetInfo: DatasetInfo;

    constructor() {
        this.datasetInfo = {
            name: "",
            version: "",
            id: "",
            image: "",
            description: "",
            userData: {},
            featureDefsPath: "",
            featuresDataPath: "",
            viewerSettingsPath: "",
            albumPath: "",
            thumbnailRoot: "",
            downloadRoot: "",
            volumeViewerDataRoot: "",
            xAxis: {
                default: "",
            },
            yAxis: {
                default: "",
            },
            colorBy: {
                default: "",
            },
            groupBy: {
                default: "",
            },
            featuresDisplayOrder: [],
            featuresDataOrder: [],
        };

        // for now this particular file must be kept up to date.
        // dev-aics-dtp-001/cfedata is the designated repository of internal cfe data sets
        // this datasets.json contains a list of the names of subdirectories (strings),
        // each of which is expected to contain a dataset.json file
        this.listOfDatasetsDoc =
            "http://dev-aics-dtp-001.corp.alleninstitute.org/cfedata/cell-feature-data/datasets.json";
    }

    public getAvailableDatasets = async (): Promise<Megaset[]> => {
        const metadata: AxiosResponse = await axios.get(`${this.listOfDatasetsDoc}`);
        const datadir = this.listOfDatasetsDoc.substring(
            0,
            this.listOfDatasetsDoc.lastIndexOf("/")
        );

        return Promise.all(
            (metadata.data as string[]).map(async (datasetdir) => {
                const datasetdirpath = `${datadir}/${datasetdir}`;
                const fullurl = `${datasetdirpath}/dataset.json`;
                const dataset: AxiosResponse = await axios.get(fullurl);
                const megaset = dataset.data as Megaset;
                if (megaset.datasets) {
                    ///////////////////////////
                    // TODO handle megasets from json flat file data
                    ///////////////////////////
                    console.log("has datasets; unexpected; dropping");
                    return {} as Megaset;
                } else {
                    // If there is no `datasets` field, then megaset is a single dataset.
                    // We need to convert it into a Megaset that has itself as the only dataset.
                    const dataset = megaset as unknown as DatasetMetaData;
                    const id = `${megaset.name}_v${dataset.version}`;
                    const megasetInfo = {
                        ...megaset,
                        publications: megaset.publications || [],
                        extra: megaset.extra || "",
                        name: id,
                        datasets: {
                            [id]: {
                                ...dataset,
                                id: id,
                                image: `${datasetdirpath}/${dataset.image}`,
                                manifest: `${datasetdirpath}/dataset.json`,
                            },
                        },
                    } as Megaset;

                    if (!megasetInfo.dateCreated) {
                        console.error(
                            "dataset has no dateCreated and jsonDataset doesn't know how to create one"
                        );
                    }

                    return megasetInfo;
                }
            })
        );
    };

    private fixupPaths = (datasetInfo: DatasetInfo, datadir: string) => {
        if (datasetInfo.albumPath && !datasetInfo.albumPath.startsWith("http")) {
            datasetInfo.albumPath = `${datadir}/${datasetInfo.albumPath}`;
        }
        if (datasetInfo.featureDefsPath && !datasetInfo.featureDefsPath.startsWith("http")) {
            datasetInfo.featureDefsPath = `${datadir}/${datasetInfo.featureDefsPath}`;
        }
        if (datasetInfo.featuresDataPath && !datasetInfo.featuresDataPath.startsWith("http")) {
            datasetInfo.featuresDataPath = `${datadir}/${datasetInfo.featuresDataPath}`;
        }
        if (datasetInfo.viewerSettingsPath && !datasetInfo.viewerSettingsPath.startsWith("http")) {
            datasetInfo.viewerSettingsPath = `${datadir}/${datasetInfo.viewerSettingsPath}`;
        }
        if (datasetInfo.thumbnailRoot && !datasetInfo.thumbnailRoot.startsWith("http")) {
            datasetInfo.thumbnailRoot = `${datadir}/${datasetInfo.thumbnailRoot}`;
        }
        if (datasetInfo.downloadRoot && !datasetInfo.downloadRoot.startsWith("http")) {
            datasetInfo.downloadRoot = `${datadir}/${datasetInfo.downloadRoot}`;
        }
        if (
            datasetInfo.volumeViewerDataRoot &&
            !datasetInfo.volumeViewerDataRoot.startsWith("http")
        ) {
            datasetInfo.volumeViewerDataRoot = `${datadir}/${datasetInfo.volumeViewerDataRoot}`;
        }
    };
    public selectDataset = (manifestPath: string): Promise<InitialDatasetSelections> => {
        // clear locally cached data.
        this.viewerChannelSettings = undefined;

        const datadir = manifestPath.substring(0, manifestPath.lastIndexOf("/"));

        return axios.get(`${manifestPath}`).then((metadata: AxiosResponse) => {
            const { data } = metadata;
            this.datasetInfo = data as DatasetInfo;
            this.fixupPaths(this.datasetInfo, datadir);
            return {
                defaultXAxis: data.xAxis?.default || "",
                defaultYAxis: data.yAxis?.default || "",
                defaultColorBy: data.colorBy?.default || "",
                defaultGroupBy: data.groupBy?.default || "",
                defaultConnectBy: data.connectBy?.default || "",
                thumbnailRoot: data.thumbnailRoot || "",
                downloadRoot: data.downloadRoot || "",
                volumeViewerDataRoot: data.volumeViewerDataRoot || "",
            };
        });
    };

    private getJson = (docName: string) => {
        return axios.get(`${docName}`).then((metadata: AxiosResponse) => metadata.data);
    };

    public getViewerChannelSettings = () => {
        if (this.viewerChannelSettings) {
            return Promise.resolve(this.viewerChannelSettings);
        }
        return this.getJson(this.datasetInfo.viewerSettingsPath).then((data) => {
            this.viewerChannelSettings = data as ViewerChannelSettings;
            // fixup for missing data
            if (!this.viewerChannelSettings.groups) {
                this.viewerChannelSettings.groups = [
                    { name: "Channels", channels: [{ match: "(.+)", enabled: true }] },
                ];
            }
            return this.viewerChannelSettings;
        });
    };

    public getMeasuredFeatureDefs = async () => {
        if (this.featureDefs) {
            return Promise.resolve(this.featureDefs);
        }
        return this.getJson(this.datasetInfo.featureDefsPath).then((featureDefs) => {
            this.featureDefs = featureDefs as MeasuredFeatureDef[];
            return this.featureDefs;
        });
    };

    public getFeatureData = async () => {
        if (this.dataPromise) {
            return this.dataPromise;
        }

        // ASSUME cell line defs AND feature defs are already loaded by the time the feature data arrives

        let featureKeys = [];
        const featureDefs = await this.getMeasuredFeatureDefs();
        featureKeys = featureDefs.map((ele) => ele.key);
        if (
            !this.datasetInfo.featuresDataOrder ||
            this.datasetInfo.featuresDataOrder.length === 0
        ) {
            this.datasetInfo.featuresDataOrder = featureKeys;
        }
        // if display order is not provided, then use data order as display order.
        if (this.datasetInfo.featuresDisplayOrder.length === 0) {
            this.datasetInfo.featuresDisplayOrder = this.datasetInfo.featuresDataOrder.slice();
        }
        const dataMappedByMeasuredFeatures = this.datasetInfo.featuresDisplayOrder.reduce(
            (acc, featureName: string) => {
                const initArray: number[] = [];
                acc[featureName] = initArray;
                return acc;
            },
            {} as MappingOfMeasuredValuesArrays
        );

        const thumbnails: string[] = [];
        const ids: string[] = [];
        const indices: number[] = [];
        this.dataPromise = this.getJson(this.datasetInfo.featuresDataPath).then(
            (featureDataArray) => {
                featureDataArray.forEach((el: any, index: number) => {
                    indices.push(index);
                    // FILE INFO
                    // number of file info property names must be same as number of file_info entries in data
                    if (FILE_INFO_KEYS.length !== el.file_info.length) {
                        throw new Error("Bad number of file_info entries in data");
                    }
                    // convert file_info array to obj
                    const fileInfo = {} as FileInfo;
                    el.file_info.forEach((f: string, i: number) => {
                        const key = FILE_INFO_KEYS[i] as FILE_INFO_KEY;

                        fileInfo[key] = f as never;
                    });
                    this.fileInfo[fileInfo[CELL_ID_KEY].toString()] = fileInfo;

                    // FEATURE DATA
                    // number of feature defs must be same as number of features
                    if (featureDefs.length !== el.features.length) {
                        throw new Error("Bad number of feature entries in data");
                    }

                    el.features.forEach((value: number, index: number) => {
                        const arrayOfValues = dataMappedByMeasuredFeatures[
                            this.datasetInfo.featuresDataOrder[index]
                        ] as (number | null)[];
                        if (isNaN(value)) {
                            arrayOfValues.push(null);
                        } else {
                            arrayOfValues.push(Number(value));
                        }
                    }, {});
                    thumbnails.push(fileInfo.thumbnailPath);
                    ids.push(fileInfo[CELL_ID_KEY].toString());
                }, this);
                return {
                    indices: indices,
                    values: dataMappedByMeasuredFeatures,
                    labels: {
                        thumbnailPaths: thumbnails,
                        [ARRAY_OF_CELL_IDS_KEY]: ids,
                    },
                };
            }
        );
        return this.dataPromise;
    };

    public getFileInfoByCellId = (cellId: string) => {
        const fileInfo = this.fileInfo[cellId];
        // wrapped to match the return type on the database implementation
        // convert ides to string to match front end data structure where all ids are strings
        return Promise.resolve({
            ...fileInfo,
            CellId: fileInfo.CellId.toString(),
            FOVId: fileInfo.FOVId.toString(),
        });
    };

    public getFileInfoByArrayOfCellIds = (cellIds: string[]) => {
        return Promise.all(
            cellIds.map((id) => {
                return this.getFileInfoByCellId(id);
            })
        );
    };

    public getAlbumData = () => {
        if (!this.datasetInfo.albumPath) {
            return Promise.resolve([]);
        }
        return this.getJson(this.datasetInfo.albumPath);
    };
}

export default JsonRequest;
