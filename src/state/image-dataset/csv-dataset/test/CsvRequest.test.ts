// Some Vol-E functions will try to use `window.localStorage`, so we need vitest to mock that for us
// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import CsvRequest, { DEFAULT_GROUPBY_NONE } from "..";
import { DiscreteMeasuredFeatureDef, MeasuredFeatureDef } from "../../../metadata/types";
import { ViewMode } from "@aics/vole-app";

const testCsv = `CellId,volumeviewerPath,thumbnailPath,feature1,feature2,feature3,discretefeature
potato,https://example.com/1/raw.ome.zarr,https://example.com/1.png,1,2,3,A
garbanzo,https://example.com/2/raw.ome.zarr,https://example.com/2.jpeg,7,3.4,1,B
turnip,https://example.com/3/raw.ome.zarr,https://example.com/3.jpeg,4,5,6,B
rutabaga,https://example.com/4/raw.ome.zarr,https://example.com/4.jpeg,9,2.8,NaN,C`;

const bffCsv = `File ID,File Name,Cell Line,Structure,Gene,Colony Position,Instrument Id,Plate Barcode,Well Name,File Path,Thumbnail,File Size,Uploaded
35,3500000635_100X_20170227_F07_P23.ome.tiff,AICS-12,Microtubules,TUBA1B,center,5,3500000635,F7,https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/35.zarr,https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-12/AICS-12_35.png,0,0
2655,3500000943_100X_20170530_2-Scene-4-P8-E04.ome.tiff,AICS-13,Nuclear envelope,LMNB1,center,5,3500000943,E4,https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/2655.zarr,https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-13/AICS-13_2655.png,0,0
141128,3500002823_100X_20190322_1r-Scene-20-P60-F09.ome.tiff,AICS-61,Heterochromatin,HIST1H2BJ,Ridge,6,3500002823,F9,https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/141128.zarr,https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-61/AICS-61_141128.png,0,0
4557,3500001130_100X_20170728_1-Scene-37-P37-F05.ome.tiff,AICS-10,Endoplasmic reticulum,SEC61B,center,5,3500001130,F5,https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/4557.zarr,https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-10/AICS-10_4557.png,0,0`;

const checkForMatchingDiscreteFeatureDef = (
    featureDefs: MeasuredFeatureDef[],
    key: string,
    options: string[],
    counts: number[]
) => {
    const def = featureDefs.find((def) => def.key === key) as DiscreteMeasuredFeatureDef;
    expect(def.discrete).to.be.true;
    const defOptions = def.options;
    expect(Object.values(defOptions).length).to.equal(options.length);

    for (let i = 0; i < options.length; i++) {
        expect(defOptions[i].key).to.equal(options[i]);
        expect(defOptions[i].name).to.equal(options[i]);
        expect(defOptions[i].count).to.equal(counts[i]);
    }
};

