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
import {
    getConnectByCategory,
    getConnectByFeature,
    getFeatureDefTooltip,
    getShowConnectLines,
} from "../../state/selection/selectors";

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
            {showConnectionsCheckbox}{" "}
            <label htmlFor={ConnectByControlHtmlIds.SHOW_CONNECTIONS_CHECKBOX}>Connect</label>
            {connectByCategoryDropdown} by {connectByFeatureDropdown}
        </div>
    );
}

function mapStateToProps(state: State): ConnectByControlStateProps {
    return {
        connectByFeature: getConnectByFeature(state),
        connectByCategory: getConnectByCategory(state),
        showConnectedPoints: getShowConnectLines(state),
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
