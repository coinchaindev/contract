import { ethers } from "hardhat";
import UniswapRouterABI from "../abi/UniswapRouterV2.json";

async function main(){
    const hre = require("hardhat");
    const [signer] = await ethers.getSigners();
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap Router
    const receiverAddress = ""; //Gnosis safe
    const tokenName = "";
    const tokenSymbol = "";
    const initialSupply = ethers.utils.parseEther("200000000");

    
    const router = new ethers.Contract(routerAddress, UniswapRouterABI, signer);
    const WETHAddress = await router.WETH();
    console.log("WETHAddress: ", WETHAddress)

    const coinchainToken = await (
        await ethers.getContractFactory("CoinchainToken")
    ).deploy(tokenName, tokenSymbol, initialSupply, WETHAddress, receiverAddress);
    await coinchainToken.deployed();
    console.log("coinchainTokenAddress: ", coinchainToken.address);

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