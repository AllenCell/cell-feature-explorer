import axios from "axios";
import { merge } from "lodash";
import { applyMiddleware, combineReducers, createStore } from "redux";
import { createLogicMiddleware } from "redux-logic";

import { USE_REDUX_DEVTOOLS } from "../constants";
import { enableBatching, initialState, imageDataset, metadata, selection, State } from "./";
import devtoolsCompose from "./redux-devtools";

const reducers = {
    metadata: metadata.reducer,
    selection: selection.reducer,
    imageDataset: imageDataset.reducer,
};

const logics = [...metadata.logics, ...selection.logics, ...imageDataset.logics];

const reduxLogicDependencies = {
    httpClient: axios,
};

export default function createReduxStore(preloadedState?: Partial<State>) {
    const logicMiddleware = createLogicMiddleware(logics);
    logicMiddleware.addDeps(reduxLogicDependencies);

    const middleware = USE_REDUX_DEVTOOLS
        ? devtoolsCompose(applyMiddleware(logicMiddleware))
        : applyMiddleware(logicMiddleware);
    const rootReducer = enableBatching<State>(combineReducers(reducers), initialState);

    if (preloadedState) {
        const mergedState = merge({}, initialState, preloadedState);
        return createStore(rootReducer, mergedState, middleware);
    }

    return createStore(rootReducer, middleware);
}
