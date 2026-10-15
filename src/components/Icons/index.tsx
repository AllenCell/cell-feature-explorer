import React from "react";
import { LoadingOutlined } from "@ant-design/icons";

import AicsLogoWhite from "../../assets/images/AICS-logo-full.png";

export const Loading = <LoadingOutlined style={{ fontSize: 40 }} spin />;
export const AicsLogo = (
    <img src={AicsLogoWhite} style={{ width: "140px" }} alt={"Allen Institute for Cell Science"} />
);

export default {
    Loading,
};
