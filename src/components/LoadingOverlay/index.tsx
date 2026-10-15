import React from "react";

import { Loading } from "../Icons";

import styles from "./style.module.css";

interface ViewerOverlayTargetProps {
    isLoading: boolean;
    loadingText?: string;
}
const LoadingOverlay = ({
    isLoading,
    loadingText,
}: ViewerOverlayTargetProps): JSX.Element | null => {
    const loadingOverlay = (
        <div className={styles.container}>
            <p className="loading-icon">{Loading}</p>
            <p className="loading-text">{loadingText || "Loading data..."}</p>
        </div>
    );

    if (isLoading) {
        return loadingOverlay;
    } else {
        return null;
    }
};

export default LoadingOverlay;
