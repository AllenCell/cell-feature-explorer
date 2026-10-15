import { CloseOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Form, Input, List, Popconfirm, Radio, Row } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { includes, map } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import type { ActionCreator } from "redux";

import GalleryCard from "../../components/GalleryCard";
import MinGalleryCard from "../../components/MinGalleryCard";
import GalleryCardSlider from "../../components/GalleryCardSlider";
import { MY_SELECTIONS_ID } from "../../constants";
import { requestAlbumData } from "../../state/metadata/actions";
import { getAllAlbumData } from "../../state/metadata/selectors";
import { RequestAction } from "../../state/metadata/types";
import {
    clearAllSelectedPoints,
    deselectPoint,
    selectAlbum,
    selectCellFor3DViewer,
    selectPoint,
    setHoveredGalleryCard,
} from "../../state/selection/actions";
import {
    getClickedScatterPoints,
    getFilteredIds,
    getSelected3DCell,
    getSelectedAlbum,
} from "../../state/selection/selectors";
import {
    DeselectPointAction,
    ResetSelectionAction,
    SelectAlbumAction,
    SelectPointAction,
    SetHoveredCardAction,
} from "../../state/selection/types";
import { Album, State, Thumbnail } from "../../state/types";

import { getSelectedAlbumName, getThumbnails } from "./selectors";

const Search = Input.Search;

import styles from "./style.module.css";

interface PropsFromState {
    albumData: Album[];
    clickedPoints: string[];
    data: Thumbnail[];
    ids: string[];
    selectedAlbum: number;
    selectedAlbumName: string;
    selectedCell: string;
}

interface DispatchProps {
    getAlbumData: ActionCreator<RequestAction>;
    addSearchedCell: ActionCreator<SelectPointAction>;
    handleClearAllSelectedPoints: ActionCreator<ResetSelectionAction>;
    handleSelectAlbum: ActionCreator<SelectAlbumAction>;
    handleDeselectPoint: ActionCreator<DeselectPointAction>;
    handleOpenIn3D: ActionCreator<SelectPointAction>;
    setHovered: ActionCreator<SetHoveredCardAction>;
}
interface OwnProps {
    collapsed: boolean;
    mitoticStage?: number;
    toggleGallery: (value: boolean) => void;
    openViewerTab: () => void;
}

type ThumbnailGalleryProps = PropsFromState & DispatchProps & OwnProps;

interface ThumbnailGalleryState {
    inputStatus: "success" | "error" | "warning" | "validating" | undefined;
    message: string;
    thumbnailSize: number;
}

const initialState = {
    inputStatus: undefined,
    message: "",
    thumbnailSize: 128,
};

const messages = {
    error: "That id is not in our dataset.",
    success: initialState.message,
    warning: "That cell is already in the gallery.",
};

class ThumbnailGallery extends React.Component<ThumbnailGalleryProps, ThumbnailGalleryState> {
    private endOfAlbum: React.RefObject<HTMLDivElement>;

    constructor(props: ThumbnailGalleryProps) {
        super(props);
        this.renderGalleryCard = this.renderGalleryCard.bind(this);
        this.renderMinGalleryCard = this.renderMinGalleryCard.bind(this);
        this.searchValidate = this.searchValidate.bind(this);
        this.resetSearch = this.resetSearch.bind(this);
        this.hoverCard = this.hoverCard.bind(this);
        this.unHover = this.unHover.bind(this);
        this.renderCollapsedView = this.renderCollapsedView.bind(this);
        this.renderFullView = this.renderFullView.bind(this);
        this.selectAlbum = this.selectAlbum.bind(this);
        this.closeGallery = this.closeGallery.bind(this);
        this.selectCell = this.selectCell.bind(this);
        this.endOfAlbum = React.createRef<HTMLDivElement>();
        this.state = {
            ...initialState,
        };
    }

    public componentDidMount() {
        const { getAlbumData } = this.props;
        getAlbumData();
    }

