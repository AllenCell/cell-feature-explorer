import { LoadingOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Flex, Input, Modal, Radio, Space, Spin } from "antd";
import { RcFile } from "antd/es/upload";
import Dragger from "antd/es/upload/Dragger";
import React, { ReactElement, useEffect, useState } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { State } from "../../state";
import { ImageDataset, LoadCsvDatasetAction } from "../../state/image-dataset/types";
import selectionStateBranch from "../../state/selection";
import imageDatasetStateBranch from "../../state/image-dataset";
import { SetCsvUrlAction } from "../../state/selection/types";
import { fetchCsvText, isAllenPath, isUrl } from "../../util";

import styles from "./styles.module.css";

type DispatchProps = {
    loadCsvDataset: ActionCreator<LoadCsvDatasetAction>;
    setCsvUrl: ActionCreator<SetCsvUrlAction>;
};

type PropsFromState = {
    dataset: ImageDataset;
};

type CsvInputProps = DispatchProps & PropsFromState;

const enum CsvInputMode {
    Device = "device",
    Web = "web",
}

/**
 * An input area for CSV files. When CSV data is provided, replaces the current image dataset
 * with a new `CsvRequest` image dataset and triggers the loading of the CSV data.
 */
function CsvInput(props: CsvInputProps): ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [selectionInputMode, setSelectionInputMode] = useState(CsvInputMode.Device);
    const [urlInput, setUrlInput] = useState("");
    const [errorText, setErrorText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Close modal upon successful dataset load
        setIsOpen(false);
    }, [props.dataset]);

    const onClickTriggerButton = () => {
        setIsOpen(true);
        setIsLoading(false);
        setErrorText("");
    };

    const onFileUploaded = async (file: RcFile): Promise<string> => {
        setIsLoading(true);
        const fileText = await file.text();
        if (fileText.trim().length === 0) {
            setErrorText("The provided file is empty.");
            setIsLoading(false);
            return "";
        }
        try {
            props.loadCsvDataset(fileText);
            props.setCsvUrl("");
        } catch (e) {
            setErrorText((e as Error).message);
        }
        setIsLoading(false);
        return "";
    };

    const onClickedLoadUrl = async () => {
        setIsLoading(true);
        try {
            const url = urlInput.trim();
            if (!isUrl(url) && !isAllenPath(url)) {
                throw new Error(`Please enter a valid HTTP(S) URL.`);
            }
            const { url: fetchedUrl, text: csvText } = await fetchCsvText(url);
            // TODO: Abort loading if modal is closed while fetching.
            props.loadCsvDataset(csvText);
            props.setCsvUrl(fetchedUrl);
        } catch (e) {
            setErrorText((e as Error).message);
        }
        setIsLoading(false);
    };

    const footer = <Button onClick={() => setIsOpen(false)}>Cancel</Button>;

    return (
        <>
            <Button onClick={onClickTriggerButton}>
                <UploadOutlined />
                Load
            </Button>
            <Modal
                title={"Load a .csv dataset"}
                open={isOpen}
                onCancel={() => setIsOpen(false)}
                footer={footer}
            >
                <Flex vertical={true} align="center" gap={16} style={{ margin: "16px 0" }}>
                    <Radio.Group
                        buttonStyle="solid"
                        optionType="button"
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            width: "100%",
                        }}
                        value={selectionInputMode}
                        onChange={(e) => setSelectionInputMode(e.target.value)}
                        disabled={isLoading}
                    >
                        <Radio
                            style={{ minWidth: "40%", display: "flex", justifyContent: "center" }}
                            value={CsvInputMode.Device}
                        >
                            From your device
                        </Radio>
                        <Radio
                            style={{ minWidth: "40%", display: "flex", justifyContent: "center" }}
                            value={CsvInputMode.Web}
                        >
                            From the web
                        </Radio>
                    </Radio.Group>

                    {selectionInputMode === CsvInputMode.Device && (
                        <div style={{ width: "100%" }}>
                            <Dragger
                                className={styles.csvUpload}
                                action={onFileUploaded}
                                accept=".csv"
                                multiple={false}
                                showUploadList={false}
                                disabled={isLoading}
                            >
                                <Flex vertical={true} align={"center"}>
                                    <p style={{ fontSize: "30px" }}>
                                        {isLoading ? (
                                            <Spin
                                                className={styles.uploadSpinner}
                                                indicator={<LoadingOutlined spin />}
                                                size="large"
                                            ></Spin>
                                        ) : (
                                            <UploadOutlined />
                                        )}
                                    </p>
                                    <p>Click or drag a .csv file here to load.</p>
                                </Flex>
                            </Dragger>
                        </div>
                    )}
                    {selectionInputMode === CsvInputMode.Web && (
                        <Flex vertical={true} style={{ width: "100%" }} gap={6}>
                            <p style={{ margin: 0 }}>Provide the URL of a .csv file</p>
                            <Space.Compact style={{ width: "100%" }}>
                                <Input
                                    placeholder="https://example.com/dataset.csv"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    onPressEnter={onClickedLoadUrl}
                                ></Input>
                                <Button
                                    type="primary"
                                    onClick={onClickedLoadUrl}
                                    loading={isLoading}
                                >
                                    Load
                                </Button>
                            </Space.Compact>
                        </Flex>
                    )}
                </Flex>
                {errorText && <span style={{ color: "var(--text-red)" }}>{errorText}</span>}
            </Modal>
        </>
    );
}

function mapStateToProps(state: State): PropsFromState {
    return {
        dataset: imageDatasetStateBranch.selectors.getImageDataset(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    loadCsvDataset: imageDatasetStateBranch.actions.loadCsvDataset,
    setCsvUrl: selectionStateBranch.actions.setCsvUrl,
};

export default connect<PropsFromState, DispatchProps, any, State>(
    mapStateToProps,
    dispatchToPropsMap
)(CsvInput);
