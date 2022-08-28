import { create } from "domain";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import ORDERS from "./orders.json";

async function main(){
    const [signer] = await ethers.getSigners();
    const HOUR = 60*60;
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);

    const coinchainTokenAddress = "0xc4f6D1fede1D1670244274A399da20C3Ced4A063";
    const lockPaymentsAddress = "0xc84D315FbE485B67715bAA2A1a6603ED24E5e04F";

    const coinchainToken = await ethers.getContractAt("CoinchainToken", coinchainTokenAddress);
    const lockPayments = await ethers.getContractAt("LockPayments", lockPaymentsAddress);

    //Order to remove 
    const addressToRemove = "0x9C33a17D74324a2aB320e3326B702d56C2A4b6D3";
    const removeOrderTx = await lockPayments.removeOrderFromBatch(0, [addressToRemove]);
    console.log("removeOrderTx: ", removeOrderTx.hash);
    await removeOrderTx.wait();

    //Order to add
    const addressToAdd = "0x8298ab6Ec49CFa40c8b98E8C5b65aA8fCe0C0d9b";
    const amountToAdd = ethers.utils.parseEther("50000");
    const approvalTx = await coinchainToken.approve(lockPayments.address, amountToAdd);
    console.log("approval: ", approvalTx.hash);
    await approvalTx.wait();
    const addOrderTx = await lockPayments.addOrderToBatch(0, [addressToAdd], [amountToAdd]);
    console.log("addOrderTx: ", addOrderTx.hash);
    await addOrderTx.wait();
}

main().catch((error) => {
    console.log(error);
    process.exit(1);
})