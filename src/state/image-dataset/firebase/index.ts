import {
    DocumentReference,
    QueryDocumentSnapshot,
    QuerySnapshot,
    DocumentData,
} from "@firebase/firestore-types";
import axios, { AxiosResponse } from "axios";
import { reduce } from "lodash";

import { isDevOrStagingSite } from "../../../util";
import { FileInfo, MappingOfMeasuredValuesArrays, MeasuredFeatureDef } from "../../metadata/types";
import { Album } from "../../types";
import { ImageDataset, DatasetMetaData, Megaset } from "../types";
import { firestore } from "./configure-firebase";
import { ViewerChannelSettings } from "@aics/vole-app";

class FirebaseRequest implements ImageDataset {
    private collectionRef: DocumentReference;
    private featuresDataPath: string;
    private cellLineDataPath: string;
    private viewerSettingsPath: string;
    private thumbnailRoot: string;
    private downloadRoot: string;
    private volumeViewerDataRoot: string;
    private featuresDisplayOrder: string[];
    private datasetId: string;
    private fileInfoPath: string;
    private featuresDataOrder: string[];
    private albumPath: string;
    private featureDefsPath: string;
    private viewerChannelSettings?: ViewerChannelSettings;
    constructor() {
        this.featuresDataPath = "";
        this.viewerSettingsPath = "";
        this.cellLineDataPath = "";
        this.thumbnailRoot = "";
        this.downloadRoot = "";
        this.volumeViewerDataRoot = "";
        this.featuresDisplayOrder = [];
        this.fileInfoPath = "";
        this.datasetId = "";
        this.featuresDataOrder = [];
        this.albumPath = "";
        this.featureDefsPath = "";
        this.collectionRef = firestore.collection("cfe-datasets").doc("v1");
    }

    private getDoc = (docPath: string) => {
        return firestore.doc(docPath).get();
    };

    private getCollection = (collection: string) => {
        return firestore.collection(collection).get();
    };

    public getAvailableDatasets = () => {
        return firestore
            .collection("dataset-descriptions")
            .get()
            .then((snapShot: QuerySnapshot) => {
                const megasets: Megaset[] = [];
                snapShot.forEach((megasetDoc) => {
                    const megaset = megasetDoc.data() as Megaset;
                    const initialDatasetObj: { [key: string]: DatasetMetaData } = {};
                    megaset.datasets = reduce(
                        megaset.datasets,
                        (acc, dataset: DatasetMetaData, key) => {
                            dataset.id = key;
                            /** if running the site in a local development env or on staging.cfe.allencell.org
                             * include all cards, otherwise, only include cards with a production flag.
                             * this is based on hostname instead of a build time variable so we don't
                             * need a separate build for staging and production
                             */
                            if (isDevOrStagingSite(location.hostname)) {
                                acc[key] = dataset;
                            } else if (dataset.production) {
                                acc[key] = dataset;
                            }
                            return acc;
                        },
                        initialDatasetObj
                    );
                    if (isDevOrStagingSite(location.hostname)) {
                        megasets.push(megaset);
                    } else if (megaset.production) {
                        megasets.push(megaset);
                    }
                });
                return megasets;
            });
    };

    private setCollectionRef = (id: string) => {
        this.collectionRef = firestore.collection("cfe-datasets").doc(id);
    };

    private getManifest = (ref: string) => {
        return firestore
            .doc(ref)
            .get()
            .then((manifestDoc: DocumentData) => {
                return manifestDoc.data();
            });
    };

    public selectDataset = (ref: string) => {
        // clear locally cached data.
        this.viewerChannelSettings = undefined;

        return this.getManifest(ref).then(
            (data: {
                featuresDataPath: string;
                viewerSettingsPath: string;
                thumbnailRoot: string;
                downloadRoot: string;
                volumeViewerDataRoot: string;
                featuresDisplayOrder: string[];
                fileInfoPath: string;
                featuresDataOrder: string[];
                featureDefsPath: string;
                albumPath: string;
                xAxis: { default: any };
                yAxis: { default: any };
                colorBy: { default: any };
                groupBy: { default: any };
                connectBy?: { default: any };
            }) => {
                this.featuresDataPath = data.featuresDataPath;
                this.viewerSettingsPath = data.viewerSettingsPath;
                this.thumbnailRoot = data.thumbnailRoot;
                this.downloadRoot = data.downloadRoot;
                this.volumeViewerDataRoot = data.volumeViewerDataRoot;
                this.featuresDisplayOrder = data.featuresDisplayOrder;
                this.fileInfoPath = data.fileInfoPath;
                this.featuresDataOrder = data.featuresDataOrder;
                this.featureDefsPath = data.featureDefsPath;
                this.albumPath = data.albumPath;
                return {
                    defaultXAxis: data.xAxis.default,
                    defaultYAxis: data.yAxis.default,
                    defaultColorBy: data.colorBy.default,
                    defaultGroupBy: data.groupBy.default,
                    defaultConnectBy: data.connectBy?.default || "",
                    thumbnailRoot: data.thumbnailRoot,
                    downloadRoot: data.downloadRoot,
                    volumeViewerDataRoot: data.volumeViewerDataRoot,
                };
            }
        );
    };

