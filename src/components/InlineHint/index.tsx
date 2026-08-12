import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, ReactNode, useRef } from "react";

type InlineHintProps = {
    title?: ReactNode;
};

/** An icon that can be hovered or focused to show an informational tooltip. */
export default function InlineHint(props: InlineHintProps): ReactElement {
    const popupContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={popupContainerRef}>
            <Tooltip
                trigger={["focus", "hover"]}
                title={props.title}
                getPopupContainer={() => popupContainerRef.current ?? document.body}
            >
                <button
                    style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        cursor: "help",
                        color: "unset",
                    }}
                    aria-label="More information"
                >
                    <InfoCircleOutlined></InfoCircleOutlined>
                </button>
            </Tooltip>
        </div>
    );
}
