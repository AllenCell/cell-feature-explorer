import { Row } from "antd";
import Slider, { SliderRangeProps, SliderSingleProps } from "antd/es/slider";
import type { SliderProps as RcSliderProps } from "rc-slider";
import React, { ReactElement } from "react";

type ValueType = number | number[];

type LabeledSliderProps = {
    sliderProps: SliderSingleProps | SliderRangeProps;
    label: string;
    labelWidth?: string;
};

export default function LabeledSlider(props: LabeledSliderProps): ReactElement {
    const containerRef = React.useRef<HTMLDivElement>(null);

    return (
        <Row align="middle" style={{ width: "100%" }} wrap={false}>
            <label
                style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    width: "100%",
                }}
            >
                <span style={{ width: props.labelWidth || "100px", display: "inline-block" }}>
                    {props.label}
                </span>
                <div style={{ width: "100%" }} ref={containerRef}>
                    <Slider
                        {...props.sliderProps}
                        tooltip={{
                            getPopupContainer: () => containerRef.current || document.body,
                        }}
                        style={{ ...props.sliderProps.style, width: "100%" }}
                    />
                </div>
            </label>
        </Row>
    );
}
