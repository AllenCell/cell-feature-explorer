import { describe, it, expect } from "vitest";
import { find } from "lodash";

import { DOWNLOAD_CONFIG_TYPE_PROTEIN } from "../../../constants/index";
import { mockState } from "../../../state/test/mocks";
import { State } from "../../../state/types";
import {
    disambiguateCategoryNames,
    getInteractivePanelData,
    getListOfCellIdsByDownloadConfig,
    getSelectionPanelData,
} from "../selectors";
import { PanelData } from "../types";

describe("ColorByMenu selectors", () => {
    const newMockState = mockState;

    describe("disambiguateCategoryNames", () => {
        it("attaches the key to each non-unique name", () => {
            const mockData = [
                {
                    name: "same name",
                    key: "1",
                    color: "#ffffff",
                },
                {
                    name: "same name",
                    key: "2",
                    color: "#ffffff",
                },
                {
                    name: "diff name",
                    key: "3",
                    color: "#ffffff",
                },
            ];
            const result = disambiguateCategoryNames(mockData);

            /* Without disambiguation, names would be:
            [
                "same name",
                "same name",
                "diff name",
            ]
            */
            const expected = ["same name (1)", "same name (2)", "diff name"];
            expect(result).to.deep.equal(expected);
        });

        it("leaves unique names unchanged and handles empty input", () => {
            const mockData = [
                { name: "a", key: "1", color: "#ffffff" },
                { name: "b", key: "2", color: "#ffffff" },
            ];
            expect(disambiguateCategoryNames(mockData)).to.deep.equal(["a", "b"]);
            expect(disambiguateCategoryNames([])).to.deep.equal([]);
        });
    });

    describe("getInteractivePanelData", () => {
        it("returns an array where each item is of type PanelData", () => {
            const result: PanelData[] = getInteractivePanelData(newMockState);
            const requiredKeys = ["color", "id", "name", "total"];
            const allKeys = [...requiredKeys, "disabled", "checked"];
            // make sure each element has required keys
            result.forEach((ele: PanelData) => {
                requiredKeys.forEach((key: string) => {
                    expect(ele.hasOwnProperty(key)).to.be.true;
                });
            });

            // make sure there are no extra keys
            result.forEach((ele: PanelData) => {
                Object.keys(ele).forEach((key: string) => {
                    expect(allKeys.indexOf(key)).to.be.greaterThan(-1);
                });
            });
        });
        it("returns disabled === false for any category that has data", () => {
            const result: PanelData[] = getInteractivePanelData(newMockState);
            // "Alpha-actinin-1" and "Paxillin" cell lines in the mock data
            // if this test fails, check that the mock data hasn't changed
            const actin = find(result, { id: "Alpha-actinin-1" });
            const paxillin = find(result, { id: "Paxillin" });
            const tom20 = find(result, { id: "Tom20" });

            expect(actin?.disabled).to.be.false;
            expect(paxillin?.disabled).to.be.false;
            expect(tom20?.disabled).to.be.true;
        });
        it("returns disabled === true if that category isn't represented the plot", () => {
            const state = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    plotByOnX: "missing-data",
                },
            };
            // "missing data" is missing for all points, so no category should be
            // enabled
            const result: PanelData[] = getInteractivePanelData(state);
            result.forEach((ele) => {
                expect(ele.disabled).to.be.true;
            });
        });
    });

    describe("getSelectionPanelData", () => {
        it("returns an empty array if no selections", () => {
            const result: PanelData[] = getSelectionPanelData(newMockState);
            expect(result.length).to.deep.equal(0);
        });

        it("returns an array of panel props", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    selectedGroups: {
                        id1: [
                            { cellId: "1", pointIndex: 0 },
                            { cellId: "2", pointIndex: 1 },
                            { cellId: "3", pointIndex: 2 },
                            { cellId: "4", pointIndex: 3 },
                        ],
                        id2: [
                            { cellId: "2", pointIndex: 1 },
                            { cellId: "3", pointIndex: 3 },
                            { cellId: "4", pointIndex: 3 },
                            { cellId: "5", pointIndex: 4 },
                        ],
                    },
                },
            };
            const result: PanelData[] = getSelectionPanelData(state);
            expect(result.length).to.deep.equal(2);
        });
    });

    describe("getListOfCellIdsByDownloadConfig", () => {
        it("returns an empty array if there is no download config", () => {
            const result: string[] = getListOfCellIdsByDownloadConfig(newMockState);
            expect(result.length).to.deep.equal(0);
        });

        it("returns an array of cell ids that match the category name if that is the download config type", () => {
            const state: State = {
                ...newMockState,
                selection: {
                    ...newMockState.selection,
                    downloadConfig: {
                        key: "Paxillin",
                        type: DOWNLOAD_CONFIG_TYPE_PROTEIN,
                    },
                },
            };

            const result: string[] = getListOfCellIdsByDownloadConfig(state);
            expect(result).to.deep.equal(["C1"]);
        });
    });
});