    public componentDidUpdate(prevProps: ThumbnailGalleryProps) {
        const endOfGallery = this.endOfAlbum;
        const { clickedPoints } = this.props;
        if (endOfGallery.current && prevProps.clickedPoints.length !== clickedPoints.length) {
            endOfGallery.current.scrollIntoView({
                behavior: "smooth",
            });
        }
    }

    public searchValidate(value: string) {
        const { clickedPoints, ids, addSearchedCell } = this.props;
        if (
            includes(
                map(clickedPoints, (ele) => ele.toString()),
                value
            )
        ) {
            return this.setState({
                inputStatus: "warning",
                message: messages.warning,
            });
        }
        if (includes(ids, value)) {
            addSearchedCell({ id: value });
            return this.setState({
                inputStatus: "success",
                message: messages.success,
            });
        }
        this.setState({
            inputStatus: "error",
            message: messages.error,
        });
    }

    public resetSearch() {
        this.setState({
            inputStatus: initialState.inputStatus,
            message: initialState.message,
        });
    }

    public selectAlbum({ target }: RadioChangeEvent) {
        const { handleSelectAlbum } = this.props;
        if (target) {
            handleSelectAlbum(target.value);
        }
    }

    public renderAlbumButtons() {
        const { albumData, selectedAlbum, clickedPoints } = this.props;
        return (
            <Form layout="vertical" colon={true}>
                <Form.Item label="ALBUMS">
                    <Radio.Group
                        defaultValue={selectedAlbum}
                        onChange={this.selectAlbum}
                        size="large"
                    >
                        <Radio.Button key="my-selections" value={MY_SELECTIONS_ID}>
                            {`My Selections (${clickedPoints.length})`}
                        </Radio.Button>
                        {map(albumData, (album) => {
                            if (!album.cell_ids) {
                                return;
                            }
                            return (
                                album.cell_ids.length > 0 && (
                                    <Radio.Button key={album.album_id} value={album.album_id}>
                                        {album.title} ({album.cell_ids.length})
                                    </Radio.Button>
                                )
                            );
                        })}
                    </Radio.Group>
                </Form.Item>
            </Form>
        );
    }

    public closeGallery() {
        const { toggleGallery } = this.props;
        toggleGallery(true);
    }

    public selectCell(cellId: { id: string }) {
        const { handleOpenIn3D } = this.props;
        this.closeGallery();
        this.props.openViewerTab();
        return handleOpenIn3D(cellId);
    }

    public renderFullView() {
        const { data, handleClearAllSelectedPoints, selectedAlbum, selectedAlbumName } = this.props;

        // TypeScript didnt like dataSource having the empty card. Data is already typed, so this seemed fine
        const dataSource: any = data.length > 0 ? data : [{ empty: true }];

        return (
            <Row id="gallery" className={styles.container} gutter={32} justify="space-between">
                <div className={styles.galleryGrid}>
                    <div className={styles.galleryHeader}>
                        <h2>{selectedAlbumName}</h2>
                        <GalleryCardSlider
                            setWidth={(width: number) => this.setState({ thumbnailSize: width })}
                            currentWidth={this.state.thumbnailSize}
                        />

                        {data.length > 0 && !selectedAlbum && (
                            <Popconfirm
                                title="Are you sure you want to unselect all?"
                                onConfirm={handleClearAllSelectedPoints}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button>
                                    <CloseOutlined /> Clear All
                                </Button>
                            </Popconfirm>
                        )}
                    </div>
                    <List
                        itemLayout="horizontal"
                        grid={{
                            gutter: 16,
                        }}
                        className={styles.list}
                        dataSource={dataSource}
                        renderItem={this.renderGalleryCard}
                        footer={<div ref={this.endOfAlbum} />}
                    />
                </div>
                <div className={styles.albumSideBar}>
                    <div className={styles.sideBarHeader}>
                        <h2>Thumbnail Gallery</h2>
                        <Button type="text" onClick={this.closeGallery} style={{ padding: 0 }}>
                            <CloseOutlined style={{ fontSize: "2em" }} />
                        </Button>
                    </div>
                    <Form.Item
                        hasFeedback={true}
                        className={styles.searchForCell}
                        validateStatus={this.state.inputStatus}
                        help={this.state.message}
                    >
                        <Search
                            placeholder="add image by cell id"
                            onSearch={this.searchValidate}
                            onChange={this.resetSearch}
                        />
                    </Form.Item>
                    {this.renderAlbumButtons()}
                </div>
            </Row>
        );
    }

