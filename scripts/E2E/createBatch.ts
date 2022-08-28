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
    const dueDate = ethers.BigNumber.from(block.timestamp + HOUR);
    console.log("dueDate: ", dueDate);
    let addresses: string[] = [];
    let amounts: BigNumber[] = []
    ORDERS.forEach( (order) => {
        addresses.push(order.address);
        amounts.push(ethers.utils.parseEther(order.amount))
    });

    const approvalTx = await coinchainToken.approve(lockPayments.address, ethers.utils.parseEther("111000"));
    console.log(approvalTx.hash);
    await approvalTx.wait();
    const createBatchTx = await lockPayments.createBatch(
        addresses,
        amounts,
        dueDate,
        coinchainTokenAddress
    )
    console.log("createBatchTx: ", createBatchTx.hash);
    await createBatchTx.wait();
}

main().catch((error) => {
    console.log(error);
    process.exit(1);
})