    public getViewerChannelSettings = () => {
        if (this.viewerChannelSettings) {
            return Promise.resolve(this.viewerChannelSettings);
        }
        if (!this.viewerSettingsPath) {
            return Promise.resolve({} as ViewerChannelSettings);
        }
        return axios
            .get(this.viewerSettingsPath)
            .then((metadata: AxiosResponse) => metadata.data)
            .then((viewerSettingsData) => {
                this.viewerChannelSettings = viewerSettingsData as ViewerChannelSettings;
                return this.viewerChannelSettings;
            });
    };

    private requestSetOfFeatureDefs = async (
        featuresLeftToRequest: string[],
        dataset: MeasuredFeatureDef[]
    ): Promise<void> => {
        // Firebase limits the array to ten items, so will need to make multiple requests for
        // more features
        const batchToRequest = featuresLeftToRequest.splice(0, 10);
        const snapshot = await firestore
            .collection(this.featureDefsPath)
            .where("key", "in", batchToRequest)
            .get();

        snapshot.forEach((doc: QueryDocumentSnapshot) => {
            const data = doc.data() as MeasuredFeatureDef;
            const key = data.key;
            const index = this.featuresDisplayOrder.indexOf(key);
            dataset[index] = data;
        });
        if (featuresLeftToRequest.length) {
            return this.requestSetOfFeatureDefs(featuresLeftToRequest, dataset);
        }
    };

    public getMeasuredFeatureDefs = async () => {
        const listOfFeatureKeys = [...this.featuresDisplayOrder];
        const dataset: MeasuredFeatureDef[] = [];
        await this.requestSetOfFeatureDefs(listOfFeatureKeys, dataset);
        return dataset;
    };

    public getFeatureData = () => {
        return axios
            .get(this.featuresDataPath)
            .then((metadata: AxiosResponse) => metadata.data)
            .then((featureData) => {
                const dataMappedByMeasuredFeatures = this.featuresDisplayOrder.reduce(
                    (acc, featureName: string) => {
                        const initArray: number[] = [];
                        acc[featureName] = initArray;
                        return acc;
                    },
                    {} as MappingOfMeasuredValuesArrays
                );
                const groupByArray: string[] = [];
                const thumbnails: string[] = [];
                const indices: number[] = [];
                const ids: string[] = [];
                for (let index = 0; index < featureData.length; index++) {
                    indices.push(index);
                    const datum = featureData[index];
                    datum.f.forEach((value: number, index: number) => {
                        const arrayOfValues = dataMappedByMeasuredFeatures[
                            this.featuresDataOrder[index]
                        ] as (number | null)[];
                        // value actually can be a number or a string, but isNaN
                        // only accepts a number, so the typing here had to identify
                        // value as a number until this point
                        if (isNaN(value)) {
                            arrayOfValues.push(null);
                        } else {
                            arrayOfValues.push(Number(value));
                        }
                    }, {});
                    groupByArray.push(datum.p);
                    thumbnails.push(datum.t);
                    ids.push(datum.i.toString());
                }
                return {
                    indices: indices,
                    values: dataMappedByMeasuredFeatures,
                    labels: {
                        thumbnailPaths: thumbnails,
                        cellIds: ids,
                    },
                };
            })
            .catch((e) => {
                console.log("ERROR FETCHING FEATURE DATA:", e);
            });
    };

    public getFileInfoByCellId = (cellId: string) => {
        return this.getDoc(`${this.fileInfoPath}/${cellId}`).then((doc) => {
            const data = doc.data() as FileInfo;
            if (!data) {
                return;
            }
            return {
                ...data,
                CellId: data.CellId.toString(),
                FOVId: data.FOVId.toString(),
            };
        });
    };

    public getFileInfoByArrayOfCellIds = (cellIds: string[]) => {
        return Promise.all(
            cellIds.map((id: string) => {
                return this.getDoc(`${this.fileInfoPath}/${id}`).then((doc) => {
                    const data = doc.data() as FileInfo;
                    if (!data) {
                        return;
                    }
                    return {
                        ...data,
                        CellId: data.CellId.toString(),
                        FOVId: data.FOVId.toString(),
                    };
                });
            })
        );
    };

    public getAlbumData = () => {
        if (!this.albumPath) {
            return Promise.resolve([]);
        }
        return this.getCollection(this.albumPath).then((snapshot: QuerySnapshot) => {
            const dataset: Album[] = [];
            snapshot.forEach((doc: QueryDocumentSnapshot) => {
                dataset.push(doc.data() as Album);
            });
            return dataset;
        });
    };
}

export default FirebaseRequest;
