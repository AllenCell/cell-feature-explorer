import { InputNumber, Row } from "antd";
import Slider, { SliderSingleProps } from "antd/es/slider";
import React, { ReactElement, ReactNode, useEffect, useState } from "react";

type LabeledSliderProps = {
    sliderProps: SliderSingleProps;
    label: string | ReactNode;
    labelWidth?: string;
    id?: string;
    inputMax?: number;
    inputMin?: number;
};

export default function LabeledSlider(props: LabeledSliderProps): ReactElement {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState(props.sliderProps.value);

    const onConfirmInputValue = () => {
        if (inputValue !== undefined) {
            const clampMax = props.inputMax ?? props.sliderProps.max ?? Infinity;
            const clampMin = props.inputMin ?? props.sliderProps.min ?? -Infinity;
            const clampedValue = Math.max(clampMin, Math.min(clampMax, inputValue as number));
            setInputValue(clampedValue);
            props.sliderProps.onChange?.(clampedValue);
        }
    };

    const inputId =
        props.id || `labeled-slider-${props.label?.toString().toLowerCase().replace(/\s+/g, "-")}`;

    useEffect(() => {
        setInputValue(props.sliderProps.value);
    }, [props.sliderProps.value]);

    return (
        <Row
            align="middle"
            style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                alignItems: "center",
                width: "100%",
            }}
            wrap={false}
        >
            <label
                htmlFor={inputId}
                style={{ width: props.labelWidth, flexBasis: props.labelWidth, flexShrink: 0 }}
            >
                {props.label}
            </label>

            <InputNumber
                id={inputId}
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

            <div style={{ width: "100%", flexGrow: 1, flexShrink: 1 }} ref={containerRef}>
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
        </Row>
    );
}