describe("CsvRequest", () => {
    it("can be initialized with test data", () => {
        new CsvRequest(testCsv);
    });

    it("drops feature columns from the retained rows after parsing", () => {
        const csvDataset = new CsvRequest(testCsv);
        expect(Object.keys(csvDataset.csvData[0]).sort()).to.deep.equal([
            "CellId",
            "thumbnailPath",
            "volumeviewerPath",
        ]);
    });

    it("extracts feature data", async () => {
        const csvDataset = new CsvRequest(testCsv);

        const featureData = await csvDataset.getFeatureData();
        expect(featureData).to.deep.equal({
            indices: [0, 1, 2, 3],
            values: {
                feature1: [1, 7, 4, 9],
                feature2: [2, 3.4, 5, 2.8],
                feature3: [3, 1, 6, NaN],
                discretefeature: [0, 1, 1, 2],
            },
            labels: {
                thumbnailPaths: [
                    "https://example.com/1.png",
                    "https://example.com/2.jpeg",
                    "https://example.com/3.jpeg",
                    "https://example.com/4.jpeg",
                ],
                cellIds: ["potato", "garbanzo", "turnip", "rutabaga"],
                sourcePaths: [
                    "https://example.com/1/raw.ome.zarr",
                    "https://example.com/2/raw.ome.zarr",
                    "https://example.com/3/raw.ome.zarr",
                    "https://example.com/4/raw.ome.zarr",
                ],
            },
        });
    });

    it("detects discrete vs. numeric features", async () => {
        const csvDataset = new CsvRequest(testCsv);

        const featureDefs = await csvDataset.getMeasuredFeatureDefs();
        const keyToFeatureDefs = featureDefs.reduce((acc, def) => {
            acc[def.key] = def;
            return acc;
        }, {} as { [key: string]: MeasuredFeatureDef });

        expect(keyToFeatureDefs["feature1"].discrete).to.be.false;
        expect(keyToFeatureDefs["feature2"].discrete).to.be.false;
        expect(keyToFeatureDefs["feature3"].discrete).to.be.false;
        expect(keyToFeatureDefs["discretefeature"].discrete).to.be.true;

        checkForMatchingDiscreteFeatureDef(
            featureDefs,
            "discretefeature",
            ["A", "B", "C"],
            [1, 2, 1]
        );
    });

    it("handles spaces in CSV input", async () => {
        const csvString = ` feature1, feature2, discrete feature 
        1 , 2 \t, A\t\t\t
        7,\t2, B  `;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        expect(featureData.values["feature1"]).to.deep.equal([1, 7]);
        expect(featureData.values["feature2"]).to.deep.equal([2, 2]);
        expect(featureData.values["discrete feature"]).to.deep.equal([0, 1]);

        // Discrete feature options should not have spaces
        const discreteDef = (await csvDataset.getMeasuredFeatureDefs()).find(
            (def) => def.key === "discrete feature"
        ) as DiscreteMeasuredFeatureDef;
        const options = discreteDef.options;
        expect(options["0"].name).to.equal("A");
        expect(options["1"].name).to.equal("B");
    });

    it("drops empty header columns", async () => {
        const csvString = `feature1,,feature3
        1,2,A
        4,5,B`;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        expect(featureData.values).to.deep.equal({
            feature1: [1, 4],
            feature3: [0, 1], // A->0 B->1
        });
    });

    it("handles NaN values", async () => {
        const csvString = `feature1,feature2,feature3
        1,NaN,A
        nan,5,B`;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        expect(featureData.values).to.deep.equal({
            feature1: [1, NaN],
            feature2: [NaN, 5],
            feature3: [0, 1], // A->0 B->1
        });
    });

    it("handles empty values", async () => {
        const csvString = `feature1,feature2,feature3
        1,,A
        ,5,B
        6,`;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        expect(featureData.values).to.deep.equal({
            feature1: [1, null, 6],
            feature2: [null, 5, null],
            feature3: [0, 1, null], // A->0 B->1
        });
    });

    it("drops features with no valid values", async () => {
        const csvString = `feature1,feature2,feature3
        A,,
        B,`;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        expect(featureData.values).to.deep.equal({
            feature1: [0, 1],
        });
    });

    it("drops empty rows", async () => {
        const csvString = `feature1,feature2
        A,1
           
        \t
        B,2
        `;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        expect(featureData.values).to.deep.equal({
            feature1: [0, 1],
            feature2: [1, 2],
        });
    });

    it("distinguishes capitalization", async () => {
        const csvString = `feature1
        a
        A
        b
        B`;
        const csvDataset = new CsvRequest(csvString);
        const featureData = await csvDataset.getFeatureData();
        const featureDefs = await csvDataset.getMeasuredFeatureDefs();

        // All values have unique indices
        expect(featureData.values["feature1"]).to.deep.equal([0, 1, 2, 3]);
        checkForMatchingDiscreteFeatureDef(
            featureDefs,
            "feature1",
            ["a", "A", "b", "B"],
            [1, 1, 1, 1]
        );
    });

    describe("groupby behavior", () => {
        it("uses the BFF default group by key if present", async () => {
            const csvString = `Cell Line,Structure
            A,Structure1
            B,Structure2,
            B,Structure3
            `;
            const csvDataset = new CsvRequest(csvString);
            const selectedDataset = await csvDataset.selectDataset();
            expect(selectedDataset.defaultGroupBy).to.equal("Cell Line");
        });

        it("uses first discrete feature as groupby feature", async () => {
            const csvDataset = new CsvRequest(testCsv);
            const selectedDataset = await csvDataset.selectDataset();
            expect(selectedDataset.defaultGroupBy).to.equal("discretefeature");
        });

        it("creates default groupby feature if no discrete feature is present", async () => {
            const csvString = `Feature1,Feature2
            0,1
            3,2
            123,1`;
            const csvDataset = new CsvRequest(csvString);
            const selectedDataset = await csvDataset.selectDataset();
            expect(selectedDataset.defaultGroupBy).to.equal(DEFAULT_GROUPBY_NONE);
            // Check that the default groupby feature has been added
            const featureData = await csvDataset.getFeatureData();
            expect(featureData.values[DEFAULT_GROUPBY_NONE]).to.deep.equal([0, 0, 0]);
        });
    });

    describe("handles BioFile Finder CSVs", () => {
        it("ignores reserved metadata keys when determining features", async () => {
            const csvString = `File ID,File Name,File Path,Thumbnail,File Size,Uploaded,feature1
            35,something.png,https://example.com/1.png,https://example.com/1.png,0,0,A
            `;
            const csvDataset = new CsvRequest(csvString);
            const featureData = await csvDataset.getFeatureData();
            expect(featureData.values).to.deep.equal({
                feature1: [0],
            });
        });

        it("extracts expected features from BFF data", async () => {
            const csvDataset = new CsvRequest(bffCsv);
            const featureData = await csvDataset.getFeatureData();
            expect(featureData.values).to.deep.equal({
                // Discrete values will be sorted
                "Cell Line": [1, 2, 3, 0],
                Structure: [2, 3, 1, 0],
                Gene: [3, 1, 0, 2],
                "Colony Position": [0, 0, 1, 0],
                "Instrument Id": [5, 5, 6, 5],
                "Plate Barcode": [3500000635, 3500000943, 3500002823, 3500001130],
                "Well Name": [2, 0, 3, 1],
            });

            const featureDefs = await csvDataset.getMeasuredFeatureDefs();
            expect(featureDefs.length).to.equal(7);

            checkForMatchingDiscreteFeatureDef(
                featureDefs,
                "Structure",
                ["Endoplasmic reticulum", "Heterochromatin", "Microtubules", "Nuclear envelope"],
                [1, 1, 1, 1]
            );
            checkForMatchingDiscreteFeatureDef(
                featureDefs,
                "Cell Line",
                ["AICS-10", "AICS-12", "AICS-13", "AICS-61"],
                [1, 1, 1, 1]
            );
            checkForMatchingDiscreteFeatureDef(
                featureDefs,
                "Gene",
                ["HIST1H2BJ", "LMNB1", "SEC61B", "TUBA1B"],
                [1, 1, 1, 1]
            );
            checkForMatchingDiscreteFeatureDef(
                featureDefs,
                "Colony Position",
                ["center", "Ridge"],
                [3, 1]
            );
        });

        it("extracts thumbnail, cell line, and file path", async () => {
            const csvDataset = new CsvRequest(bffCsv);
            const featureData = await csvDataset.getFeatureData();
            expect(featureData.labels).to.deep.equal({
                cellIds: ["35", "2655", "141128", "4557"],
                thumbnailPaths: [
                    "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-12/AICS-12_35.png",
                    "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-13/AICS-13_2655.png",
                    "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-61/AICS-61_141128.png",
                    "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-10/AICS-10_4557.png",
                ],
                sourcePaths: [
                    "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/35.zarr",
                    "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/2655.zarr",
                    "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/141128.zarr",
                    "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/4557.zarr",
                ],
            });
            // Check volume viewer paths
            const fileInfo = await csvDataset.getFileInfoByArrayOfCellIds([
                "35",
                "2655",
                "141128",
                "4557",
            ]);
            expect(fileInfo[0]).to.deep.equal({
                CellId: "35",
                volumeviewerPath:
                    "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/35.zarr",
                groupBy: "Cell Line",
                fovThumbnailPath: undefined,
                fovVolumeviewerPath: undefined,
                thumbnailPath:
                    "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-12/AICS-12_35.png",
                FOVId: undefined,
                voleUrlParams: undefined,
            });
        });
    });

    it("handles cell id vs. row index collisions when data is incomplete.", async () => {
        const csvString = `CellId,feature1
            0,A
            2,B,
            ,C
            5,D`;
        // Note that in the above CSV, if we directly used the cell ID with
        // row index as a fallback for undefined values, we would end up with
        // two rows that have index 2. Instead, the CSV parser should detect
        // that data is missing and use the row index for all cell IDs instead.
        const csvData = new CsvRequest(csvString);
        expect(await csvData.getFileInfoByCellId("0")).to.not.be.undefined;
        expect(await csvData.getFileInfoByCellId("1")).to.not.be.undefined;
        expect(await csvData.getFileInfoByCellId("2")).to.not.be.undefined;
        expect(await csvData.getFileInfoByCellId("3")).to.not.be.undefined;
        expect(await csvData.getFileInfoByCellId("5")).to.be.undefined;
    });

    describe("retrieves Vol-E query parameters", () => {
        const CELL_1_PARAMS =
            "interp=0&view=Z&slice=0.5,0.5,0.75&bright=30&dens=60&c0=sen:1,isv:150&c2=ven:1,clz:1,lut:v15:v230";
        const CELL_2_PARAMS =
            "url=https://example1.com,https://example2.com&t=15&c0=ven:0&c1=ven:1";

        async function validateCell1Params(csvDataset: CsvRequest): Promise<void> {
            // Validate cell 1
            const cell1Info = await csvDataset.getFileInfoByCellId("cell1");

            const cell1VoleArgs = cell1Info?.voleUrlParams?.args;
            const cell1VoleSettings = cell1Info?.voleUrlParams?.viewerSettings;
            expect(cell1VoleArgs).to.not.equal(undefined);
            expect(cell1VoleSettings).to.not.equal(undefined);

            // Viewer settings
            expect(cell1VoleSettings?.interpolationEnabled).to.equal(false);
            expect(cell1VoleSettings?.viewMode).to.equal(ViewMode.xy);
            expect(cell1VoleSettings?.slice).to.deep.equal({ x: 0.5, y: 0.5, z: 0.75 });
            expect(cell1VoleSettings?.brightness).to.equal(30);
            expect(cell1VoleSettings?.density).to.equal(60);

            // Channel data
            const cell1Channels = cell1VoleArgs?.viewerChannelSettings?.groups[0].channels;
            expect(cell1Channels).not.toBeUndefined();
            expect(cell1Channels?.[0].match).to.equal(0);
            expect(cell1Channels?.[0].enabled).toBeFalsy();
            expect(cell1Channels?.[0].surfaceEnabled).to.be.true;
            expect(cell1Channels?.[0].isovalue).to.equal(150);
            expect(cell1Channels?.[1].match).to.equal(2);
            expect(cell1Channels?.[1].enabled).to.be.true;
            expect(cell1Channels?.[1].colorizeEnabled).to.be.true;
            expect(cell1Channels?.[1].intensity?.lut).to.deep.equal(["v15", "v230"]);
        }

        async function validateCell2Params(csvDataset: CsvRequest): Promise<void> {
            // Validate cell 2
            const cell2Info = await csvDataset.getFileInfoByCellId("cell2");
            const cell2VoleArgs = cell2Info?.voleUrlParams?.args;
            const cell2VoleSettings = cell2Info?.voleUrlParams?.viewerSettings;
            expect(cell2VoleArgs).to.not.equal(undefined);
            expect(cell2VoleSettings).to.not.equal(undefined);

            // Viewer settings
            expect(cell2VoleArgs?.imageUrl).to.deep.equal({
                scenes: [["https://example1.com", "https://example2.com"]],
            });
            expect(cell2VoleSettings?.time).to.equal(15);

            // Channel data
            const cell2Channels = cell2VoleArgs?.viewerChannelSettings?.groups[0].channels;
            expect(cell2Channels).not.toBeUndefined();
            expect(cell2Channels?.[0].match).to.equal(0);
            expect(cell2Channels?.[0].enabled).to.be.false;
            expect(cell2Channels?.[1].match).to.equal(1);
            expect(cell2Channels?.[1].enabled).to.be.true;
        }

        async function validateVoleParams(csvDataset: CsvRequest): Promise<void> {
            await validateCell1Params(csvDataset);
            await validateCell2Params(csvDataset);
        }

        it("accepts plain params", async () => {
            const csvString = `CellId,Link Path
            cell1,"${CELL_1_PARAMS}"
            cell2,"${CELL_2_PARAMS}"`;
            const csvDataset = new CsvRequest(csvString);
            await validateVoleParams(csvDataset);
        });

        it("accepts params with ? prefix", async () => {
            const csvString = `CellId,Link Path
            cell1,"?${CELL_1_PARAMS}"
            cell2,"?${CELL_2_PARAMS}"`;
            const csvDataset = new CsvRequest(csvString);
            await validateVoleParams(csvDataset);
        });

        it("accepts params containing Vol-E links", async () => {
            const csvString = `CellId,Link Path
            cell1,"https://vole.allencell.org/viewer?${CELL_1_PARAMS}"
            cell2,"https://vole.allencell.org/viewer?${CELL_2_PARAMS}"`;
            const csvDataset = new CsvRequest(csvString);
            await validateVoleParams(csvDataset);
        });

        it("returns undefined when no column is provided", async () => {
            const csvDataset = new CsvRequest(testCsv);
            const featureData = await csvDataset.getFileInfoByCellId("potato");
            expect(featureData?.voleUrlParams).to.be.undefined;
        });

        it("handles empty link paths", async () => {
            const csvString = `CellId,Link Path
            cell1,"https://vole.allencell.org/viewer?${CELL_1_PARAMS}"
            cell2,`;
            const csvDataset = new CsvRequest(csvString);
            await validateCell1Params(csvDataset);

            const cell2Info = await csvDataset.getFileInfoByCellId("cell2");
            expect(cell2Info?.voleUrlParams).to.be.undefined;
        });
    });
});
