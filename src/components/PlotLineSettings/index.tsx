import React, { ReactElement } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import {
    SetLineAverageWindowAction,
    SetLineDefaultColorAction,
    SetLineOpacityAction,
    SetLineWidthAction,
} from "../../state/selection/types";
import { State } from "../../state/types";
import { useDebouncedSetter } from "../../hooks";
import LabeledSlider from "../LabeledSlider";
import {
    getLineDefaultColor,
    getLineMovingAverageWindow,
    getLineOpacity,
    getLineWidth,
} from "../../state/selection/selectors";
import {
    setConnectLineDefaultColor,
    setConnectLineAverageWindow,
    setConnectLineWidth,
    setConnectLineOpacity,
} from "../../state/selection/actions";
import ResettableColorPicker from "../ResettableColorPicker";
import { GENERAL_PLOT_SETTINGS, PALETTE } from "../../constants";
import InlineHint from "../InlineHint";

type PropsFromState = {
    lineAverageWindow: number;
    lineWidth: number;
    lineDefaultColor: string;
    lineOpacity: number;
};

type DispatchProps = {
    handleSetLineAverageWindow: ActionCreator<SetLineAverageWindowAction>;
    handleSetLineOpacity: ActionCreator<SetLineOpacityAction>;
    handleSetLineWidth: ActionCreator<SetLineWidthAction>;
    handleSetLineDefaultColor: ActionCreator<SetLineDefaultColorAction>;
};

type PlotLineSettingsProps = PropsFromState &
    DispatchProps & {
        labelWidth?: string;
    };

const PlotLineSettings = (props: PlotLineSettingsProps): ReactElement => {
    const [lineAverageWindow, setLineAverageWindow] = useDebouncedSetter(
        props.lineAverageWindow,
        props.handleSetLineAverageWindow
    );
    const [lineWidth, setLineWidth] = useDebouncedSetter(props.lineWidth, props.handleSetLineWidth);
    const [lineOpacity, setLineOpacity] = useDebouncedSetter(
        props.lineOpacity,
        props.handleSetLineOpacity
    );
    const [lineDefaultColor, setLineDefaultColor] = useDebouncedSetter(
        props.lineDefaultColor,
        props.handleSetLineDefaultColor
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <p style={{ fontWeight: 600, marginBottom: 0, color: PALETTE.white }}>Line settings</p>
            <LabeledSlider
                label={
                    <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
                        Average window
                        <InlineHint title="Total number of points to average over, including past and future." />
                    </div>
                }
                id={"line-average-window-input"}
                labelWidth={props.labelWidth}
                sliderProps={{
                    value: lineAverageWindow,
                    onChange: setLineAverageWindow,
                    min: 1,
                    max: 31,
                    step: 2,
                }}
                inputMin={1}
                inputMax={101}
            ></LabeledSlider>
            <LabeledSlider
                label="Opacity"
                labelWidth={props.labelWidth}
                sliderProps={{
                    value: Math.round(lineOpacity * 100),
                    onChange: (value) => setLineOpacity(Math.round(value) / 100),
                    min: 0,
                    max: 100,
                    step: 5,
                    marks: { 50: <></> },
                    tooltip: {
                        formatter: (value) => (value !== undefined ? `${value}%` : ""),
                    },
                }}
            ></LabeledSlider>
            <LabeledSlider
                label="Line width"
                labelWidth={props.labelWidth}
                sliderProps={{
                    value: lineWidth,
                    onChange: setLineWidth,
                    min: 0.1,
                    max: 3.5,
                    step: 0.1,
                    marks: { 1.5: <></> },
                    tooltip: {
                        formatter: (value) => value?.toFixed(1),
                    },
                }}
                inputMin={0}
                inputMax={100}
            ></LabeledSlider>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    marginTop: "4px",
                }}
            >
                <label style={{ width: props.labelWidth }}>Default color</label>
                <ResettableColorPicker
                    value={lineDefaultColor}
                    onChange={(color) => {
                        setLineDefaultColor(color.toHexString());
                    }}
                    size="small"
                    onReset={function (): void {
                        setLineDefaultColor(GENERAL_PLOT_SETTINGS.connectionLineDefaultColor);
                    }}
                ></ResettableColorPicker>
            </div>
        </div>
    );
};

function mapStateToProps(state: State): PropsFromState {
    return {
        lineAverageWindow: getLineMovingAverageWindow(state),
        lineWidth: getLineWidth(state),
        lineOpacity: getLineOpacity(state),
        lineDefaultColor: getLineDefaultColor(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    handleSetLineAverageWindow: setConnectLineAverageWindow,
    handleSetLineDefaultColor: setConnectLineDefaultColor,
    handleSetLineWidth: setConnectLineWidth,
    handleSetLineOpacity: setConnectLineOpacity,
};
export default connect<PropsFromState, DispatchProps, unknown, State>(
    mapStateToProps,
    dispatchToPropsMap
)(PlotLineSettings);
