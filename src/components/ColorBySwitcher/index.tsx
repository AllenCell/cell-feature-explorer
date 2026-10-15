import { Col, Row, Switch } from "antd";
import React from "react";

import styles from "./style.module.css";

interface ColorBySwitcherProps {
    defaultChecked: boolean;
    label: string;
    handleChange: (on: boolean) => void;
    includeCol?: number;
    checkedChildren?: string;
    unCheckedChildren?: string;
    children?: React.ReactNode;
}

const ColorBySwitcher: React.FC<ColorBySwitcherProps> = (props) => {
    return props.includeCol ? (
        <Row className={styles.colorByRow} align="middle">
            <Col span={props.includeCol}>
                <label className={styles.label}>Color by:</label>
                <Switch
                    className={styles.colorBySwitch}
                    defaultChecked={props.defaultChecked}
                    checkedChildren={props.checkedChildren}
                    unCheckedChildren={props.unCheckedChildren}
                    onChange={props.handleChange}
                />
            </Col>
            {props.children}
        </Row>
    ) : (
        <Row className={styles.colorByRow} align="middle">
            <label className={styles.label}>{props.label}</label>
            <Switch
                className={styles.colorBySwitch}
                defaultChecked={props.defaultChecked}
                onChange={props.handleChange}
            />
        </Row>
    );
};

export default ColorBySwitcher;
