import { UndoOutlined } from "@ant-design/icons";
import { Button, ColorPicker, ColorPickerProps, Tooltip } from "antd";
import React, { PropsWithChildren, ReactElement, useRef } from "react";

import styles from "./styles.module.css";

type ResettableColorPickerProps = ColorPickerProps & {
    onReset: () => void;
};

/** An RGB color picker with a reset button that calls `onReset` when clicked */
export default function ResettableColorPicker(
    props: PropsWithChildren<ResettableColorPickerProps>
): ReactElement {
    const { onReset, children, ...colorPickerProps } = props;
    const popupContainerRef = useRef<HTMLDivElement>(null);
    const buttonContainerRef = useRef<HTMLDivElement>(null);

    const panelRender = (panel: React.ReactNode) => (
        <div>
            {panel}
            <div ref={buttonContainerRef}>
                <Tooltip
                    title="Reset to default"
                    trigger={["focus", "hover"]}
                    getPopupContainer={() => buttonContainerRef.current || document.body}
                    placement="right"
                >
                    <Button
                        onClick={onReset}
                        size="small"
                        className={styles.resetButton}
                        type="text"
                        aria-label="Reset to default color"
                    >
                        <UndoOutlined />
                    </Button>
                </Tooltip>
            </div>
        </div>
    );

    return (
        <div ref={popupContainerRef} className={styles.colorPickerContainer}>
            <ColorPicker
                {...colorPickerProps}
                getPopupContainer={() => popupContainerRef.current || document.body}
                panelRender={panelRender}
            >
                {children}
            </ColorPicker>
        </div>
    );
}
