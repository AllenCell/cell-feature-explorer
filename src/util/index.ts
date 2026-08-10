export { default as UrlState } from "./UrlState";

const ALLEN_FILE_PREFIX = "/allen/";
const ALLEN_PREFIX_TO_HTTPS: Record<string, string> = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "/allen/aics/": "https://vast-files.int.allencell.org/",
};

const URL_REGEX = /^(https?:\/\/)/;

export function getCellLineFromLegacyCellID(cellID: string): string {
    return cellID.split("_")[0];
}

export function isDevOrStagingSite(host: string): boolean {
    // first condition is for testing with no client
    return !host || host.includes("localhost") || host.includes("staging") || host.includes("stg");
}

function stringReplaceAll(input: string, searchValue: string, replaceValue: string): string {
    return input.split(searchValue).join(replaceValue);
}

/**
 * Normalizes a file path to use only single forward slashes. Replaces
 * backwards slashes with forward slashes, and removes double slashes.
 */
function normalizeFilePathSlashes(input: string): string {
    // Replace all backslashes with forward slashes
    input = stringReplaceAll(input, "\\", "/");
    // Replace double slashes with single
    input = stringReplaceAll(input, "//", "/");
    if (input.startsWith("//")) {
        // If the string still starts with double slashes, remove the first.
        // (Usually `\\\\` for Windows paths)
        input = input.slice(1);
    }
    return input;
}

/**
 * Returns whether the input string is a path to an Allen file server resource.
 * Matches any path that starts with `/allen/`, normalizing for backwards and double slashes.
 */
export function isAllenPath(input: string): boolean {
    return normalizeFilePathSlashes(input).startsWith(ALLEN_FILE_PREFIX);
}

export function isUrl(input: string): boolean {
    return URL_REGEX.test(input);
}

/**
 * Attempts to convert an Allen path to an HTTPS resource path.
 * @returns Returns null if the path was not recognized or could not be converted,
 * otherwise, returns an HTTPS resource path.
 */
export function convertAllenPathToHttps(input: string): string | null {
    input = normalizeFilePathSlashes(input);
    for (const prefix of Object.keys(ALLEN_PREFIX_TO_HTTPS)) {
        if (input.startsWith(prefix)) {
            return input.replace(prefix, ALLEN_PREFIX_TO_HTTPS[prefix]);
        }
    }
    return null;
}

export async function fetchCsvText(url: string): Promise<{ url: string; text: string }> {
    if (!url) {
        throw new Error("No URL provided.");
    }
    if (isAllenPath(url)) {
        const convertedUrl = convertAllenPathToHttps(url);
        if (convertedUrl) {
            url = convertedUrl;
        } else {
            throw new Error(
                `'${url}' is an Allen path, but could not be converted to an HTTPS URL. ` +
                    `The provided path may not be servable over HTTPS. Please submit an issue ticket if you believe this is incorrect.`
            );
        }
    }
    console.log(`Fetching CSV dataset from url: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch CSV dataset from url '${url}': ${response.status} ${response.statusText}`
        );
    }
    const text = await response.text();
    return { url, text };
}
