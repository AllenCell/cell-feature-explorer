import { PictureOutlined } from "@ant-design/icons";
import { Card } from "antd";
import React from "react";

import styles from "./style.css";

const { Meta } = Card;

export interface PopoverCardProps {
    description: string;
    title: string;
    src?: string;
    xLabel?: string;
    xValue?: string;
    yLabel?: string;
    yValue?: string;
    lineLabel?: string;
    lineValue?: string;
}

const PopoverCard: React.FC<PopoverCardProps> = (props) => {
    const [loadedImageSrc, setLoadedImageSrc] = React.useState<string | undefined>(undefined);
    const onImageLoad = React.useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => setLoadedImageSrc(e.currentTarget.src),
        []
    );
    const imageIsLoaded = typeof props.src === "string" && props.src === loadedImageSrc;

    const cover = (
        <>
            {props.src && (
                <img
                    alt="thumbnail of microscopy image"
                    src={props.src}
                    onLoad={onImageLoad}
                    style={imageIsLoaded ? {} : { display: "none" }}
                />
            )}
            <div
                className={styles.placeholderContainer}
                style={imageIsLoaded ? { display: "none" } : {}}
            >
                <PictureOutlined />
            </div>
        </>
    );

    return (
        <Card className={styles.container} cover={cover} variant="borderless">
            <Meta description={props.description} title={props.title} />
            {(props.xValue !== undefined ||
                props.yValue !== undefined ||
                props.lineValue !== undefined) && (
                <div className={styles.axisValues}>
                    {props.xValue && (
                        <div className={styles.axisRow}>
                            <span className={styles.axisLabel}>x:{props.xLabel}</span>
                            <span className={styles.axisValue}>{props.xValue}</span>
                        </div>
                    )}
                    {props.yValue && (
                        <div className={styles.axisRow}>
                            <span className={styles.axisLabel}>y:{props.yLabel}</span>
                            <span className={styles.axisValue}>{props.yValue}</span>
                        </div>
                    )}
                    {props.lineValue && (
                        <div className={styles.axisRow}>
                            <span className={styles.axisLabel}>line:{props.lineLabel}</span>
                            <span className={styles.axisValue}>{props.lineValue}</span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default PopoverCard;
