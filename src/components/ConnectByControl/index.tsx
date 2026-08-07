import React, { ReactElement } from "react";
import { connect } from "react-redux";

import selectionStateBranch from "../../state/selection";
import { State } from "../../state";
import { Row } from "antd";

type ConnectByControlStateProps = {
    connectByFeature: string;
    connectByCategory: string;
    showConnectedPoints: boolean;
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
    return (
        <Row>
            Connect {props.connectByCategory} by {props.connectByFeature}
        </Row>
    );
}

function mapStateToProps(state: any): ConnectByControlStateProps {
    return {
        connectByFeature: state.selection.connectByFeature,
        connectByCategory: state.selection.connectByCategory,
        showConnectedPoints: state.selection.showConnectedPoints,
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
