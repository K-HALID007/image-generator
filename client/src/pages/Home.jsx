import React from "react";
import Header from "../components/Header";
import Steps from "../components/Steps";
import Description from "../components/Description";
import Testinomials from "../components/Testinomials";
import GenrateButton from "../components/GenrateButton";

const Home = () => {
  return (
    <div>
      <Header />
      <Steps />
      <Description/>
      <Testinomials/>
      <GenrateButton/>
    </div>
  );
};

export default Home;
