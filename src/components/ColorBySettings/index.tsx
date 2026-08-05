import { Col, Slider } from "antd";
import React, { ReactElement, useState } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import selectionStateBranch from "../../state/selection";
import { SetPointOpacityAction, SetPointRadiusAction } from "../../state/selection/types";
import { State } from "../../state/types";
import { useDebouncedSetter } from "../../hooks";

type PropsFromState = {
    pointOpacity: number;
    pointRadius: number;
};

type DispatchProps = {
    handleSetPointOpacity: ActionCreator<SetPointOpacityAction>;
    handleSetPointRadius: ActionCreator<SetPointRadiusAction>;
};

const ColorBySettings = (props: PropsFromState & DispatchProps): ReactElement => {
    const { pointOpacity, pointRadius, handleSetPointOpacity, handleSetPointRadius } = props;

    const [opacity, setOpacity] = useDebouncedSetter(pointOpacity, handleSetPointOpacity);
    const [radius, setRadius] = useDebouncedSetter(pointRadius, handleSetPointRadius);

    return (
        <Col>
            <Slider value={opacity} onChange={setOpacity} min={0} max={1} step={0.01}></Slider>
            <Slider value={radius} onChange={setRadius} min={1} max={10} step={0.25}></Slider>
        </Col>
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
)(ColorBySettings);