    public renderCollapsedView() {
        const { data } = this.props;
        // TypeScript didnt like dataSource having the empty card. Data is already typed, so this seemed fine
        const dataSource: any = data.length > 0 ? data : [{ empty: true }];
        return (
            <div id="gallery" className={styles.container}>
                <div className={styles.galleryHeader}>
                    <h2>Gallery</h2>
                </div>
                <List
                    itemLayout="horizontal"
                    dataSource={dataSource}
                    renderItem={this.renderMinGalleryCard}
                    footer={<div ref={this.endOfAlbum} />}
                />
            </div>
        );
    }

    public render() {
        const { collapsed } = this.props;
        return (
            <ConfigProvider
                theme={{
                    components: {
                        Radio: {
                            colorPrimary: "#fffffa",
                            colorPrimaryActive: "#fffc",
                            colorPrimaryHover: "#fff",
                        },
                    },
                }}
            >
                {collapsed ? this.renderCollapsedView() : this.renderFullView()}
            </ConfigProvider>
        );
    }

    private hoverCard({ currentTarget }: React.MouseEvent<HTMLElement>) {
        const { setHovered } = this.props;
        if (currentTarget.id) {
            return setHovered(currentTarget.id);
        }
        setHovered(null);
    }

    private unHover() {
        const { setHovered } = this.props;
        setHovered(null);
    }

    private renderMinGalleryCard(item: Thumbnail) {
        const { handleDeselectPoint, selectedCell } = this.props;
        const selectedCellId = selectedCell ? selectedCell.toString() : "";
        return (
            <MinGalleryCard
                onMouseEnter={this.hoverCard}
                onMouseLeave={this.unHover}
                category={item.category}
                src={item.src}
                selected={selectedCellId === item.cellID}
                downloadHref={item.downloadHref}
                cellID={item.cellID}
                fileInfo={item.fileInfo}
                handleDeselectPoint={handleDeselectPoint}
                handleOpenIn3D={this.selectCell}
                empty={item.empty}
            />
        );
    }

    private renderGalleryCard(item: Thumbnail) {
        const { handleDeselectPoint, selectedCell } = this.props;
        const selectedCellId = selectedCell || "";
        return (
            <GalleryCard
                onMouseEnter={this.hoverCard}
                onMouseLeave={this.unHover}
                category={item.category}
                mitoticStage={item.mitoticStage}
                src={item.src}
                selected={selectedCellId === item.cellID}
                downloadHref={item.downloadHref}
                downloadFullField={item.fullFieldDownloadHref}
                cellID={item.cellID}
                fileInfo={item.fileInfo}
                handleDeselectPoint={handleDeselectPoint}
                handleOpenIn3D={this.selectCell}
                empty={item.empty}
                widthPx={this.state.thumbnailSize}
            />
        );
    }
}

function mapStateToProps(state: State): PropsFromState {
    return {
        albumData: getAllAlbumData(state),
        clickedPoints: getClickedScatterPoints(state),
        data: getThumbnails(state),
        ids: getFilteredIds(state),
        selectedAlbum: getSelectedAlbum(state),
        selectedAlbumName: getSelectedAlbumName(state),
        selectedCell: getSelected3DCell(state),
    };
}

const dispatchToPropsMap: DispatchProps = {
    addSearchedCell: selectPoint,
    getAlbumData: requestAlbumData,
    handleClearAllSelectedPoints: clearAllSelectedPoints,
    handleDeselectPoint: deselectPoint,
    handleOpenIn3D: selectCellFor3DViewer,
    handleSelectAlbum: selectAlbum,
    setHovered: setHoveredGalleryCard,
};

export default connect<PropsFromState, DispatchProps, OwnProps, State>(
    mapStateToProps,
    dispatchToPropsMap
)(ThumbnailGallery);
