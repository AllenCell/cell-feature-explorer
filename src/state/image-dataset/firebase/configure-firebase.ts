import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { FirebaseFirestore } from "@firebase/firestore-types";

import { USE_DEV_DB } from "../../../constants";

const firebaseConfig = {
    apiKey: "AIzaSyD691xhXsWl-8QU_9htjZnMUd7siWVCTAE",
    appId: "1:40711248674:web:511cb4cede47191274237b",
    authDomain: "allen-cell-resource.firebaseapp.com",
    databaseURL: "https://allen-cell-resource.firebaseio.com",
    measurementId: "G-8553S8ESS7",
    messagingSenderId: "40711248674",
    projectId: "allen-cell-resource",
    storageBucket: "allen-cell-resource.appspot.com",
};

const firebaseDevConfig = {
    apiKey: "AIzaSyBJvPTPnYWmp5arSFzhNDlqWTsWIqmiyeE",
    authDomain: "allen-cell-resource-staging.firebaseapp.com",
    projectId: "allen-cell-resource-staging",
    storageBucket: "allen-cell-resource-staging.appspot.com",
    messagingSenderId: "999314085745",
    appId: "1:999314085745:web:98af391a384adab7d6c8d0",
    measurementId: "G-9J5TY9YYVE",
};
// Initialize Firebase
firebase.initializeApp(USE_DEV_DB ? firebaseDevConfig : firebaseConfig);

const firestore: FirebaseFirestore = firebase.firestore();

export { firebase, firestore };

export default firestore;
