import type {
    Annotations,
    Config,
    Data,
    Layout,
    PlotMouseEvent,
    PlotSelectionEvent,
} from "plotly.js";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import Plot from "react-plotly.js";

import { GENERAL_PLOT_SETTINGS } from "../../constants";
import { TickConversion } from "../../state/selection/types";

import styles from "./style.css";
import { Button, Popover } from "antd";
import PlotSettings from "../PlotSettings";
import { ICON_SVG_PATH_PLOT_SETTINGS } from "./constants";
import { CloseOutlined } from "@ant-design/icons";

interface MainPlotProps {
    annotations: PlotlyAnnotation[];
    plotDataArray: Data[];
    onPointClicked: (clicked: PlotMouseEvent) => void;
    onPointHovered: (hovered: PlotMouseEvent) => void;
    onPointUnhovered: (unhovered: PlotMouseEvent) => void;
    onGroupSelected: (selected: PlotSelectionEvent) => void;
    xAxisType: AxisType;
    yAxisType: AxisType;
    xTickConversion: TickConversion;
    yTickConversion: TickConversion;
    xAxisRange?: [number, number];
    yAxisRange?: [number, number];
}

type AxisType = "array" | "auto" | "linear" | undefined;

export interface PlotlyAnnotation extends Partial<Annotations> {
    cellID: string;
    fovID: string;
    pointIndex: number;
}

const histogramAxis = {
    color: GENERAL_PLOT_SETTINGS.textColor,
    domain: [0.86, 1],
    hoverformat: "f",
    linecolor: GENERAL_PLOT_SETTINGS.textColor,
    showgrid: false,
    tickcolor: GENERAL_PLOT_SETTINGS.textColor,
    zeroline: true,
};

function padAxisRange(range: [number, number]): [number, number] {
    const delta = range[1] - range[0];
    const padding = delta * 0.05;
    return [range[0] - padding, range[1] + padding];
}

const PLOT_SETTINGS_ATTRIBUTE = "plot-settings-button";

const PLOT_CONFIG: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
        "sendDataToCloud",
        "toImage",
        "resetScale2d",
        "hoverClosestCartesian",
        "hoverCompareCartesian",
        "toggleSpikelines",
    ],
};

const POPUP_ANNOTATION_OFFSET_PX = 60;

