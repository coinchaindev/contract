import { create } from "domain";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import BATCHES from "./batches.json";

async function main(){
    const [signer] = await ethers.getSigners();

    const coinchainTokenAddress = "0xc4f6D1fede1D1670244274A399da20C3Ced4A063";
    const lockPaymentsAddress = "0xc84D315FbE485B67715bAA2A1a6603ED24E5e04F";

    const coinchainToken = await ethers.getContractAt("CoinchainToken", coinchainTokenAddress);
    const lockPayments = await ethers.getContractAt("LockPayments", lockPaymentsAddress);

    for(let i = 0; i < BATCHES.length; i++) {
        const batch = BATCHES[i];
        const dueDate = batch.dueDate;
        let addresses: string[] = [];
        let amounts: BigNumber[] = [];
        let totalAmount = 0;
        batch.orders.forEach( (order) => {
            addresses.push(order.address);
            amounts.push(ethers.utils.parseEther(order.amount))
            totalAmount += Number(order.amount);
        });
    
        const approvalTx = await coinchainToken.approve(lockPayments.address, ethers.utils.parseEther(totalAmount.toString()));
        console.log(`approvalTx ${i}: ${approvalTx.hash}`);
        await approvalTx.wait();
        const createBatchTx = await lockPayments.createBatch(
            addresses,
            amounts,
            dueDate,
            coinchainTokenAddress
        )
        console.log(`createBatchTx ${i}: ${createBatchTx.hash}`);
        await createBatchTx.wait();
    }
}

main().catch((error) => {
    console.log(error);
    process.exit(1);
})