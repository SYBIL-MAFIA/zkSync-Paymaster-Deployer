import { utils, Provider, Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as fs from 'fs';

export default async function (hre: HardhatRuntimeEnvironment) {
  const provider = new Provider("https://zksync2-mainnet.zksync.io");

  // Read the private keys from the file
  const privateKeys = fs.readFileSync("./private_keys.txt", "utf8").trim().split("\n");

  for (const privateKey of privateKeys) {
    // The wallet that will deploy the token and the paymaster
    // It is assumed that this wallet already has sufficient funds on zkSync
    const wallet = new Wallet(privateKey);

    // Check ETH balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`ETH balance of ${wallet.address} is ${balance.toString()}`);

    // The wallet that will receive ERC20 tokens
    const emptyWallet = Wallet.createRandom();
    console.log(`Empty wallet's address: ${emptyWallet.address}`);
    console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);
    const deployer = new Deployer(hre, wallet);
    // Deploying the ERC20 token
    const erc20Artifact = await deployer.loadArtifact("MyERC20");
    const erc20 = await deployer.deploy(erc20Artifact, [
      "хуй",
      "хуй",
      18,
    ]);
    console.log(`ERC20 address: ${erc20.address}`);

    // Deploying the paymaster
    const paymasterArtifact = await deployer.loadArtifact("MyPaymaster");
    const paymaster = await deployer.deploy(paymasterArtifact, [erc20.address]);
    console.log(`Paymaster address: ${paymaster.address}`);

    console.log("Funding paymaster with ETH");
    // Supplying paymaster with ETH
    const fundTx = await deployer.zkWallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther("0.00010"),
    });
    await fundTx.wait();

    let paymasterBalance = await provider.getBalance(paymaster.address);

    console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

    // Supplying the ERC20 tokens to the empty wallet:
    const mintTx = await erc20.mint(emptyWallet.address, 30000);
    await mintTx.wait();

    console.log("Minted tokens for the empty wallet");

    console.log(`Done!`);

    // Writing logs to file
    const logs = `
    Paymaster address: ${paymaster.address}
    Paymaster ETH balance is now ${paymasterBalance.toString()}
    Transaction hash (Fund Paymaster): ${fundTx.hash}
    Transaction hash (Mint ERC20): ${mintTx.hash}
    `;

    fs.appendFileSync("log.txt", logs);
  }
}
