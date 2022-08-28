import { expect } from "chai";
import { ethers } from "hardhat";
import UniswapRouterABI from "../abi/UniswapRouterV2.json";

async function main(){
    const hre = require("hardhat");
    const [signer] = await ethers.getSigners();
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap Router
    
    const router = new ethers.Contract(routerAddress, UniswapRouterABI, signer);
    const WETHAddress = await router.WETH();
    console.log("WETHAddress: ", WETHAddress)
    
    // Test Data
    const receiverAddress = "0xf5ec8C9d97228f13c6f6B8a66FD2c4104Bf63b95"; //Gnosis safe
    const tokenName = "CoinChainE2E";
    const tokenSymbol = "CCHE2E";
    const initialSupply = ethers.utils.parseEther("200000000");

    // Deploy Contract
    const coinchainToken = await (
        await ethers.getContractFactory("CoinchainToken")
    ).deploy(tokenName, tokenSymbol, initialSupply, WETHAddress, receiverAddress);
    await coinchainToken.deployed();
    console.log("coinchainTokenAddress: ", coinchainToken.address);

    // Verify Contract
    setTimeout(async () => {
        try{
            await hre.run("verify:verify", {
                address: coinchainToken.address,
                constructorArguments: [
                    tokenName,
                    tokenSymbol,
                    initialSupply,
                    WETHAddress,
                    receiverAddress
                ]
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