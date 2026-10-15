import { map } from "lodash";
import * as React from "react";

import { Megaset } from "../../state/image-dataset/types";
import DatasetCard from "../../components/DatasetCard";

import styles from "./style.module.css";

interface MegasetCardProps {
    key: string;
    megaset: Megaset;
    handleSelectDataset: (id: string) => void;
}

/* 
Mirroring our data structure, every dataset card is rendered in a MegasetCard,
but a MegasetCard can contain one or multiple dataset cards.
*/
const MegasetCard: React.FunctionComponent<MegasetCardProps> = ({
    megaset,
    handleSelectDataset,
}: MegasetCardProps) => {
    const computedStyle = getComputedStyle(document.body);
    const datasetCardWidth = computedStyle.getPropertyValue("--dataset-card-width");
    const numDatasets = Object.keys(megaset.datasets).length;
    // Set a max-width for the container so that publications shrink into the
    // container instead of the container expanding to fit publications
    const maxWidth = numDatasets > 1 ? "100%" : datasetCardWidth;

    const datasets = map(megaset.datasets).sort((a, b) => a.index - b.index);
    return (
        <div key={megaset.name} className={styles.container} style={{ maxWidth: maxWidth }}>
            {numDatasets > 1 && <div className={styles.megasetTitle}>{megaset.title}</div>}
            <div className={styles.datasetCards}>
                {map(datasets, (dataset) => (
                    <DatasetCard
                        key={dataset.id}
                        {...dataset}
                        handleSelectDataset={handleSelectDataset}
                    />
                ))}
            </div>
            {megaset.extra && <div className={styles.extra}>{megaset.extra}</div>}
            {megaset.publications && megaset.publications.length > 0 && (
                <div className={styles.publications}>
                    Publications
                    {megaset.publications.map((publication) => (
                        <div
                            key={`${megaset.name}-${publication.title}`}
                            className={styles.publication}
                        >
                            <div className={styles.publicationTitle}>
                                <a href={publication.url} target="blank">
                                    {publication.title}
                                </a>
                            </div>
                            <div className={styles.journalDate}>{publication.citation}.</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MegasetCard;
