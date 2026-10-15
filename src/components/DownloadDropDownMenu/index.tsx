import { CheckOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Dropdown, MenuProps, Tooltip } from "antd";
import { ItemType } from "antd/es/menu/interface";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import { includes, uniq } from "lodash";
import { MenuInfo } from "rc-menu/lib/interface";
import React, { MouseEvent } from "react";

import { NO_DOWNLOADS_TOOLTIP } from "../../constants";
import { DownloadConfig } from "../../state/selection/types";

import styles from "./style.module.css";

interface DownloadDropDownMenuProps {
    color: string;
    id: string;
    name: string;
    total: number;
    checked?: boolean;
    closeable?: boolean;
    downloadConfig: DownloadConfig;
    downloadUrls: string[];
    downloadRoot: string;
    hideable?: boolean;
    onBarClicked?: (clickEvent: CheckboxChangeEvent) => void;
    handleClose?: (id: number | string) => void;
    handleDownload: (id: string) => void;
}

interface AlreadyDownloaded {
    [key: string]: string[];
}

interface DownloadDropDownMenuState {
    downloadMenuVisible: boolean;
    alreadyDownloaded: AlreadyDownloaded;
}

const LOCAL_STORAGE_KEY = "alreadyDownloaded";

export default class DownloadDropDownMenu extends React.Component<
    DownloadDropDownMenuProps,
    DownloadDropDownMenuState
> {
    private static defaultProps = {
        closeable: false,
        downloadUrls: [],
        hideable: true,
    };

    private popupContainerRef: React.RefObject<HTMLDivElement>;

    constructor(props: DownloadDropDownMenuProps) {
        super(props);
        this.onClose = this.onClose.bind(this);
        this.onDownload = this.onDownload.bind(this);
        this.saveDownloadUrl = this.saveDownloadUrl.bind(this);
        this.handleMenuClick = this.handleMenuClick.bind(this);
        this.handleDownloadMenuVisibleChange = this.handleDownloadMenuVisibleChange.bind(this);

        this.state = {
            alreadyDownloaded: localStorage.getItem(LOCAL_STORAGE_KEY)
                ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) as string)
                : {},
            downloadMenuVisible: false,
        };

        this.popupContainerRef = React.createRef();
    }

    public onClose({ currentTarget }: MouseEvent<HTMLButtonElement>) {
        const { handleClose } = this.props;
        if (currentTarget && currentTarget.id && handleClose) {
            handleClose(currentTarget.id);
        }
    }

    public onDownload({ currentTarget }: MouseEvent<HTMLButtonElement>) {
        const { handleDownload } = this.props;
        if (currentTarget && currentTarget.id && handleDownload) {
            handleDownload(currentTarget.id);
        }
    }

    public saveDownloadUrl(info: MenuInfo) {
        const { downloadConfig } = this.props;
        const { alreadyDownloaded } = this.state;
        const thisAlreadyDownloaded = alreadyDownloaded[downloadConfig.key];
        if (thisAlreadyDownloaded) {
            this.setState({
                alreadyDownloaded: {
                    ...alreadyDownloaded,
                    [downloadConfig.key]: uniq([...thisAlreadyDownloaded, info.key]),
                },
            });
        } else {
            this.setState({
                alreadyDownloaded: {
                    ...alreadyDownloaded,
                    [downloadConfig.key]: [info.key],
                },
            });
        }
    }
    public handleDownloadMenuVisibleChange(flag?: boolean) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state.alreadyDownloaded));
        this.setState({ downloadMenuVisible: !!flag }); // for typescript, to convert undefined to false
    }

    public handleMenuClick() {
        const { downloadUrls, downloadConfig } = this.props;
        const alreadyDownloaded = this.state.alreadyDownloaded[downloadConfig.key];
        // if they've already downloaded the set, or are clicking on the last link, close the menu
        // otherwise leave it open to make it easy to download the set.
        if (alreadyDownloaded && alreadyDownloaded.length === downloadUrls.length) {
            this.setState({ downloadMenuVisible: false });
        }
    }

    public render() {
        const { id, downloadUrls, downloadConfig, downloadRoot } = this.props;
        const alreadyDownloaded = this.state.alreadyDownloaded[downloadConfig.key];

        // TODO: Parts of list are cut off by the edges of the screen when there are
        // too many items
        const menuItems: ItemType[] = downloadUrls.map((url, index) => {
            return {
                key: index,
                onClick: this.saveDownloadUrl,
                label: (
                    <>
                        {includes(alreadyDownloaded, index.toString()) ? (
                            <CheckOutlined />
                        ) : (
                            <DownloadOutlined />
                        )}
                        <a href={url}> data chunk {index + 1} </a>
                    </>
                ),
            };
        });
        const menu: MenuProps = { items: menuItems, onClick: this.handleMenuClick };

        // we can not check for downloadUrls.length because there are some conditions where
        // downloadUrls is empty but we still want to show the download button due to
        // initialization order in the app / React lifecycle concerns.
        const noDownloads = downloadRoot === "";
        return (
            <div className={styles.container} ref={this.popupContainerRef}>
                <Tooltip title={noDownloads ? NO_DOWNLOADS_TOOLTIP : null}>
                    <Dropdown
                        menu={menu}
                        trigger={["click"]}
                        onOpenChange={this.handleDownloadMenuVisibleChange}
                        open={this.state.downloadMenuVisible}
                        placement="bottomRight"
                        autoAdjustOverflow={false}
                        getPopupContainer={() => this.popupContainerRef.current || document.body}
                    >
                        <Button
                            size="small"
                            className={noDownloads ? styles.disabledDownload : "ant-dropdown-link"}
                            id={id}
                            onClick={noDownloads ? undefined : this.onDownload}
                            disabled={noDownloads}
                        >
                            <DownloadOutlined />
                        </Button>
                    </Dropdown>
                </Tooltip>
            </div>
        );
    }
}
