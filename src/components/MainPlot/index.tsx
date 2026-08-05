import type {
    Annotations,
    ButtonClickEvent,
    Config,
    Data,
    Layout,
    PlotlyHTMLElement,
    PlotMouseEvent,
    PlotSelectionEvent,
} from "plotly.js";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import Plot from "react-plotly.js";

import { GENERAL_PLOT_SETTINGS } from "../../constants";
import { TickConversion } from "../../state/selection/types";

import styles from "./style.css";
import { Popover } from "antd";
import PlotSettings from "../PlotSettings";

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

    React.useEffect(() => {
        // Using Plotly's relayout-function with graph-name and
        // the variable with the new height and width
        const resize = () => setHeight(window.innerHeight);
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

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
    const configPopupContainerRef = React.useRef<HTMLDivElement | null>(null);
    const onClickConfigButton = React.useCallback((gd: PlotlyHTMLElement, ev: MouseEvent): void => {
        const boundingRect = gd.getBoundingClientRect();
        if (!boundingRect) {
            return;
        }
        // Position the popup container by the button
        const x = boundingRect.left + boundingRect.width / 2;
        const y = boundingRect.top + boundingRect.height / 2;
        console.log("Config button clicked at", x, y);
        // configPopupContainerRef.current?.setAttribute(
        //     "style",
        //     `position: fixed; top: ${y}px; left: ${x}px;`
        // );
        setShowConfigPopup((prev) => !prev);
        configPopupContainerRef.current?.click();
    }, []);
    const config = React.useMemo(
        (): Partial<Plotly.Config> => ({
            ...PLOT_CONFIG,
            modeBarButtonsToAdd: [
                {
                    name: "config",
                    title: "Configure plot",
                    icon: {
                        width: 500,
                        height: 600,
                        path: "M224 512c35.32 0 63.97-28.65 63.97-64H160.03c0 35.35 28.65 64 63.97 64zm215.39-149.71c-19.32-20.76-55.47-51.99-55.47-154.29 0-77.7-54.48-139.9-127.94-155.16V32c0-17.67-14.32-32-31.98-32s-31.98 14.33-31.98 32v20.84C118.56 68.1 64.08 130.3 64.08 208c0 102.3-36.15 133.53-55.47 154.29-6 6.45-8.66 14.16-8.61 21.71.11 16.4 12.98 32 32.1 32h383.8c19.12 0 32-15.6 32.1-32 .05-7.55-2.61-15.27-8.61-21.71z",
                    },
                    click: onClickConfigButton,
                },
            ],
        }),
        []
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
                onAfterPlot={computeHelpTextPos}
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
                open={showConfigPopup}
                placement={"bottom"}
                onOpenChange={(open) => setShowConfigPopup(open)}
                trigger={["click", "focus"]}
            >
                <div
                    ref={configPopupContainerRef}
                    style={{
                        position: "fixed",
                        top: "205px",
                        right: "160px",
                        width: "5px",
                        height: "5px",
                        background: "#ff0000",
                    }}
                ></div>
            </Popover>
        </>
    );
};

export default MainPlot;
