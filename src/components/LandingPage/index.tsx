import { Col, Descriptions, Layout, Row } from "antd";
import React from "react";
const { Content } = Layout;

import MegasetCard from "../../components/MegasetCard";
import { Megaset } from "../../state/image-dataset/types";
import downloadData, { DownloadInfo } from "./download-data";

import styles from "./style.module.css";

interface LandingPageProps {
    handleSelectDataset: (id: string) => void;
    megasets: Megaset[];
}

const LandingPage = ({ handleSelectDataset, megasets }: LandingPageProps) => (
    <Layout>
        <Row className={styles.lightSection}>
            <h1 className={styles.subtitle}>Welcome to Cell Feature Explorer</h1>

            <Col className={styles.sectionContent}>
                <div className={styles.paragraph}>
                    The Cell Feature Explorer (CFE) is an online tool to access segmented and
                    processed images of over 200,000 cells as curated datasets. Each dataset has
                    specific measured features, such as cellular volume and mitosis stage that are
                    described in the user interface and detailed in publications associated with
                    each dataset. The CFE is composed of a plot, where each cell is graphed by these
                    measured features, and a 3D viewer for in-depth visual analysis.
                </div>
            </Col>
        </Row>
        <Layout>
            <Content className={styles.content}>
                <Row className={styles.section}>
                    <div className={styles.sectionContent}>
                        <h2 className={styles.subtitle}>Load a dataset to get started</h2>
                        <Row className={styles.cardContainer}>
                            {megasets.map((megaset: Megaset) => (
                                <MegasetCard
                                    key={megaset.name}
                                    megaset={megaset}
                                    handleSelectDataset={handleSelectDataset}
                                />
                            ))}
                        </Row>
                    </div>
                </Row>
                <Row className={styles.lightSection}>
                    <Col className={styles.sectionContent}>
                        <h2 className={styles.subtitle}>Cell features in our data </h2>
                        <div className={styles.paragraph}>
                            hiPS cells from the{" "}
                            <a
                                target="_blank"
                                rel="noreferrer"
                                href="https://www.allencell.org/cell-catalog.html"
                            >
                                Allen Cell Collection
                            </a>{" "}
                            grow in epithelial-like monolayer colonies when cultured on glass using
                            our methods. We image rectangular fields of view (FOV) from these
                            colonies in 3D, using spinning disk confocal microscopy. We collect four
                            channels of data for each FOV, including one brightfield channel and
                            three fluorescent channels:
                            <ul>
                                <li>dyed DNA </li>
                                <li>dyed cell membrane </li>
                                <li>
                                    one fluorescently labeled protein designed to visualize a
                                    particular organelle or cellular structure via endogenous
                                    tagging
                                </li>
                            </ul>
                        </div>
                        <div className={styles.paragraph}>
                            The fluorescent channels are segmented to demarcate structures and to
                            define the boundaries of individual cells. The segmented structures are
                            then measured, and the data for these measurements, as well as cell and
                            nuclear shape modes (derived from a principal component analysis; please
                            see our recent article in{" "}
                            <a
                                target="_blank"
                                rel="noreferrer"
                                href="https://www.biorxiv.org/content/10.1101/2020.12.08.415562v1"
                            >
                                bioRxiv
                            </a>
                            ) are made available for plotting at the top of the CFE tool page. The
                            beautiful cells and the FOVs from which they were segmented can be
                            explored in a 3D viewer at the bottom of the CFE tool page.
                        </div>
                    </Col>
                </Row>
                <Row className={styles.section}>
                    <Col className={styles.sectionContent}>
                        <h2 className={styles.subtitle}>Download cell feature data (via Quilt)</h2>
                        <Row className={styles.section}>
                            <Descriptions
                                layout="horizontal"
                                colon={false}
                                column={1}
                                style={{ margin: "10px 0" }}
                            >
                                <Descriptions.Item label="RELEASE DATE">DATASET</Descriptions.Item>

                                {downloadData.map((downloadInfo: DownloadInfo, index) => {
                                    return (
                                        <>
                                            <Descriptions.Item
                                                label={downloadInfo.date}
                                                key={index}
                                            >
                                                {" "}
                                                <a
                                                    target="_blank"
                                                    href={downloadInfo.link}
                                                    rel="noreferrer"
                                                >
                                                    {downloadInfo.title}
                                                </a>
                                            </Descriptions.Item>
                                        </>
                                    );
                                })}
                            </Descriptions>
                        </Row>
                        <div className={styles.paragraph}>
                            Once you navigate to Quilt, you can follow the instructions provided to
                            access the cell feature data. If you need assistance, please visit the{" "}
                            <a href="https://forum.allencell.org/tags/c/software-code/11/cell-feature-explorer">
                                Allen Cell Discussion Forum
                            </a>
                            .
                        </div>
                    </Col>
                </Row>
            </Content>
        </Layout>
    </Layout>
);

export default LandingPage;
