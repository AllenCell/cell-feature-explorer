import { ConfigProvider, Layout, theme } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import classNames from "classnames";

import AllenCellHeader from "../../components/AppHeader";
import { PALETTE } from "../../constants";
import metadataStateBranch from "../../state/metadata";
import selectionStateBranch from "../../state/selection";
import imageDatasetStateBranch from "../../state/image-dataset";
import LandingPage from "../../components/LandingPage";
import Cfe from "../Cfe";
import LoadingOverlay from "../../components/LoadingOverlay";
import { State } from "../../state/types";
import { ChangeSelectionAction } from "../../state/selection/types";
import { LoadCsvDatasetAction, Megaset } from "../../state/image-dataset/types";
import { RequestAction } from "../../state/metadata/types";
import { fetchCsvText } from "../../util";
import { CSV_DATASET_NAME } from "../../state/selection/constants";

import styles from "./style.module.css";

const { Header } = Layout;

interface AppProps {
    isLoading: boolean;
    loadingText: string;
    changeDataset: (id: string) => ChangeSelectionAction;
    selectedDataset: string;
    requestAvailableDatasets: () => RequestAction;
    megasets: Megaset[];
    loadCsvDataset: (fileContents: string) => LoadCsvDatasetAction;
    csvUrl: string;
}

const { darkAlgorithm } = theme;

const configProviderTheme = {
    algorithm: darkAlgorithm,
    token: {
        colorPrimary: PALETTE.purple,
        colorBgBase: PALETTE.darkGray,
        colorTextHeading: PALETTE.white,
        fontWeightStrong: 600,
        borderRadius: 4,
        borderRadiusSM: 4,
        borderRadiusLG: 4,
        colorLink: PALETTE.brightBlue,
        colorLinkHover: PALETTE.linkHover,
        colorIcon: PALETTE.white,
        colorBgElevated: PALETTE.darkGray,
    },
    components: {
        Badge: {
            dotSize: 10,
        },
        Button: {
            colorPrimary: PALETTE.purple,
            primaryShadow: "0 0px 0 transparent",
            defaultShadow: "0 0px 0 transparent",
        },
        Checkbox: {
            borderRadiusSM: 2,
        },
        Collapse: {
            contentBg: PALETTE.collapseContentGray,
            headerBg: PALETTE.collapseHeaderGray,
        },
        Layout: {
            headerBg: PALETTE.headerGray,
            headerColor: PALETTE.white,
            siderBg: PALETTE.collapseContentGray,
        },
        Modal: {
            contentBg: PALETTE.extraLightGray,
            headerBg: PALETTE.extraLightGray,
            colorIcon: PALETTE.mediumGray,
        },
        Menu: {
            colorBgElevated: PALETTE.darkGray,
        },
        Select: {
            // Dropdown arrow color
            colorTextQuaternary: PALETTE.white,
        },
        Slider: {
            trackBg: PALETTE.lightGray,
            trackHoverBg: PALETTE.extraLightGray,
            handleColor: PALETTE.white,
            dotActiveBorderColor: PALETTE.white,
            handleActiveColor: PALETTE.white,
            colorPrimaryBorderHover: PALETTE.white,
        },
        Tooltip: {
            colorBgSpotlight: "rgba(0, 0, 0, 0.85)",
        },
    },
};

class App extends React.Component<AppProps> {
    public componentDidMount = () => {
        if (this.props.selectedDataset === CSV_DATASET_NAME) {
            if (this.props.csvUrl) {
                try {
                    fetchCsvText(this.props.csvUrl).then(({ text }) =>
                        this.props.loadCsvDataset(text)
                    );
                } catch (e) {
                    // TODO: Add a component to show error messages to the user
                    console.error("Error loading CSV dataset from URL:", e);
                    this.props.changeDataset("");
                }
            } else {
                // Dataset is a CSV but no URL is provided, so it was loaded from a local file.
                // Return user to the landing page.
                // TODO: Prompt user to re-upload the file instead
                this.props.changeDataset("");
            }
        }
        this.props.requestAvailableDatasets();
    };

    public handleSelectDataset = (id: string) => {
        this.props.changeDataset(id);
    };

    public render() {
        const { isLoading, loadingText, selectedDataset, megasets } = this.props;
        const showLoadingOverlay = isLoading && !!selectedDataset;
        const layoutClassnames = classNames([
            styles.container,
            { [styles.isLoading]: showLoadingOverlay },
        ]);

        return (
            <ConfigProvider theme={configProviderTheme}>
                <div
                    className={classNames([
                        styles.wrapper,
                        { [styles.isLoading]: showLoadingOverlay },
                    ])}
                >
                    <Layout className={layoutClassnames}>
                        <LoadingOverlay isLoading={showLoadingOverlay} loadingText={loadingText} />
                        <Header className={styles.navBar}>
                            <AllenCellHeader selectedDataset={selectedDataset} />
                        </Header>
                        <Layout>
                            {!!selectedDataset ? (
                                <Cfe />
                            ) : (
                                <LandingPage
                                    megasets={megasets}
                                    handleSelectDataset={this.handleSelectDataset}
                                />
                            )}
                        </Layout>
                    </Layout>
                </div>
            </ConfigProvider>
        );
    }
}

function mapStateToProps(state: State) {
    return {
        isLoading: metadataStateBranch.selectors.getIsLoading(state),
        loadingText: metadataStateBranch.selectors.getLoadingText(state),
        selectedDataset: selectionStateBranch.selectors.getSelectedDataset(state),
        megasets: metadataStateBranch.selectors.getMegasetsByNewest(state),
        csvUrl: selectionStateBranch.selectors.getCsvUrl(state),
    };
}

const dispatchToPropsMap = {
    changeDataset: selectionStateBranch.actions.changeDataset,
    requestAvailableDatasets: metadataStateBranch.actions.requestAvailableDatasets,
    loadCsvDataset: imageDatasetStateBranch.actions.loadCsvDataset,
};

export default connect(mapStateToProps, dispatchToPropsMap)(App);
