import { Row } from "antd";
import Slider, { SliderProps } from "antd/es/slider";
import React, { ReactElement } from "react";

type ValueType = number | number[];

type LabeledSliderProps<T extends ValueType> = {
    sliderProps: SliderProps;
    label: string;
    labelWidth?: string;
};

export default function LabeledSlider<T extends ValueType>(
    props: LabeledSliderProps<T>
): ReactElement {
    return (
        <Row align="middle" style={{ width: "100%" }}>
            <label>
                <span style={{ width: props.labelWidth || "100px", display: "inline-block" }}>
                    {props.label}
                </span>
                <Slider {...props.sliderProps} />
            </label>
        </Row>
    );
}
