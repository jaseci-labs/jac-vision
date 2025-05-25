import Image from "next/image";
import React from "react";

function AppLogo() {
  return (
    <Image
      height={100}
      width={100}
      src={"/placeholder-logo.png"}
      alt="jaseci logo"
    />
  );
}

export default AppLogo;
