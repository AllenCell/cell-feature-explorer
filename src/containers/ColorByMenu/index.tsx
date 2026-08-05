import { Checkbox, Col, Collapse, Row } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
// import { RadioChangeEvent } from "antd/es/radio";
import { filter, includes } from "lodash";
import React from "react";
import { connect } from "react-redux";
import type { ActionCreator } from "redux";

import FeatureSelectDropdown from "../../components/FeatureSelectDropdown";
import InteractiveLegend from "../../components/InteractiveLegend";
import ColorBySwitcher from "../../components/ColorBySwitcher";
import ColorLegendRow from "../../components/ColorLegend";
import {
    COLOR_BY_SELECTOR,
    DOWNLOAD_CONFIG_TYPE_PROTEIN,
    DOWNLOAD_CONFIG_TYPE_SELECTION_SET,
} from "../../constants";
import metadataStateBranch from "../../state/metadata";
import { MappingOfMeasuredValuesArrays, MeasuredFeatureDef } from "../../state/metadata/types";
import selectionStateBranch from "../../state/selection";
import { getFeatureDefTooltip, getDownloadRoot } from "../../state/selection/selectors";

import {
    BoolToggleAction,
    ChangeDownloadConfigAction,
    ChangeGroupByCategory,
    ChangeSelectionAction,
    ColorForPlot,
    DeselectGroupOfPointsAction,
    DownloadConfig,
    SelectAxisAction,
    SetColorOverrideAction,
} from "../../state/selection/types";
import { State } from "../../state/types";
import { getColorByDisplayOptions, getGroupByDisplayOptions } from "../MainPlotContainer/selectors";

import {
    createUrlFromListOfIds,
    getCheckAllCheckboxIsIntermediate,
    getLegendColors,
    getGroupByTitle,
    getInteractivePanelData,
    getSelectionPanelData,
} from "./selectors";
import { PanelData } from "./types";

import styles from "./style.css";
import { MISSING_CATEGORY_COLOR, MISSING_CATEGORY_LABEL } from "../../state/selection/constants";

// const initIndex = 2;

const { Panel } = Collapse;

interface PropsFromState {
    // selector props
    colorBy: keyof MappingOfMeasuredValuesArrays;
    groupBy: keyof MappingOfMeasuredValuesArrays;
    downloadUrls: string[];
    downloadConfig: DownloadConfig;
    downloadRoot: string;
    filtersToExclude: string[];
    interactivePanelData: PanelData[];
    selectionSetsPanelData: PanelData[];
    isInIndeterminateState: boolean;
    colorByMenuOptions: MeasuredFeatureDef[];
    groupByDisplayOptions: MeasuredFeatureDef[];
    colorForPlot: ColorForPlot[];
    categoryCounts: number[];
    categoricalFeatures: string[];
    groupByTitle: string;
}

interface DispatchProps {
    handleApplyColorSwitchChange: ActionCreator<BoolToggleAction>;
    handleChangeAxis: ActionCreator<SelectAxisAction>;
    handleChangeGroupByCategory: ActionCreator<ChangeGroupByCategory>;
    handleCloseSelectionSet: ActionCreator<DeselectGroupOfPointsAction>;
    handleFilterByCategoryName: ActionCreator<ChangeSelectionAction>;
    handleChangeDownloadSettings: ActionCreator<ChangeDownloadConfigAction>;
    handleSetColorOverride: ActionCreator<SetColorOverrideAction>;
}

interface PropsFromApp {
    // props from <App />
    panelKeys: string[];
    openKeys: string[];
    defaultActiveKey: string[];
    onPanelClicked: (value: string[]) => void;
}

type ColorByMenuProps = PropsFromApp & PropsFromState & DispatchProps;

class ColorByMenu extends React.Component<ColorByMenuProps> {
    // submenu keys of first level

    private setColorTimeouts: Map<number, ReturnType<typeof setTimeout>> = new Map();

    constructor(props: ColorByMenuProps) {
        super(props);
        this.onBarClicked = this.onBarClicked.bind(this);
        this.onActivePanelChange = this.onActivePanelChange.bind(this);
        this.renderTaggedStructuresPanel = this.renderTaggedStructuresPanel.bind(this);
        this.renderSelectionPanel = this.renderSelectionPanel.bind(this);
        this.allOnOff = this.allOnOff.bind(this);
        this.onCategorySetDownloadButtonClicked =
            this.onCategorySetDownloadButtonClicked.bind(this);
        this.onSelectionSetDownloadButtonClicked =
            this.onSelectionSetDownloadButtonClicked.bind(this);
    }

