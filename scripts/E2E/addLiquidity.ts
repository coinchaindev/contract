import { expect } from "chai";
import { ethers } from "hardhat";
import UniswapRouterABI from "../abi/UniswapRouterV2.json";

async function main(){
    const [signer] = await ethers.getSigners();
    // const WETHAddress = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const coinchainTokenAddress = "0xc4f6D1fede1D1670244274A399da20C3Ced4A063";

    
    const router = new ethers.Contract(routerAddress, UniswapRouterABI, signer);
    const coinchainToken = await ethers.getContractAt("CoinchainToken", coinchainTokenAddress);
    const WETHAddress = await router.WETH();
    console.log("WETHAddress: ", WETHAddress)
    const weth = await ethers.getContractAt("IERC20", WETHAddress);

    const erc20TokenAmount = ethers.utils.parseEther("20000");
    const wethAmount = ethers.utils.parseEther("1");

    let erc20TokenApprovalTx = await coinchainToken.approve(router.address, ethers.utils.parseEther("100000"));
    await erc20TokenApprovalTx.wait();
    console.log("erc20Approval: ", erc20TokenApprovalTx.hash);
    let wethApprovalTx = await weth.approve(router.address, ethers.utils.parseEther("100000"));
    await wethApprovalTx.wait();
    console.log("wethApproval: ", wethApprovalTx.hash);


    let deadline = Math.floor(Date.now() / 1000) + 60;
    const addLiquidity = await router.addLiquidityETH(coinchainToken.address, erc20TokenAmount, erc20TokenAmount, wethAmount, signer.address, deadline, {value: wethAmount});
    let alMaxFeePerGas = addLiquidity.maxFeePerGas;
    let alMaxPriorityFeePerGas = addLiquidity.maxPriorityFeePerGas;
    console.log("addLiqTx: ", addLiquidity.hash);
    try{
        let shouldBlockTx = await router.swapExactETHForTokens(
            ethers.utils.parseEther("0.01"), 
            [weth.address, coinchainToken.address], 
            signer.address, deadline, 
            {
                value: ethers.utils.parseEther("0.05"),
                maxFeePerGas: alMaxFeePerGas - 1,
                maxPriorityFeePerGas: alMaxPriorityFeePerGas - 2,
                gasLimit: ethers.BigNumber.from(189233)
            })
            console.log("shouldBlockTx: ", shouldBlockTx.hash);
    } catch(e) {
        console.log("swap blocked in block immediately after liquidity add");
        console.log(e);
    }
    await addLiquidity.wait();
    let transferTx = await router.swapExactETHForTokens(
        ethers.utils.parseEther("0.01"), 
        [weth.address, coinchainToken.address], 
        signer.address, deadline, 
        {
            value: ethers.utils.parseEther("0.05"),
            gasLimit: ethers.BigNumber.from(189233)
        });
    console.log("swap after liquidity add mined: ", transferTx.hash);   
}

main().catch((error) => {
    console.log(error);
    process.exit(1);
})