const MainPlot: React.FC<MainPlotProps> = (props) => {
    const [showFullAnnotation, setShowFullAnnotation] = React.useState(true);
    const [height, setHeight] = React.useState(window.innerHeight);
    const [helpTextPos, setHelpTextPos] = React.useState<{ x: number; y: number } | null>(null);
    const graphDivRef = React.useRef<any>(null);
    // Refs updated synchronously each render so computeHelpTextPos (stable, empty deps)
    // always reads current values even when onAfterPlot fires inside Plotly.react().
    const annotationsRef = React.useRef(props.annotations);
    annotationsRef.current = props.annotations;
    const showFullAnnotationRef = React.useRef(showFullAnnotation);
    showFullAnnotationRef.current = showFullAnnotation;

    // Used to position the popup settings menu under the config button in the
    // Plotly mode bar.
    const [configButtonPosition, setConfigButtonPosition] = useState<{
        top: number;
        right: number;
    }>({ top: 0, right: 0 });

    const updateConfigButtonPosition = React.useCallback(() => {
        const configButton = document.querySelector(`[data-attr=${PLOT_SETTINGS_ATTRIBUTE}]`);
        if (!configButton) {
            return;
        }
        const rect = configButton.getBoundingClientRect();
        setConfigButtonPosition({
            top: rect.bottom - rect.height / 2 + 4,
            right: window.innerWidth - rect.right + rect.width / 2,
        });
    }, []);

    React.useEffect(() => {
        // Using Plotly's relayout-function with graph-name and
        // the variable with the new height and width
        const resize = (): void => {
            setHeight(window.innerHeight);
            updateConfigButtonPosition();
        };
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, [updateConfigButtonPosition]);

    const { annotations } = props;

    const computeHelpTextPos = React.useCallback(() => {
        const gd = graphDivRef.current;
        const currentAnnotations = annotationsRef.current;
        if (!gd || !currentAnnotations.length || !showFullAnnotationRef.current) {
            setHelpTextPos(null);
            return;
        }
        try {
            const fl = gd._fullLayout;
            const lastAnn = currentAnnotations[currentAnnotations.length - 1];
            const xa = fl.xaxis;
            const ya = fl.yaxis;
            // Calculate the width and height of the plot area (excluding margins) to convert
            // data coordinates to pixel positions on the canvas.
            const plotW = fl.width - fl.margin.l - fl.margin.r;
            const plotH = fl.height - fl.margin.t - fl.margin.b;
            // xaxis domain[0]=0, so domain start is at margin.l
            const xFrac = ((lastAnn.x as number) - xa.range[0]) / (xa.range[1] - xa.range[0]);
            const xPxLocal =
                fl.margin.l + xa.domain[0] * plotW + xFrac * (xa.domain[1] - xa.domain[0]) * plotW;
            // yaxis domain[1]=0.85; SVG origin is top-left so y-data is inverted
            const yDomainTopPx = fl.margin.t + (1 - ya.domain[1]) * plotH;
            const yFrac = ((lastAnn.y as number) - ya.range[0]) / (ya.range[1] - ya.range[0]);
            const yPxLocal = yDomainTopPx + (1 - yFrac) * (ya.domain[1] - ya.domain[0]) * plotH;
            // Convert to fixed screen coordinates so the portal doesn't need a wrapper div.
            const gdRect = gd.getBoundingClientRect();
            const x = gdRect.left + xPxLocal;
            const y = gdRect.top + yPxLocal;
            setHelpTextPos((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
        } catch {
            setHelpTextPos(null);
        }
    }, []); // stable — reads live values through refs

    const onAfterPlotRender = React.useCallback(() => {
        computeHelpTextPos();
        updateConfigButtonPosition();
    }, [computeHelpTextPos, updateConfigButtonPosition]);

    const updatedAnnotations = React.useMemo((): PlotlyAnnotation[] => {
        // on first load show the help text for one annotation, but the user can dismiss it by clicking on
        // it or clicking on a point, and it won't show again until they refresh the page.
        // The help text is rendered as an HTML overlay (not a Plotly annotation) so it stays
        // in front of spike lines.
        return annotations.map((point, index) => {
            const isLastOne = index === annotations.length - 1;
            const showHelpText = isLastOne && showFullAnnotation;

            if (showHelpText) {
                // Keep arrow (ay: -POPUP_ANNOTATION_OFFSET_PX) but make the text box invisible; real text is in the HTML overlay.
                return {
                    ...point,
                    ay: -POPUP_ANNOTATION_OFFSET_PX,
                    text: "",
                    borderpad: 0,
                    bgcolor: "transparent",
                    bordercolor: "transparent",
                };
            }
            return { ...point };
        });
    }, [annotations, showFullAnnotation]);

    const { xAxisType, xTickConversion, xAxisRange, yAxisType, yTickConversion, yAxisRange } =
        props;
    const layout = React.useMemo((): Partial<Layout> => {
        const makeAxis = (type: AxisType, tickConversion: any, range?: [number, number]) => ({
            color: GENERAL_PLOT_SETTINGS.textColor,
            domain: [0, 0.85],
            hoverformat: ".1f",
            linecolor: GENERAL_PLOT_SETTINGS.textColor,
            showgrid: false,
            showspikes: true,
            spikecolor: GENERAL_PLOT_SETTINGS.spikeColor,
            spikethickness: 2,
            spikedash: "dot",
            spikemode: "toaxis+marker" as const,
            tickcolor: GENERAL_PLOT_SETTINGS.textColor,
            tickmode: type,
            ticktext: tickConversion.tickText,
            tickvals: tickConversion.tickValues,
            zeroline: false,
            range,
        });

        return {
            annotations: updatedAnnotations,
            autosize: true,
            height: height - GENERAL_PLOT_SETTINGS.heightMargin,
            hovermode: "closest",
            legend: GENERAL_PLOT_SETTINGS.legend,
            margin: GENERAL_PLOT_SETTINGS.margin,
            paper_bgcolor: GENERAL_PLOT_SETTINGS.backgroundColor,
            plot_bgcolor: GENERAL_PLOT_SETTINGS.backgroundColor,
            xaxis: makeAxis(xAxisType, xTickConversion, xAxisRange && padAxisRange(xAxisRange)),
            xaxis2: histogramAxis,
            yaxis: makeAxis(yAxisType, yTickConversion, yAxisRange && padAxisRange(yAxisRange)),
            yaxis2: histogramAxis,
        };
    }, [
        height,
        updatedAnnotations,
        xAxisType,
        xTickConversion,
        xAxisRange,
        yAxisType,
        yTickConversion,
        yAxisRange,
    ]);

    const handlePointClick = React.useCallback(
        (event: PlotMouseEvent) => {
            setShowFullAnnotation(false);
            props.onPointClicked(event);
        },
        [props.onPointClicked]
    );

    const handleAnnotationClick = React.useCallback(() => setShowFullAnnotation(false), []);

    // Stable — only sets the ref; onAfterPlot handles position computation.
    const handleInitialized = React.useCallback((_figure: any, gd: any) => {
        graphDivRef.current = gd;
    }, []);

    const { onPointHovered, onPointUnhovered, onGroupSelected, plotDataArray } = props;
    const lastAnnotation = annotations.length > 0 ? annotations[annotations.length - 1] : null;

    const [showConfigPopup, setShowConfigPopup] = useState(false);
    const onClickConfigButton = React.useCallback((): void => {
        if (!showConfigPopup) {
            setShowConfigPopup(true);
        }
    }, [showConfigPopup]);

    // Add config button to Plotly mode bar.
    const config = React.useMemo(
        (): Partial<Plotly.Config> => ({
            ...PLOT_CONFIG,
            modeBarButtonsToAdd: [
                {
                    name: "config",
                    title: "Configure plot",
                    icon: {
                        width: 1000,
                        height: 1000,
                        path: ICON_SVG_PATH_PLOT_SETTINGS,
                    },
                    // TODO: There is a bug where clicking on the plotly button
                    // will cause the popup menu to only temporarily close
                    // instead of fully closing it. This is because Ant's
                    // Popover reacts to the click on mouse down, closing the
                    // popup, while Plotly reacts to the click on mouse up,
                    // reopening it again.
                    click: onClickConfigButton,
                    attr: PLOT_SETTINGS_ATTRIBUTE,
                },
            ],
        }),
        [onClickConfigButton]
    );

    return (
        <>
            <Plot
                data={plotDataArray}
                useResizeHandler={true}
                layout={layout}
                config={config}
                onClick={handlePointClick}
                onClickAnnotation={handleAnnotationClick}
                onHover={onPointHovered}
                onUnhover={onPointUnhovered}
                onSelected={onGroupSelected}
                onInitialized={handleInitialized}
                onAfterPlot={onAfterPlotRender}
            />
            {showFullAnnotation &&
                lastAnnotation &&
                helpTextPos &&
                createPortal(
                    <div
                        className={styles["help-text-overlay"]}
                        style={{
                            left: helpTextPos.x,
                            top: helpTextPos.y - POPUP_ANNOTATION_OFFSET_PX,
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Dismiss help text overlay"
                        onClick={() => setShowFullAnnotation(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                setShowFullAnnotation(false);
                            }
                        }}
                    >
                        {`ID: ${lastAnnotation.cellID}`}
                        <br />
                        <i>
                            click thumbnail in gallery
                            <br />
                            on the right to load in 3D
                        </i>
                    </div>,
                    document.body
                )}
            <Popover
                content={<PlotSettings />}
                title={
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        Plot settings
                        <Button
                            onClick={() => setShowConfigPopup(false)}
                            type="text"
                            size="small"
                            style={{ padding: "0px 4px" }}
                            title="Close plot settings"
                        >
                            <CloseOutlined />
                        </Button>
                    </div>
                }
                open={showConfigPopup}
                placement={"bottom"}
                onOpenChange={setShowConfigPopup}
                trigger={["click", "focus"]}
            >
                <div
                    style={{
                        position: "fixed",
                        top: `${configButtonPosition.top}px`,
                        right: `${configButtonPosition.right}px`,
                        width: "1px",
                        height: "1px",
                        pointerEvents: "none",
                    }}
                ></div>
            </Popover>
        </>
    );
};

export default MainPlot;
