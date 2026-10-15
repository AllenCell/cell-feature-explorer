import React from "react";

import ColorPickerBadge from "../ColorPickerBadge";

import styles from "./style.module.css";

interface InteractiveRowProps {
    color: string;
    name: string;
    total: number;
    setColor?: (color: string | undefined) => void;
}

export default class ColorLegendRow extends React.Component<InteractiveRowProps> {
    constructor(props: InteractiveRowProps) {
        super(props);
    }

    public render() {
        const { color, name, total } = this.props;

        return (
            <div className={styles.container}>
                <div className={styles.firstColumn}>
                    <ColorPickerBadge color={color} setColor={this.props.setColor} name={name} />
                    <span className={styles.label}>{name}</span>
                </div>
                <div>
                    <span className={styles.label}>{total}</span>
                </div>
            </div>
        );
    }
}
