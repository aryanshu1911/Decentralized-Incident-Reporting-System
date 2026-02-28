async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const Contract = await ethers.getContractFactory("ComplaintHash");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ComplaintHash deployed at:", address);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });