import { Layout } from "antd";
import { uniq } from "lodash";
import * as React from "react";

import ColorByMenu from "../../containers/ColorByMenu";
import MainPlotContainer from "../../containers/MainPlotContainer";

const { Content, Sider } = Layout;

import styles from "./style.module.css";

class PlotTab extends React.Component {
    private static panelKeys = ["groupings", "selections"];
    public state = {
        defaultActiveKey: [PlotTab.panelKeys[0]],
        openKeys: [PlotTab.panelKeys[0]],
        width: window.innerWidth,
    };

    public onSelectionToolUsed = () => {
        this.setState({ openKeys: uniq([...this.state.openKeys, PlotTab.panelKeys[1]]) });
    };

    public onPanelClicked = (value: string[]) => {
        this.setState({ openKeys: value });
    };

    public render() {
        const { openKeys, defaultActiveKey } = this.state;
        return (
            <Layout>
                <Sider
                    className={styles.colorMenu}
                    width={500}
                    collapsible={false}
                    collapsedWidth={250}
                >
                    <ColorByMenu
                        panelKeys={PlotTab.panelKeys}
                        openKeys={openKeys}
                        defaultActiveKey={defaultActiveKey}
                        onPanelClicked={this.onPanelClicked}
                    />
                </Sider>
                <Content className={styles.content}>
                    <div>
                        <MainPlotContainer handleSelectionToolUsed={this.onSelectionToolUsed} />
                    </div>
                </Content>
            </Layout>
        );
    }
}

export default PlotTab;
