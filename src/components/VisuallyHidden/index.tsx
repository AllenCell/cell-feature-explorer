import React, { PropsWithChildren, ReactElement } from "react";

/**
 * Text that is visually hidden, but still accessible to screen readers.
 * Based on https://tailwindcss.com/docs/screen-readers
 */
export default function VisuallyHidden(props: PropsWithChildren): ReactElement {
    return (
        <div
            style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                borderWidth: 0,
            }}
        >
            {props.children}
        </div>
    );
}
