import { describe, it, expect } from "vitest";

import { COLOR_BY_SELECTOR, X_AXIS_ID, Y_AXIS_ID } from "../../constants";
import {
    changeAxis,
    changeConnectByCategory,
    changeConnectByFeature,
    selectCellFor3DViewer,
    selectPoint,
    setColorOverrides,
    setShowConnectLines,
} from "../../state/selection/actions";

import { initialState } from "../../state/selection/reducer";
import { selectedCellFileInfo } from "../../state/test/mocks";
import UrlState, { URLSearchParam } from "../UrlState";

describe("UrlState utility class", () => {
    describe("toAppState", () => {
        it("maps URL search params directly to the shape of the selection state branch", () => {
            expect(
                UrlState.toAppState({
                    [URLSearchParam.cellSelectedFor3D]: "2",
                    [URLSearchParam.plotByOnX]: "feature_x",
                    [URLSearchParam.plotByOnY]: "feature_y",
                    [URLSearchParam.colorBy]: "feature_z",
                    [URLSearchParam.selectedPoint]: ["1", "2", "3", "4", "5"],
                    [URLSearchParam.colorOverrides]: "ff0000--00ff00-0000ff",
                    [URLSearchParam.connectBy]: "false",
                    [URLSearchParam.connectByCategory]: "feature_a",
                    [URLSearchParam.connectByFeature]: "feature_b",
                })
            ).to.deep.equal({
                cellSelectedFor3D: "2",
                [COLOR_BY_SELECTOR]: "feature_z",
                initSelectedPoints: ["1", "2", "3", "4", "5"],
                [X_AXIS_ID]: "feature_x",
                [Y_AXIS_ID]: "feature_y",
                colorOverrides: ["#ff0000", undefined, "#00ff00", "#0000ff"],
                showConnectLines: false,
                connectByCategory: "feature_a",
                connectByFeature: "feature_b",
            });
        });

        it("handles capitalized hex colors", () => {
            expect(
                UrlState.toAppState({
                    [URLSearchParam.colorOverrides]: "FF0000--00FF00-0000FF",
                })
            ).to.deep.equal({
                colorOverrides: ["#ff0000", undefined, "#00ff00", "#0000ff"],
            });
        });

        it("adds cellSelectedFor3D to list of selected points if not already there", () => {
            expect(
                UrlState.toAppState({
                    [URLSearchParam.cellSelectedFor3D]: "2",
                    [URLSearchParam.selectedPoint]: ["1"],
                })
            ).to.deep.equal({
                cellSelectedFor3D: "2",
                initSelectedPoints: ["2", "1"],
            });
        });

        it("does not duplicate cellSelectedFor3D in list of selected points if it is already there", () => {
            expect(
                UrlState.toAppState({
                    [URLSearchParam.cellSelectedFor3D]: "2",
                    [URLSearchParam.selectedPoint]: ["2"],
                })
            ).to.deep.equal({
                cellSelectedFor3D: "2",
                initSelectedPoints: ["2"],
            });
        });
    });

    describe("toReduxActions", () => {
        it("maps a key value pair to a redux action", () => {
            expect(
                UrlState.toReduxActions({
                    [URLSearchParam.plotByOnX]: "feature_x",
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.have.deep.members([changeAxis(X_AXIS_ID, "feature_x")]);
        });

        it("adds cellSelectedFor3D to list of selected points if not already there", () => {
            expect(
                UrlState.toReduxActions({
                    [URLSearchParam.cellSelectedFor3D]: "2",
                })
            )
                .to.be.an("array")
                .of.length(2)
                .and.to.have.deep.members([
                    selectPoint({ id: "2" }),
                    selectCellFor3DViewer({ id: "2" }),
                ]);
        });

        it("does not duplicate cellSelectedFor3D in list of selected points if it is already there", () => {
            expect(
                UrlState.toReduxActions({
                    [URLSearchParam.cellSelectedFor3D]: "2",
                    [URLSearchParam.selectedPoint]: ["2"],
                })
            )
                .to.be.an("array")
                .of.length(2)
                .and.to.have.deep.members([
                    selectPoint({ id: "2" }),
                    selectCellFor3DViewer({ id: "2" }),
                ]);
        });

        it("maps multiple key value pairs to multiple redux actions", () => {
            expect(
                UrlState.toReduxActions({
                    [URLSearchParam.cellSelectedFor3D]: "2",
                    [URLSearchParam.plotByOnX]: "feature_x",
                    [URLSearchParam.plotByOnY]: "feature_y",
                    [URLSearchParam.colorBy]: "feature_z",
                    [URLSearchParam.selectedPoint]: ["1", "2", "3", "4", "5"],
                    [URLSearchParam.colorOverrides]: "ff0000--00ff00-0000ff",
                    [URLSearchParam.connectBy]: "true",
                    [URLSearchParam.connectByCategory]: "feature_a",
                    [URLSearchParam.connectByFeature]: "feature_b",
                })
            )
                .to.be.an("array")
                .of.length(13)
                .and.to.have.deep.members([
                    selectCellFor3DViewer({ id: "2" }),
                    changeAxis(X_AXIS_ID, "feature_x"),
                    changeAxis(Y_AXIS_ID, "feature_y"),
                    changeAxis(COLOR_BY_SELECTOR, "feature_z"),
                    selectPoint({ id: "1" }),
                    selectPoint({ id: "2" }),
                    selectPoint({ id: "3" }),
                    selectPoint({ id: "4" }),
                    selectPoint({ id: "5" }),
                    setColorOverrides(["#ff0000", undefined, "#00ff00", "#0000ff"]),
                    setShowConnectLines(true),
                    changeConnectByCategory("feature_a"),
                    changeConnectByFeature("feature_b"),
                ]);
        });

        it("maps an empty obj of URL params to an empty arr of redux actions", () => {
            expect(UrlState.toReduxActions({})).to.eql([]);
        });

        it("ignores search params that are not explicitly configured", () => {
            expect(
                UrlState.toReduxActions({
                    [URLSearchParam.colorBy]: "feature_z",
                    superFakeMadeUpUrlParam: "superFakeMadeUpValue",
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.have.deep.members([changeAxis(COLOR_BY_SELECTOR, "feature_z")]);
        });
    });

    describe("toUrlSearchParameterMap", () => {
        it("re-maps app state to a key:value object", () => {
            const selections = {
                cellSelectedFor3D: "10",
                colorBy: "Protein",
                plotByOnX: "X value",
                plotByOnY: "Y value",
                selectedPoints: selectedCellFileInfo,
                colorOverrides: ["#ff0000", undefined, "#00ff00", "#0000ff"],
                connectByCategory: "feature_a",
                connectByFeature: "feature_b",
                showConnectLines: true,
            };
            expect(UrlState.toUrlSearchParameterMap(selections)).to.deep.equal({
                [URLSearchParam.cellSelectedFor3D]: "10",
                [URLSearchParam.colorBy]: "Protein",
                [URLSearchParam.plotByOnX]: "X value",
                [URLSearchParam.plotByOnY]: "Y value",
                [URLSearchParam.selectedPoint]: ["1", "2"],
                [URLSearchParam.colorOverrides]: "ff0000--00ff00-0000ff",
                [URLSearchParam.connectBy]: "true",
                [URLSearchParam.connectByCategory]: "feature_a",
                [URLSearchParam.connectByFeature]: "feature_b",
            });
        });

        it("trims extra undefined values from the color override array", () => {
            const selections = {
                colorOverrides: [undefined, "#ffff00", undefined, "#00ffff", undefined, undefined],
            };
            expect(UrlState.toUrlSearchParameterMap(selections)).to.deep.equal({
                [URLSearchParam.colorOverrides]: "-ffff00--00ffff",
            });
        });

        it("omits values that are not meaningful to include in the URL", () => {
            const selections = {
                cellSelectedFor3D: "",
                colorBy: "Color by",
                plotByOnX: "X value",
                plotByOnY: "Y value",
                selectedPoints: [],
            };

            expect(UrlState.toUrlSearchParameterMap(selections)).to.deep.equal({
                [URLSearchParam.colorBy]: "Color by",
                [URLSearchParam.plotByOnX]: "X value",
                [URLSearchParam.plotByOnY]: "Y value",
            });
        });

        it("omits values that are not explicitly configured", () => {
            const selections = {
                colorBy: "Mitotic state",
                fakeSelectionKey: "superFake",
            };

            expect(UrlState.toUrlSearchParameterMap(selections)).to.deep.equal({
                [URLSearchParam.colorBy]: "Mitotic state",
            });
        });
        it("omits values that are set to initial values", () => {
            const selections = { ...initialState };

            expect(UrlState.toUrlSearchParameterMap(selections)).to.deep.equal({});
        });
    });
});