    public onBarClicked({ target }: CheckboxChangeEvent) {
        const { handleFilterByCategoryName, filtersToExclude } = this.props;
        const newFilterList = includes(filtersToExclude, target.value)
            ? filter(filtersToExclude, (e) => e !== target.value)
            : [...filtersToExclude, target.value];
        handleFilterByCategoryName(newFilterList);
    }

    public onCategorySetDownloadButtonClicked(categoryName: string) {
        const { handleChangeDownloadSettings } = this.props;
        handleChangeDownloadSettings({
            key: categoryName,
            type: DOWNLOAD_CONFIG_TYPE_PROTEIN,
        });
    }

    public onSelectionSetDownloadButtonClicked(selectionSetId: string) {
        const { handleChangeDownloadSettings } = this.props;
        handleChangeDownloadSettings({
            key: selectionSetId,
            type: DOWNLOAD_CONFIG_TYPE_SELECTION_SET,
        });
    }

    public allOnOff({ target }: CheckboxChangeEvent) {
        const { handleFilterByCategoryName, interactivePanelData } = this.props;
        if (target.checked) {
            return handleFilterByCategoryName([]);
        }
        const keys = interactivePanelData.map((ele: PanelData) => ele.id);
        handleFilterByCategoryName(keys);
    }

    public onActivePanelChange(value: string | string[]) {
        const { onPanelClicked } = this.props;
        onPanelClicked(value as string[]);
    }

    public renderSelectionPanel() {
        const {
            downloadUrls,
            downloadConfig,
            downloadRoot,
            handleApplyColorSwitchChange,
            selectionSetsPanelData,
            handleCloseSelectionSet,
        } = this.props;
        return selectionSetsPanelData.length === 0 ? (
            <span>
                No selected sets yet. Make a selection on the plot using the
                <strong> Lasso Select</strong> or
                <strong> Box Select</strong> tools on the plot, and it will get saved here.
            </span>
        ) : (
            <React.Fragment>
                <ColorBySwitcher
                    defaultChecked={true}
                    handleChange={handleApplyColorSwitchChange}
                    label="Show selections: "
                />
                <div>
                    <InteractiveLegend
                        closeable={true}
                        hideable={false}
                        showTooltips={false}
                        handleCloseSelectionSet={handleCloseSelectionSet}
                        panelData={selectionSetsPanelData}
                        downloadUrls={downloadUrls}
                        downloadConfig={downloadConfig}
                        downloadRoot={downloadRoot}
                        handleDownload={this.onSelectionSetDownloadButtonClicked}
                    />
                </div>
            </React.Fragment>
        );
    }

    public componentWillUnmount(): void {
        this.setColorTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.setColorTimeouts.clear();
    }

    /** Sets a color at an index with some debounce to prevent rapid updates. */
    private setColorWithDebounce(index: number, color: string | undefined) {
        // Clear any existing timeouts for this index
        if (this.setColorTimeouts.has(index)) {
            clearTimeout(this.setColorTimeouts.get(index));
            this.setColorTimeouts.delete(index);
        }
        const timerId = setTimeout(() => {
            this.props.handleSetColorOverride({ index, color });
            this.setColorTimeouts.delete(index);
        }, 100);
        this.setColorTimeouts.set(index, timerId);
    }

