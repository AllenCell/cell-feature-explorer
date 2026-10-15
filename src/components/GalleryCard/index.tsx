import { CloseOutlined, DownloadOutlined, PictureOutlined } from "@ant-design/icons";
import { Button, Card, Divider, Dropdown, Flex, List, Tooltip } from "antd";
import { ItemType } from "antd/es/menu/interface";
import classNames from "classnames";
import React from "react";

import { NO_DOWNLOADS_TOOLTIP } from "../../constants";
import type { FileInfo } from "../../state/metadata/types";
import type { DeselectPointAction, SelectPointAction } from "../../state/selection/types";
import { useThumbnail } from "../../util/thumbnails";

import styles from "./style.module.css";

interface GalleryCardProps {
    category: string;
    src: string;
    selected: boolean;
    downloadHref: string;
    cellID: string;
    fileInfo: FileInfo;
    mitoticStage?: string;
    handleDeselectPoint: (payload: string) => DeselectPointAction;
    handleOpenIn3D: (payload: { id: string }) => SelectPointAction;
    empty?: boolean;
    onMouseEnter: (target: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: (target: React.MouseEvent<HTMLElement>) => void;
    downloadFullField: string;
    widthPx: number;
}

const GalleryCard: React.FC<GalleryCardProps> = (props) => {
    const imageSrc = useThumbnail(props.src, props.fileInfo);

    const deselectPoint = () => {
        props.handleDeselectPoint(props.cellID);
    };

    const openCellIn3D = () => {
        props.handleOpenIn3D({ id: props.cellID });
    };

    const menuItems: ItemType[] = [];
    if (props.downloadHref) {
        menuItems.push({
            key: "1",
            label: (
                <a href={props.downloadHref}>
                    <DownloadOutlined /> Segmented cell
                </a>
            ),
        });
    }
    if (props.downloadFullField) {
        menuItems.push({
            key: "2",
            label: (
                <a href={props.downloadFullField}>
                    <DownloadOutlined /> Full field image
                </a>
            ),
        });
    }

    const hasDownload = props.downloadHref !== "" || props.downloadFullField !== "";
    const actions = [
        <Button key={`${props.cellID}-load`} onClick={openCellIn3D}>
            3D
        </Button>,
        <Divider key={`${props.cellID}-0`} type="vertical" />,
        <Dropdown
            key={`${props.cellID}-download`}
            menu={{ items: menuItems }}
            trigger={["click"]}
            disabled={!hasDownload}
        >
            <Tooltip
                key={`${props.cellID}-download`}
                title={hasDownload ? null : NO_DOWNLOADS_TOOLTIP}
                trigger={["hover", "focus"]}
            >
                <Button disabled={!hasDownload}>
                    <DownloadOutlined />
                </Button>
            </Tooltip>
        </Dropdown>,
        <Divider key={`${props.cellID}-1`} type="vertical" />,

        <Button key={`${props.cellID}-close`} onClick={deselectPoint}>
            <CloseOutlined />
        </Button>,
    ];

    return (
        <List.Item
            key={props.cellID}
            className={styles.container}
            style={{ width: props.widthPx }}
            {...{
                // props not in ant.d component, but do exist
                id: props.cellID ? props.cellID.toString() : "",
                onMouseEnter: props.onMouseEnter,
                onMouseLeave: props.onMouseLeave,
            }}
        >
            <Card
                className={props.selected ? styles.selected : styles.unselected}
                loading={props.empty}
                cover={
                    imageSrc ? (
                        <img
                            alt="thumbnail of microscopy image"
                            src={imageSrc}
                            onClick={openCellIn3D}
                        />
                    ) : (
                        <PictureOutlined
                            onClick={openCellIn3D}
                            style={{ padding: "12px 0", fontSize: `${props.widthPx / 3}px` }}
                        />
                    )
                }
            >
                <Card.Meta
                    className={classNames({ [styles.small]: props.widthPx < 170 })}
                    title={props.category}
                    description={
                        <Flex vertical justify="space-between">
                            <Flex vertical>
                                <span>{props.cellID}</span>
                                <span style={{ minHeight: "1.5em" }}>
                                    {props.mitoticStage && (
                                        <span className={styles.stage}>{props.mitoticStage}</span>
                                    )}
                                </span>
                            </Flex>
                            {!props.empty && <div className={styles.actionList}>{actions}</div>}
                        </Flex>
                    }
                />
            </Card>
        </List.Item>
    );
};

export default GalleryCard;
