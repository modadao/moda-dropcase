const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const erc721ABI = require("../abis/erc721NFT.json");
const erc1155ABI = require("../abis/erc1155NFT.json");
const { callAndReturn } = require("../helpers/test")(network);

// Charged Particles imports
const ChargedSettingsAbi = require("@charged-particles/protocol-subgraph/abis/ChargedSettings.json");
const ChargedParticlesAbi = require("@charged-particles/protocol-subgraph/abis/ChargedParticles.json");
const chargedParticlesMainnetAddress = require("@charged-particles/protocol-subgraph/networks/mainnet.json");

describe("Dropcase", async () => {
  let customNFT;
  let deploymentAddress;
  let musicNFTContract;
  let musicNFTTokenId;
  let dropCaseTokenId1;
  let dropCaseTokenId2;
  let provider = new ethers.providers.Web3Provider(network.provider);
  let ChargedParticlesContract;
  let ChargedSettingContract;

  const chargedSettingsMainnetAddress =
    chargedParticlesMainnetAddress.chargedSettings.address;
  const chargedParticlesContractMainnetAddress =
    chargedParticlesMainnetAddress.chargedParticles.address;
  beforeEach(async () => {
    // runs once before the first test in this block
    ChargedParticlesContract = new ethers.Contract(
      chargedParticlesContractMainnetAddress,
      ChargedParticlesAbi,
      provider
    );
    ChargedSettingContract = new ethers.Contract(
      chargedSettingsMainnetAddress,
      ChargedSettingsAbi,
      provider
    );

    // Deploy custom NFT
    const [owner, addr1, addr2] = await ethers.getSigners();
    this.addr1 = addr1;
    this.addr2 = addr2;
    const CustomNFT = await ethers.getContractFactory("DropCase");
    customNFT = await CustomNFT.deploy();
    const deployed = await customNFT.deployed();
    deploymentAddress = deployed.address;

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [process.env.DEPLOYER_ADDRESS],
    });

    // Mint 2 dropcases
    dropCaseTokenId1 = new ethers.BigNumber.from(
      await callAndReturn({
        contractInstance: customNFT,
        contractMethod: "mintNft",
        contractCaller: owner,
        contractParams: [owner.address, "a"],
      })
    ).toNumber();
    console.log(dropCaseTokenId1);

    await callAndReturn({
      contractInstance: customNFT,
      contractMethod: "transferFrom",
      contractCaller: owner,
      contractParams: [owner.address, addr1.address, dropCaseTokenId1],
    });

    dropCaseTokenId2 = await callAndReturn({
      contractInstance: customNFT,
      contractMethod: "mintNft",
      contractCaller: owner,
      contractParams: [owner.address, "a"],
    });

    await callAndReturn({
      contractInstance: customNFT,
      contractMethod: "transferFrom",
      contractCaller: owner,
      contractParams: [owner.address, addr2.address, dropCaseTokenId2],
    });

    console.log("---Minted DropCase TokenId: ", dropCaseTokenId1);

    // Mint a music NFT and get tokenId
    musicNFTContract = new ethers.Contract(
      process.env.MUSIC_NFT_CONTRACT,
      erc721ABI,
      provider
    );
    // const nftPrice = new ethers.BigNumber.from(
    //   await musicNFTContract.PRICE_PER_TOKEN()
    // );
    const nftPrice = ethers.utils.parseEther("0.06");

    const tx = await musicNFTContract
      .connect(addr1)
      .publicMint(1, { value: nftPrice });
    const rc = await tx.wait();

    const transferEventTopic = ethers.utils.id(
      "Transfer(address,address,uint256)"
    );

    const transferEvents = rc.events.filter(({ topics }) =>
      topics.includes(transferEventTopic)
    );

    const abi = [
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ];
    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = iface.parseLog(transferEvents[0]);
    const [from, to, value] = parsedEvent.args;
    musicNFTTokenId = ethers.BigNumber.from(value).toNumber();

    console.log("---Minted Music NFT Token Id: ", musicNFTTokenId);
    console.log(
      "---Owner of dropcase: ",
      await customNFT.ownerOf(dropCaseTokenId1)
    );
    console.log(
      "---Owner of musicNFT: ",
      await musicNFTContract.ownerOf(musicNFTTokenId)
    );

    // Get Charged Particle owner address
    const adminAddress = await ChargedParticlesContract.connect(
      provider
    ).owner();

    // impersonate admin account
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [adminAddress],
    });

    // Whitelist custom NFT
    const cpOwner = await ethers.getSigner(adminAddress);
    const whiteList = await ChargedSettingContract.connect(
      cpOwner
    ).enableNftContracts([deploymentAddress]);
    await whiteList.wait();

    await musicNFTContract
      .connect(this.addr1)
      .setApprovalForAll(chargedParticlesContractMainnetAddress, true);
  });

  it("Interacts with charged particle protocol", async () => {
    const contractResponse = await ChargedParticlesContract.connect(
      provider
    ).getStateAddress();
    expect(contractResponse).to.be.equal(
      chargedParticlesMainnetAddress.chargedState.address
    );
  });

  it("can successfully deposit nfts", async () => {
    const depositNFTRes = await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "covalentBond",
      contractCaller: this.addr1,
      contractParams: [
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });
    const res = new ethers.BigNumber.from(
      await ChargedParticlesContract.callStatic.currentParticleCovalentBonds(
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B"
      )
    ).toNumber();

    expect(depositNFTRes).to.be.equal(true);
    expect(res).to.be.equal(1);
  });

  it("can successfully transfer nft from dropcase to wallet", async () => {
    await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "covalentBond",
      contractCaller: this.addr1,
      contractParams: [
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });

    const res = await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "breakCovalentBond",
      contractCaller: this.addr1,
      contractParams: [
        this.addr1.address,
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });
    expect(res).to.be.equal(true);
  });

  it("can successfully transfer nft between dropcases", async () => {
    await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "covalentBond",
      contractCaller: this.addr1,
      contractParams: [
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });

    await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "breakCovalentBond",
      contractCaller: this.addr1,
      contractParams: [
        this.addr1.address,
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });

    const res = await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "covalentBond",
      contractCaller: this.addr1,
      contractParams: [
        deploymentAddress,
        dropCaseTokenId2,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });
    expect(res).to.be.equal(true);

    const res2 = new ethers.BigNumber.from(
      await ChargedParticlesContract.callStatic.currentParticleCovalentBonds(
        deploymentAddress,
        dropCaseTokenId2,
        "generic.B"
      )
    ).toNumber();
    expect(res2).to.be.equal(1);
  });

  it("can successfully withdraw nft from dropcase to wallet", async () => {
    await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "covalentBond",
      contractCaller: this.addr1,
      contractParams: [
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });

    const res = await callAndReturn({
      contractInstance: ChargedParticlesContract,
      contractMethod: "breakCovalentBond",
      contractCaller: this.addr1,
      contractParams: [
        this.addr1.address,
        deploymentAddress,
        dropCaseTokenId1,
        "generic.B",
        process.env.MUSIC_NFT_CONTRACT,
        musicNFTTokenId,
        1,
      ],
    });

    expect(res).to.be.equal(true);
  });
});
