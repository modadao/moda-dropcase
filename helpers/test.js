const callAndReturn = async ({
  contractInstance,
  contractMethod,
  contractCaller,
  contractParams = [],
  callValue = "0",
}) => {
  const returnValue = await contractInstance
    .connect(contractCaller)
    .callStatic[contractMethod](...contractParams, { value: callValue });
  const tx = await contractInstance
    .connect(contractCaller)
    [contractMethod](...contractParams, { value: callValue });
  const receipt = await tx.wait();
  console.log(contractMethod, receipt.gasUsed);
  return returnValue;
};
module.exports = (network) => {
  return {
    callAndReturn: callAndReturn,
  };
};