    public renderTaggedStructuresPanel() {
        const {
            filtersToExclude,
            isInIndeterminateState,
            interactivePanelData,
            downloadUrls,
            downloadConfig,
            downloadRoot,
            colorBy,
            groupBy,
            colorByMenuOptions,
            groupByDisplayOptions,
            handleChangeAxis,
            handleChangeGroupByCategory,
            colorForPlot,
            categoryCounts,
            categoricalFeatures,
        } = this.props;

        const showColorLegend = includes(categoricalFeatures, colorBy) && colorBy !== groupBy;
        return (
            <React.Fragment>
                <Row className={styles.featureSelectRow}>
                    <Col span={4}>Color by:</Col>
                    <Col span={20}>
                        <FeatureSelectDropdown
                            value={colorBy.toString()}
                            options={colorByMenuOptions}
                            onChange={(v: string) => {
                                handleChangeAxis(COLOR_BY_SELECTOR, v);
                            }}
                            tooltip={getFeatureDefTooltip(colorBy.toString(), colorByMenuOptions)}
                        />
                    </Col>
                </Row>
                <Row className={styles.featureSelectRow}>
                    <Col span={4}>Group by:</Col>
                    <Col span={20}>
                        <FeatureSelectDropdown
                            value={groupBy.toString()}
                            options={groupByDisplayOptions}
                            onChange={(v: string) => {
                                handleChangeGroupByCategory(v);
                            }}
                            tooltip={getFeatureDefTooltip(
                                groupBy.toString(),
                                groupByDisplayOptions
                            )}
                        />
                    </Col>
                </Row>
                <div className={styles.interactiveLegendContainer}>
                    <div>
                        <div className={styles.interactiveLegendHeader}>
                            <Checkbox
                                indeterminate={isInIndeterminateState}
                                checked={filtersToExclude.length === 0}
                                onChange={this.allOnOff}
                            >
                                Show/Hide all
                            </Checkbox>
                            <span className={styles.label}># of cells</span>
                        </div>

                        <InteractiveLegend
                            closeable={false}
                            showTooltips={true}
                            panelData={interactivePanelData}
                            downloadUrls={downloadUrls}
                            downloadConfig={downloadConfig}
                            downloadRoot={downloadRoot}
                            hideable={true}
                            setColor={
                                groupBy === colorBy
                                    ? (index, color) => {
                                          this.setColorWithDebounce(index, color);
                                      }
                                    : undefined
                            }
                            onBarClicked={this.onBarClicked}
                            handleDownload={this.onCategorySetDownloadButtonClicked}
                        />
                    </div>
                    {showColorLegend && (
                        <Row className={styles.featureSelectRow}>
                            <div className={styles.interactiveLegendHeader}>
                                <div> Color legend </div>
                                <span className={styles.label}># of cells</span>
                            </div>
                            {colorForPlot.map((ele, index) => {
                                // Do not allow color picking for the fallback category.
                                const isFallbackCategory =
                                    ele.color === MISSING_CATEGORY_COLOR &&
                                    ele.label === MISSING_CATEGORY_LABEL;
                                const setColorCallback = isFallbackCategory
                                    ? undefined
                                    : (color: string | undefined) =>
                                          this.setColorWithDebounce(index, color);
                                return (
                                    <ColorLegendRow
                                        color={ele.color}
                                        name={ele.label}
                                        key={ele.name}
                                        total={categoryCounts[index]}
                                        setColor={setColorCallback}
                                    />
                                );
                            })}
                        </Row>
                    )}
                </div>
            </React.Fragment>
        );
    }

    public render() {
        const { defaultActiveKey, openKeys, panelKeys } = this.props;
        return (
            <Collapse
                className={styles.collapse}
                defaultActiveKey={defaultActiveKey}
                activeKey={openKeys}
                onChange={this.onActivePanelChange}
            >
                <Panel key={panelKeys[0]} header={`Plot configuration`}>
                    {this.renderTaggedStructuresPanel()}
                </Panel>
                <Panel key={panelKeys[1]} header="Selected sets">
                    {this.renderSelectionPanel()}
                </Panel>
            </Collapse>
        );
    }
}

function mapStateToProps(state: State): PropsFromState {
    return {
        categoryCounts: selectionStateBranch.selectors.getColorByCategoryCounts(state),
        colorBy: selectionStateBranch.selectors.getColorBySelection(state),
        groupBy: selectionStateBranch.selectors.getGroupByCategory(state),
        colorByMenuOptions: getColorByDisplayOptions(state),
        groupByDisplayOptions: getGroupByDisplayOptions(state),
        colorForPlot: getLegendColors(state),
        categoricalFeatures: metadataStateBranch.selectors.getCategoricalFeatureKeys(state),
        downloadConfig: selectionStateBranch.selectors.getDownloadConfig(state),
        downloadUrls: createUrlFromListOfIds(state),
        downloadRoot: getDownloadRoot(state),
        filtersToExclude: selectionStateBranch.selectors.getFiltersToExclude(state),
        groupByTitle: getGroupByTitle(state),
        interactivePanelData: getInteractivePanelData(state),
        selectionSetsPanelData: getSelectionPanelData(state),
        isInIndeterminateState: getCheckAllCheckboxIsIntermediate(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    handleApplyColorSwitchChange: selectionStateBranch.actions.toggleApplySelectionSetColors,
    handleChangeAxis: selectionStateBranch.actions.changeAxis,
    handleChangeGroupByCategory: selectionStateBranch.actions.changeGroupByCategory,
    handleChangeDownloadSettings: selectionStateBranch.actions.changeDownloadSettings,
    handleCloseSelectionSet: selectionStateBranch.actions.deselectGroupOfPoints,
    handleFilterByCategoryName: selectionStateBranch.actions.toggleFilterByCategoryName,
    handleSetColorOverride: selectionStateBranch.actions.setColorOverride,
};
export default connect<PropsFromState, DispatchProps, PropsFromApp, State>(
    mapStateToProps,
    dispatchToPropsMap
)(ColorByMenu);
