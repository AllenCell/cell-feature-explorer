import { Select, Tooltip } from "antd";
import { SelectProps, SelectValue } from "antd/es/select";
import React from "react";
import { MeasuredFeatureDef } from "../../state/metadata/types";

import styles from "./style.css";

interface FeatureSelectDropdownProps {
    value: string;
    options: MeasuredFeatureDef[];
    tooltip: string;
    onChange: (value: string) => void;
    classKey?: string;
    className?: string;
}

export default class FeatureSelectDropdown extends React.Component<FeatureSelectDropdownProps> {
    constructor(props: FeatureSelectDropdownProps) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    public handleChange(value: SelectValue): void {
        const v = value as string;
        this.props.onChange(v);
    }

    public render() {
        const { classKey = "", value, options, tooltip } = this.props;

        const selectOptions: SelectProps["options"] = options.map((option) => {
            return {
                label: `${option.displayName} ${option.unit ? `(${option.unit})` : ""}`,
                key: option.key,
                value: option.key,
                tooltip: option.tooltip,
            };
        });

        const selectedOptionLabel = selectOptions
            .find((option) => option && option.key === value)
            ?.label?.toString();

        return (
            <div className={this.props.className ?? styles[classKey]}>
                <Tooltip title={tooltip}>
                    <Select
                        onChange={this.handleChange}
                        value={selectedOptionLabel || value}
                        options={selectOptions}
                    />
                </Tooltip>
            </div>
        );
    }
}
