import { CloseOutlined } from "@ant-design/icons";
import { Button, Checkbox, Tooltip } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import React, { MouseEvent } from "react";

import { DownloadConfig } from "../../state/selection/types";
import ColorPickerBadge from "../ColorPickerBadge";
import DownloadDropDownMenu from "../DownloadDropDownMenu";

import styles from "./style.module.css";

interface InteractiveRowProps {
    color: string;
    id: string;
    name: string;
    total: number;
    checked?: boolean;
    closeable?: boolean;
    disabled: boolean;
    showTooltips: boolean;
    downloadConfig: DownloadConfig;
    downloadUrls: string[];
    downloadRoot: string;
    hideable?: boolean;
    setColor?: (color: string | undefined) => void;
    onBarClicked?: (clickEvent: CheckboxChangeEvent) => void;
    handleClose?: (id: number | string) => void;
    handleDownload: (id: string) => void;
}

export default class InteractiveRow extends React.Component<InteractiveRowProps> {
    private static defaultProps = {
        closeable: false,
        downloadUrls: [],
        hideable: true,
    };
    constructor(props: InteractiveRowProps) {
        super(props);
        this.onClose = this.onClose.bind(this);
    }

    public onClose({ currentTarget }: MouseEvent<HTMLButtonElement>) {
        const { handleClose } = this.props;
        if (currentTarget && currentTarget.id && handleClose) {
            handleClose(currentTarget.id);
        }
    }

    public render() {
        const {
            closeable,
            hideable,
            showTooltips,
            disabled,
            id,
            color,
            name,
            total,
            onBarClicked,
            checked,
            downloadUrls,
            downloadConfig,
            downloadRoot,
            handleDownload,
        } = this.props;

        const tooltip = <div>{id || "(missing data for this feature)"}</div>;

        const labelClassName = disabled ? styles.labelDisabled : styles.label;

        return (
            <div className={styles.container}>
                <div className={styles.firstColumn}>
                    {hideable && (
                        <Checkbox
                            onChange={onBarClicked}
                            value={id}
                            defaultChecked={true}
                            checked={checked}
                            disabled={disabled}
                        />
                    )}
                    <ColorPickerBadge color={color} setColor={this.props.setColor} name={name} />
                    {showTooltips ? (
                        <Tooltip placement="right" title={tooltip}>
                            <span className={labelClassName}>{name}</span>
                        </Tooltip>
                    ) : (
                        <span className={labelClassName}>{name}</span>
                    )}
                </div>
                <div>
                    <span className={labelClassName}>{total}</span>
                    <DownloadDropDownMenu
                        color={color}
                        id={id}
                        name={name}
                        total={total}
                        downloadConfig={downloadConfig}
                        downloadUrls={downloadUrls}
                        downloadRoot={downloadRoot}
                        handleDownload={handleDownload}
                    />
                    {closeable && (
                        <Button size="small" id={id} onClick={this.onClose}>
                            <CloseOutlined />
                        </Button>
                    )}
                </div>
            </div>
        );
    }
}
