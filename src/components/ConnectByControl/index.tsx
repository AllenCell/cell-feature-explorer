import { Checkbox } from "antd";
import React, { ReactElement } from "react";
import { connect } from "react-redux";

import {
    getColorByDisplayOptions,
    getGroupByDisplayOptions,
} from "../../containers/MainPlotContainer/selectors";
import FeatureSelectDropdown from "../FeatureSelectDropdown";
import { State } from "../../state";
import { MeasuredFeatureDef } from "../../state/metadata/types";
import selectionStateBranch from "../../state/selection";
import { getFeatureDefTooltip } from "../../state/selection/selectors";
import VisuallyHidden from "../VisuallyHidden";

import styles from "./style.css";

type ConnectByControlStateProps = {
    connectByFeature: string;
    connectByCategory: string;
    showConnectedPoints: boolean;
    featureMenuOptions: MeasuredFeatureDef[];
    groupByMenuOptions: MeasuredFeatureDef[];
};

type ConnectByControlDispatchProps = {
    handleChangeConnectByFeature: (feature: string) => void;
    handleChangeConnectByCategory: (category: string) => void;
    handleSetShowConnectedPoints: (visible: boolean) => void;
};

type ConnectByControlProps = ConnectByControlStateProps & ConnectByControlDispatchProps;

const enum ConnectByControlHtmlIds {
    SHOW_CONNECTIONS_CHECKBOX = "show-connections-checkbox",
    CONNECT_BY_FEATURE_SELECT = "connect-by-feature-select",
    CONNECT_BY_CATEGORY_SELECT = "connect-by-category-select",
}

function ConnectByControl(props: ConnectByControlProps): ReactElement {
    const showConnectionsCheckbox = (
        <div>
            <Checkbox
                id={ConnectByControlHtmlIds.SHOW_CONNECTIONS_CHECKBOX}
                checked={props.showConnectedPoints}
                onChange={(e) => props.handleSetShowConnectedPoints(e.target.checked)}
            ></Checkbox>
            <VisuallyHidden>
                <label htmlFor={ConnectByControlHtmlIds.SHOW_CONNECTIONS_CHECKBOX}>
                    Show connecting lines between points
                </label>
            </VisuallyHidden>
        </div>
    );

    const connectByCategoryDropdown = (
        <FeatureSelectDropdown
            id={ConnectByControlHtmlIds.CONNECT_BY_CATEGORY_SELECT}
            value={props.connectByCategory}
            options={props.groupByMenuOptions}
            onChange={(v: string) => {
                props.handleChangeConnectByCategory(v);
            }}
            tooltip={getFeatureDefTooltip(props.connectByCategory, props.groupByMenuOptions)}
            className={styles.connectByDropdown}
        />
    );

    const connectByFeatureDropdown = (
        <FeatureSelectDropdown
            id={ConnectByControlHtmlIds.CONNECT_BY_FEATURE_SELECT}
            value={props.connectByFeature}
            options={props.featureMenuOptions}
            onChange={(v: string) => {
                props.handleChangeConnectByFeature(v);
            }}
            tooltip={getFeatureDefTooltip(props.connectByFeature, props.featureMenuOptions)}
            className={styles.connectByDropdown}
        />
    );

    return (
        <div className={styles.connectByRow}>
            {showConnectionsCheckbox} Connect {connectByCategoryDropdown} by{" "}
            {connectByFeatureDropdown}
        </div>
    );
}

function mapStateToProps(state: any): ConnectByControlStateProps {
    return {
        connectByFeature: state.selection.connectByFeature,
        connectByCategory: state.selection.connectByCategory,
        showConnectedPoints: state.selection.showConnectedPoints,
        featureMenuOptions: getColorByDisplayOptions(state),
        groupByMenuOptions: getGroupByDisplayOptions(state),
    };
}

const dispatchToProps: ConnectByControlDispatchProps = {
    handleChangeConnectByFeature: selectionStateBranch.actions.changeConnectByFeature,
    handleChangeConnectByCategory: selectionStateBranch.actions.changeConnectByCategory,
    handleSetShowConnectedPoints: selectionStateBranch.actions.setShowConnectLines,
};

export default connect<ConnectByControlStateProps, ConnectByControlDispatchProps, unknown, State>(
    mapStateToProps,
    dispatchToProps
)(ConnectByControl);
