import { InputNumber, Row } from "antd";
import Slider, { SliderRangeProps, SliderSingleProps } from "antd/es/slider";
import type { SliderProps as RcSliderProps } from "rc-slider";
import React, { ReactElement, useEffect, useState } from "react";

type ValueType = number | number[];

type LabeledSliderProps = {
    sliderProps: SliderSingleProps;
    label: string;
    labelWidth?: string;
};

export default function LabeledSlider(props: LabeledSliderProps): ReactElement {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState(props.sliderProps.value);

    const onConfirmInputValue = () => {
        if (inputValue !== undefined) {
            props.sliderProps.onChange?.(inputValue);
        }
    };

    useEffect(() => {
        setInputValue(props.sliderProps.value);
    }, [props.sliderProps.value]);

    return (
        <Row align="middle" style={{ width: "100%" }} wrap={false}>
            <label
                style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    alignItems: "center",
                    width: "100%",
                }}
            >
                <span style={{ width: props.labelWidth || "100px", display: "inline-block" }}>
                    {props.label}
                </span>
                {typeof props.sliderProps.value === "number" && (
                    <InputNumber
                        size="small"
                        controls={false}
                        value={inputValue}
                        onChange={(value) => {
                            if (value !== null) {
                                setInputValue(value);
                            }
                        }}
                        onPressEnter={onConfirmInputValue}
                        onBlur={onConfirmInputValue}
                    ></InputNumber>
                )}
                <div style={{ width: "100%" }} ref={containerRef}>
                    <Slider
                        {...props.sliderProps}
                        tooltip={{
                            getPopupContainer: () => containerRef.current || document.body,
                            ...props.sliderProps.tooltip,
                        }}
                        style={{
                            width: "calc(100% - 32px)",
                            margin: "8px 14px",
                            ...props.sliderProps.style,
                        }}
                    />
                </div>
            </label>
        </Row>
    );
}
