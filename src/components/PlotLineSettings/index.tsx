import React, { ReactElement } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import selectionStateBranch from "../../state/selection";
import {
    SetLineAverageWindowAction,
    SetLineDefaultColorAction,
    SetLineWidthAction,
    SetPointOpacityAction,
    SetPointRadiusAction,
} from "../../state/selection/types";
import { State } from "../../state/types";
import { useDebouncedSetter } from "../../hooks";
import LabeledSlider from "../LabeledSlider";
import {
    getLineDefaultColor,
    getLineMovingAverageWindow,
    getLineWidth,
} from "../../state/selection/selectors";
import {
    setConnectLineDefaultColor,
    setConnectLineAverageWindow,
    setConnectLineWidth,
} from "../../state/selection/actions";
import { ColorPicker } from "antd";

type PropsFromState = {
    lineAverageWindow: number;
    lineWidth: number;
    lineDefaultColor: string;
};

type DispatchProps = {
    handleSetLineAverageWindow: ActionCreator<SetLineAverageWindowAction>;
    handleSetLineWidth: ActionCreator<SetLineWidthAction>;
    handleSetLineDefaultColor: ActionCreator<SetLineDefaultColorAction>;
};

type PlotSettingsProps = PropsFromState &
    DispatchProps & {
        labelWidth?: string;
    };

const PlotSettings = (props: PlotSettingsProps): ReactElement => {
    const [lineAverageWindow, setLineAverageWindow] = useDebouncedSetter(
        props.lineAverageWindow,
        props.handleSetLineAverageWindow
    );
    const [lineWidth, setLineWidth] = useDebouncedSetter(props.lineWidth, props.handleSetLineWidth);
    const [lineDefaultColor, setLineDefaultColor] = useDebouncedSetter(
        props.lineDefaultColor,
        props.handleSetLineDefaultColor
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <LabeledSlider
                label="Window size"
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
                label="Line width"
                labelWidth={props.labelWidth}
                sliderProps={{
                    value: lineWidth,
                    onChange: setLineWidth,
                    min: 1,
                    max: 10,
                    step: 1,
                    marks: { 4: <></> },
                }}
                inputMin={0}
                inputMax={100}
            ></LabeledSlider>
            <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
                <label style={{ width: props.labelWidth }}>Default color</label>
                <ColorPicker
                    value={lineDefaultColor}
                    onChange={(color) => {
                        setLineDefaultColor(color.toHexString());
                    }}
                    size="small"
                ></ColorPicker>
            </div>
        </div>
    );
};

function mapStateToProps(state: State): PropsFromState {
    return {
        lineAverageWindow: getLineMovingAverageWindow(state),
        lineWidth: getLineWidth(state),
        lineDefaultColor: getLineDefaultColor(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    handleSetLineAverageWindow: setConnectLineAverageWindow,
    handleSetLineDefaultColor: setConnectLineDefaultColor,
    handleSetLineWidth: setConnectLineWidth,
};
export default connect<PropsFromState, DispatchProps, unknown, State>(
    mapStateToProps,
    dispatchToPropsMap
)(PlotSettings);
