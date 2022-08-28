import { expect } from "chai";
import { ethers } from "hardhat";
import UniswapRouterABI from "../abi/UniswapRouterV2.json";

async function main(){
    const hre = require("hardhat");
    const [signer] = await ethers.getSigners();

    // Deploy Contract
    const lockPayments = await (
        await ethers.getContractFactory("LockPayments")
    ).deploy();
    await lockPayments.deployed();
    console.log("lockPaymentsAddress: ", lockPayments.address);

    // Verify Contract
    setTimeout(async () => {
        try{
            await hre.run("verify:verify", {
                address: lockPayments.address,
                constructorArguments: []
            })
        }catch(e){
            console.log("Unable to verify: ", e);
        }
    }, 120000)
 
}

main().catch((error) => {
    console.log(error);
    process.exit(1);
})