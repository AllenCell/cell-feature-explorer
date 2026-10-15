import * as React from "react";
import { Button, Card, Descriptions, Tag, Divider } from "antd";

import { DatasetMetaData } from "../../state/image-dataset/types";
const { Meta } = Card;

import styles from "./style.module.css";

interface DatasetCardProps extends DatasetMetaData {
    handleSelectDataset: (id: string) => void;
}

const DatasetCard: React.FunctionComponent<DatasetCardProps> = ({
    title,
    name,
    version,
    description,
    handleSelectDataset,
    link,
    id,
    userData,
    image,
}: DatasetCardProps) => {
    // Prefix version number with a "v" if necessary
    const versionPrefixed = version.startsWith("v") ? version : `v${version}`;

    const displayTitle = (
        <>
            <div>
                {/* Tag color is bright purple */}
                {userData.isNew && <Tag color="#8950d9">new</Tag>}
                {title ? title : name}
            </div>
            <span className={styles.version}>{versionPrefixed}</span>
            {userData.inReview && (
                <>
                    <Divider type="vertical" /> (in review)
                </>
            )}
        </>
    );
    const cardContent = (
        <Card
            className={styles.card}
            hoverable
            bordered={false}
            cover={
                image != "" ? (
                    <img
                        className={styles.staticThumbnail}
                        alt={`Snapshot of simulation for ${title}`}
                        src={image}
                    />
                ) : null
            }
            onClick={() => handleSelectDataset(id)}
        >
            <Meta
                title={displayTitle}
                description={
                    <div
                        className="content"
                        dangerouslySetInnerHTML={{ __html: description }}
                    ></div>
                }
            />
            {/* Spacer div to push `Descriptions` to the bottom of the card */}
            <div className={styles.spacer} />
            <Descriptions column={1} size="small" colon={false}>
                {userData.totalCells && (
                    <Descriptions.Item label="Number of Cells:">
                        {userData.totalCells.toLocaleString("en")}
                    </Descriptions.Item>
                )}
                {userData.totalFOVs && (
                    <Descriptions.Item label="Number of FOVs:">
                        {userData.totalFOVs.toLocaleString("en")}
                    </Descriptions.Item>
                )}
                {userData.totalTaggedStructures && (
                    <Descriptions.Item label="Number of tagged structures:">
                        {userData.totalTaggedStructures}
                    </Descriptions.Item>
                )}
            </Descriptions>
            <Button type="primary" className={styles.loadButton}>
                Load
            </Button>
        </Card>
    );
    if (link) {
        return <a href={link}>{cardContent}</a>;
    }
    return cardContent;
};

export default DatasetCard;
