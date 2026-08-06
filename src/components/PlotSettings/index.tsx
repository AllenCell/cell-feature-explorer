import { Button, Col, Slider } from "antd";
import React, { ReactElement, useState } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import selectionStateBranch from "../../state/selection";
import { SetPointOpacityAction, SetPointRadiusAction } from "../../state/selection/types";
import { State } from "../../state/types";
import { useDebouncedSetter } from "../../hooks";
import LabeledSlider from "../LabeledSlider";
import { CloseOutlined } from "@ant-design/icons";

type PropsFromState = {
    pointOpacity: number;
    pointRadius: number;
};

type DispatchProps = {
    handleSetPointOpacity: ActionCreator<SetPointOpacityAction>;
    handleSetPointRadius: ActionCreator<SetPointRadiusAction>;
};

type PlotSettingsProps = PropsFromState &
    DispatchProps & {
        onClickClose?: () => void;
    };

const SETTINGS_LABEL_WIDTH = "110px";

const PlotSettings = (props: PlotSettingsProps): ReactElement => {
    const { pointOpacity, pointRadius, handleSetPointOpacity, handleSetPointRadius } = props;

    const [opacity, setOpacity] = useDebouncedSetter(pointOpacity, handleSetPointOpacity);
    const [radius, setRadius] = useDebouncedSetter(pointRadius, handleSetPointRadius);

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "250px" }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                <p style={{ fontSize: "1.2em", margin: " 0 0 8px 0" }}>Point settings</p>
                <Button
                    onClick={props.onClickClose}
                    type="text"
                    size="small"
                    style={{ padding: "0px 4px" }}
                >
                    <CloseOutlined />
                </Button>
            </div>
            <LabeledSlider
                label="Opacity"
                labelWidth={SETTINGS_LABEL_WIDTH}
                sliderProps={{
                    value: Math.round(opacity * 100),
                    onChange: (value) => setOpacity(Math.round(value) / 100),
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
                label="Radius"
                labelWidth={SETTINGS_LABEL_WIDTH}
                sliderProps={{
                    value: radius,
                    onChange: setRadius,
                    min: 1,
                    max: 10,
                    step: 1,
                    marks: { 4: <></> },
                    tooltip: {
                        formatter: (value) => (value !== undefined ? value.toFixed(1) : ""),
                    },
                }}
            ></LabeledSlider>
        </div>
    );
};

function mapStateToProps(state: State): PropsFromState {
    return {
        pointOpacity: selectionStateBranch.selectors.getPointOpacity(state),
        pointRadius: selectionStateBranch.selectors.getPointRadius(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    handleSetPointOpacity: selectionStateBranch.actions.setPointOpacity,
    handleSetPointRadius: selectionStateBranch.actions.setPointRadius,
};
export default connect<PropsFromState, DispatchProps, {}, State>(
    mapStateToProps,
    dispatchToPropsMap
)(PlotSettings);
