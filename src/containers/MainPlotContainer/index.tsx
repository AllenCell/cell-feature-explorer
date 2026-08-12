import { Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { filter, includes, map } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import type { ActionCreator } from "redux";

import FeatureSelectDropdown from "../../components/FeatureSelectDropdown";
import MainPlot, { type PlotlyAnnotation } from "../../components/MainPlot";
import MouseFollower from "../../components/MouseFollower";
import PopoverCard from "../../components/PopoverCard/index";
import {
    CELL_ID_KEY,
    GROUP_BY_KEY,
    SCATTER_PLOT_NAME,
    X_AXIS_ID,
    Y_AXIS_ID,
} from "../../constants";
import metadataStateBranch from "../../state/metadata";
import { MeasuredFeatureDef, RequestAction } from "../../state/metadata/types";
import selectionStateBranch from "../../state/selection";
import {
    ChangeHoveredPointAction,
    ChangeMousePositionAction,
    DeselectPointAction,
    LassoOrBoxSelectAction,
    MousePosition,
    SelectAxisAction,
    LassoOrBoxSelectPointData,
    SelectPointAction,
    TickConversion,
    SelectedPointData,
} from "../../state/selection/types";
import type { State } from "../../state/types";

import {
    getDataForOverlayCard,
    getFormattedHoveredXValue,
    getFormattedHoveredYValue,
    getScatterPlotDataArray,
    getXDisplayName,
    getXDisplayOptions,
    getXTickConversion,
    getYDisplayName,
    getYDisplayOptions,
    getYTickConversion,
    getXAxisRange,
    getYAxisRange,
    getAnnotations,
    getConnectByFeatureDisplayName,
    getFormattedHoveredConnectByFeatureValue,
} from "./selectors";
import { getFeatureDefTooltip } from "../../state/selection/selectors";
import { formatThumbnailSrc } from "../../state/util";

import styles from "./style.css";
import { createThumbnailImageSrc } from "../../util/thumbnails";

/** Maximum number of auto-generated thumbnails to store. */
const MAX_GENERATED_THUMBNAILS = 250;

interface PropsFromState {
    annotations: PlotlyAnnotation[];
    categoricalFeatures: string[];
    clickedPoints: string[];
    filtersToExclude: string[];
    galleryCollapsed: boolean;
    hoveredPointData: SelectedPointData | null;
    hoveredXValue: string;
    hoveredYValue: string;
    hoveredConnectByFeatureValue: string;
    mousePosition: MousePosition;
    plotDataArray: any;
    thumbnailRoot: string;
    xDisplayName: string;
    yDisplayName: string;
    connectByFeatureDisplayName: string;
    xDropDownValue: string;
    yDropDownValue: string;
    yDropDownOptions: MeasuredFeatureDef[];
    xDropDownOptions: MeasuredFeatureDef[];
    xTickConversion: TickConversion;
    yTickConversion: TickConversion;
    xAxisRange?: [number, number];
    yAxisRange?: [number, number];
}

interface DispatchProps {
    changeHoveredPoint: ActionCreator<ChangeHoveredPointAction>;
    handleDeselectPoint: ActionCreator<DeselectPointAction>;
    handleLassoOrBoxSelect: ActionCreator<LassoOrBoxSelectAction>;
    handleSelectPoint: ActionCreator<SelectPointAction>;
    requestFeatureData: ActionCreator<RequestAction>;
    updateMousePosition: ActionCreator<ChangeMousePositionAction>;
    handleChangeAxis: ActionCreator<SelectAxisAction>;
    requestCellFileInfoData: ActionCreator<RequestAction>;
}

interface PropsFromApp {
    // props from <App />
    handleSelectionToolUsed: () => void;
}

type MainPlotContainerProps = PropsFromState & DispatchProps & PropsFromApp;

interface MainPlotContainerState {
    /**
     * Maps from `cellId` to a thumbnail URL for Zarr files that don't have a
     * specified thumbnail path in the metadata, generated asynchronously.
     * `null` when a thumbnail is in the process of being generated.
     */
    cellIdToZarrThumbnailUrl: Map<string, string | null>;
}

class MainPlotContainer extends React.Component<MainPlotContainerProps, MainPlotContainerState> {
    private popoverContainer: React.RefObject<HTMLDivElement>;

    constructor(props: MainPlotContainerProps) {
        super(props);

        this.popoverContainer = React.createRef();

        this.state = { cellIdToZarrThumbnailUrl: new Map() };

        this.onPointClicked = this.onPointClicked.bind(this);
        this.onPointHovered = this.onPointHovered.bind(this);
        this.onPointUnhovered = this.onPointUnhovered.bind(this);
        this.onGroupSelected = this.onGroupSelected.bind(this);
        this.onPlotUnhovered = this.onPlotUnhovered.bind(this);
        this.renderPopover = this.renderPopover.bind(this);
    }

    private thumbnailTimeout = 0;

    // TODO: retype once plotly has id and fullData types
    public onPointClicked(clicked: any) {
        const { points } = clicked;
        const { clickedPoints, handleSelectPoint, handleDeselectPoint } = this.props;
        points.forEach((point: any) => {
            if (point.data.name === SCATTER_PLOT_NAME) {
                if (includes(clickedPoints, point.id)) {
                    handleDeselectPoint(point.id);
                } else if (point.fullData.marker.opacity) {
                    handleSelectPoint({ id: point.id, index: point.customdata.index });
                }
            }
        });
    }

    private updateThumbnails(cellId: string, url: string | null) {
        this.setState((state) => {
            // Move the updated thumbnail to the front of the map entries
            const map = state.cellIdToZarrThumbnailUrl;
            map.delete(cellId);
            const mapEntries: [string, string | null][] = [
                [cellId, url],
                ...Array.from(map.entries()),
            ];
            // Limit the number of thumbnails stored in memory
            const newEntries = mapEntries.slice(0, MAX_GENERATED_THUMBNAILS);
            const newMap = new Map(newEntries);
            return { cellIdToZarrThumbnailUrl: newMap };
        });
    }

    private async loadThumbnailForZarr(cellId: string, srcPath: string | undefined): Promise<void> {
        if (this.state.cellIdToZarrThumbnailUrl.has(cellId)) {
            return;
        } else if (this.state.cellIdToZarrThumbnailUrl.get(cellId) === null) {
            // already loading, or load failed
            return;
        }
        this.updateThumbnails(cellId, null);
        if (srcPath && srcPath.endsWith(".zarr")) {
            try {
                const src = await createThumbnailImageSrc(srcPath);
                this.updateThumbnails(cellId, src);
            } catch (e) {
                console.error("Error generating thumbnail for Zarr:", e);
            }
        }
    }

    public componentWillUnmount() {
        this.state.cellIdToZarrThumbnailUrl.clear();
    }

    // TODO: retype once plotly has id and fullData types
    public onPointHovered(hovered: any) {
        const { points, event } = hovered;
        const { filtersToExclude, updateMousePosition, changeHoveredPoint } = this.props;
        updateMousePosition({
            pageX: event.pageX,
            pageY: event.pageY,
        });

        points.forEach((point: any) => {
            if (
                point.data.name === SCATTER_PLOT_NAME &&
                !includes(filtersToExclude, point.fullData.name)
            ) {
                window.clearTimeout(this.thumbnailTimeout);
                changeHoveredPoint({
                    [CELL_ID_KEY]: point.id,
                    index: point.customdata.index,
                    thumbnailPath: point.customdata.thumbnailPath,
                    srcPath: point.customdata.srcPath,
                    xValue: point.x,
                    yValue: point.y,
                    connectByValue: point.customdata.connectByFeature,
                });
                this.loadThumbnailForZarr(point.id, point.customdata.srcPath);
            } else {
                changeHoveredPoint(null);
            }
        });
    }

    public onPointUnhovered() {
        this.thumbnailTimeout = window.setTimeout(() => this.props.changeHoveredPoint(null), 500);
    }

    public onPlotUnhovered({ relatedTarget }: any) {
        const { changeHoveredPoint } = this.props;
        // prevents click events from triggering the popover to close
        if (relatedTarget.className) {
            changeHoveredPoint(null);
        }
    }

    public onGroupSelected(eventData: any) {
        if (!eventData) {
            return;
        }
        const { points } = eventData;
        const pointsWithIds = points;
        const { handleLassoOrBoxSelect, handleSelectionToolUsed } = this.props;
        const key = Date.now().valueOf().toString();
        const payload: LassoOrBoxSelectPointData[] = map(
            filter(pointsWithIds, (ele) => ele.data.name === SCATTER_PLOT_NAME),
            (point) => ({
                pointIndex: point.customdata.index as number,
                cellId: point.id as string,
            })
        );
        handleLassoOrBoxSelect(key, payload);
        handleSelectionToolUsed();
    }

    public renderPopover() {
        const {
            hoveredPointData,
            galleryCollapsed,
            thumbnailRoot,
            xDisplayName,
            yDisplayName,
            hoveredXValue,
            hoveredYValue,
            connectByFeatureDisplayName,
            hoveredConnectByFeatureValue,
        } = this.props;
        let thumbnailSrc: string | undefined = formatThumbnailSrc(
            thumbnailRoot,
            hoveredPointData?.thumbnailPath || ""
        );
        if (!thumbnailSrc && hoveredPointData?.CellId) {
            // If a generated thumbnail is available for this Zarr cell, use it as
            // a fallback for the thumbnail path.
            thumbnailSrc =
                this.state.cellIdToZarrThumbnailUrl.get(hoveredPointData.CellId) ?? undefined;
        }
        return (
            hoveredPointData &&
            galleryCollapsed && (
                <PopoverCard
                    title={hoveredPointData[GROUP_BY_KEY] || ""}
                    description={hoveredPointData[CELL_ID_KEY].toString()}
                    src={thumbnailSrc}
                    xLabel={xDisplayName}
                    xValue={hoveredXValue}
                    yLabel={yDisplayName}
                    yValue={hoveredYValue}
                    lineLabel={connectByFeatureDisplayName}
                    lineValue={hoveredConnectByFeatureValue}
                />
            )
        );
    }

    public render() {
        const {
            annotations,
            plotDataArray,
            mousePosition,
            xDropDownValue,
            yDropDownValue,
            yDropDownOptions,
            xDropDownOptions,
            handleChangeAxis,
            yTickConversion,
            xTickConversion,
            categoricalFeatures,
            xAxisRange,
            yAxisRange,
        } = this.props;
        if (plotDataArray.length === 0) {
            return null;
        }

        const popover = this.renderPopover();

        return (
            <>
                <MouseFollower
                    ref={this.popoverContainer}
                    pageX={mousePosition.pageX}
                    pageY={mousePosition.pageY}
                >
                    <Popover
                        placement="right"
                        content={popover}
                        open={!!popover}
                        getPopupContainer={() => this.popoverContainer.current || document.body}
                        id="thumbnail-popover"
                    />
                </MouseFollower>
                <div
                    id="main-plot"
                    className={styles.container}
                    onMouseLeave={this.onPlotUnhovered}
                >
                    <FeatureSelectDropdown
                        classKey={X_AXIS_ID}
                        value={xDropDownValue}
                        options={xDropDownOptions}
                        onChange={(v: string) => {
                            handleChangeAxis(X_AXIS_ID, v);
                        }}
                        tooltip={getFeatureDefTooltip(xDropDownValue, xDropDownOptions)}
                    />
                    <div className={styles.glossaryLink}>
                        <a
                            href="https://www.allencell.org/glossary-of-cell-features-v2.html"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <InfoCircleOutlined /> Open axis glossary
                        </a>
                    </div>
                    <FeatureSelectDropdown
                        classKey={Y_AXIS_ID}
                        value={yDropDownValue}
                        options={yDropDownOptions}
                        onChange={(v: string) => {
                            handleChangeAxis(Y_AXIS_ID, v);
                        }}
                        tooltip={getFeatureDefTooltip(yDropDownValue, yDropDownOptions)}
                    />

                    <MainPlot
                        plotDataArray={plotDataArray}
                        onPointClicked={this.onPointClicked}
                        annotations={annotations}
                        onGroupSelected={this.onGroupSelected}
                        onPointHovered={this.onPointHovered}
                        onPointUnhovered={this.onPointUnhovered}
                        xAxisType={includes(categoricalFeatures, xDropDownValue) ? "array" : "auto"}
                        yAxisType={includes(categoricalFeatures, yDropDownValue) ? "array" : "auto"}
                        xTickConversion={xTickConversion}
                        yTickConversion={yTickConversion}
                        xAxisRange={xAxisRange}
                        yAxisRange={yAxisRange}
                    />
                </div>
            </>
        );
    }
}

function mapStateToProps(state: State): PropsFromState {
    return {
        annotations: getAnnotations(state),
        clickedPoints: selectionStateBranch.selectors.getClickedScatterPoints(state),
        categoricalFeatures: metadataStateBranch.selectors.getCategoricalFeatureKeys(state),
        filtersToExclude: selectionStateBranch.selectors.getFiltersToExclude(state),
        galleryCollapsed: selectionStateBranch.selectors.getGalleryCollapsed(state),
        hoveredPointData: getDataForOverlayCard(state),
        hoveredXValue: getFormattedHoveredXValue(state),
        hoveredYValue: getFormattedHoveredYValue(state),
        mousePosition: selectionStateBranch.selectors.getMousePosition(state),
        plotDataArray: getScatterPlotDataArray(state),
        thumbnailRoot: selectionStateBranch.selectors.getThumbnailRoot(state),
        xDisplayName: getXDisplayName(state),
        yDisplayName: getYDisplayName(state),
        connectByFeatureDisplayName: getConnectByFeatureDisplayName(state),
        hoveredConnectByFeatureValue: getFormattedHoveredConnectByFeatureValue(state),
        xDropDownOptions: getXDisplayOptions(state),
        xDropDownValue: selectionStateBranch.selectors.getPlotByOnX(state),
        xTickConversion: getXTickConversion(state),
        yDropDownOptions: getYDisplayOptions(state),
        yDropDownValue: selectionStateBranch.selectors.getPlotByOnY(state),
        yTickConversion: getYTickConversion(state),
        xAxisRange: getXAxisRange(state),
        yAxisRange: getYAxisRange(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    changeHoveredPoint: selectionStateBranch.actions.changeHoveredPoint,
    handleChangeAxis: selectionStateBranch.actions.changeAxis,
    handleDeselectPoint: selectionStateBranch.actions.deselectPoint,
    handleLassoOrBoxSelect: selectionStateBranch.actions.lassoOrBoxSelectGroup,
    handleSelectPoint: selectionStateBranch.actions.selectPoint,
    requestCellFileInfoData: metadataStateBranch.actions.requestCellFileInfoData,
    requestFeatureData: metadataStateBranch.actions.requestFeatureData,
    updateMousePosition: selectionStateBranch.actions.changeMousePosition,
};

export default connect<PropsFromState, DispatchProps, PropsFromApp, State>(
    mapStateToProps,
    dispatchToPropsMap
)(MainPlotContainer);
