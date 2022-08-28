import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20Mock, LockPayments } from "../typechain-types";
import { FACTORY_ADDRESS, INIT_CODE_HASH } from '@uniswap/sdk'
import { getBlockTime, increaseTime, mineBlock, setAutoMine } from "./utils/helpers";
import { keccak256 } from "ethers/lib/utils";
import { config } from "dotenv";


describe("lockPayments", () => {
    let lockPayments: LockPayments;
    let mock: ERC20Mock;
    let [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9]: SignerWithAddress[] = [];

    beforeEach(async () => {
        [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] = await ethers.getSigners();

        lockPayments = await(
            await ethers.getContractFactory("LockPayments")
        ).deploy();
        await lockPayments.deployed();

        mock = await( await ethers.getContractFactory("ERC20Mock")).deploy();
        await mock.deployed();
    })

    describe("createBatch()", async () => {
        it("should create a batch with 1 address and 1 amount", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("100000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("100000"));
            let date = await getBlockTime() + 600;
            
            // Creating batch
            await lockPayments.createBatch([addr1.address], [ethers.utils.parseEther("100000")], date, mock.address);

            // Create batch functionaliy testing
            expect(await mock.balanceOf(lockPayments.address)).to.equal(ethers.utils.parseEther("100000"));
            expect(await mock.balanceOf(owner.address)).to.equal(0);

            // Comnparing getBatchAtrributes results with expected results
            const actualBatchAttributes = await lockPayments.getBatchAttributes(0);
            expect(actualBatchAttributes.addresses[0]).to.equal(addr1.address);
            expect(actualBatchAttributes.amounts[0]).to.equal(ethers.utils.parseEther("100000"));
            expect(actualBatchAttributes.dueDate).to.equal(date);
            expect(actualBatchAttributes.state).to.equal(0);
            expect(actualBatchAttributes.creationDate).to.be.closeTo(ethers.BigNumber.from(await getBlockTime()), 10);
            expect(actualBatchAttributes.releasedDate).to.equal(0);
            expect(actualBatchAttributes.paymentToken).to.equal(mock.address);
            expect(await lockPayments.totalBatches()).to.equal(1);
        })

        it("should revert when using zero address", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("100000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await expect(lockPayments.createBatch(
                [ethers.constants.AddressZero], 
                [ethers.utils.parseEther("100000")], 
                date, 
                mock.address)
            ).to.be.revertedWith("Error: Address cannot be zero address");
        })

        it("should revert when using an amount of 0", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("100000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await expect(lockPayments.createBatch(
                [addr1.address], 
                [ethers.utils.parseEther("0")], 
                date, 
                mock.address)
            ).to.be.revertedWith("Error: Invalid amount");
        })

        it("should revert when due date is before current block time", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("100000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await expect(lockPayments.createBatch(
                [addr1.address], 
                [ethers.utils.parseEther("100000")], 
                await getBlockTime() - 600, 
                mock.address)
            ).to.be.revertedWith("Error: Invalid Due Date");
        })

        it("should revert when length of addresses and amounts aren't equal", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("100000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await expect(lockPayments.createBatch(
                [addr1.address], 
                [ethers.utils.parseEther("100000"), ethers.utils.parseEther("200000")], 
                date, 
                mock.address)
            ).to.be.revertedWith("Error: length of addresses and amounts must be equal");
        })

        it("should revert when sender does not have enough tokens", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("100000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await expect(lockPayments.createBatch(
                [addr1.address], 
                [ethers.utils.parseEther("200000")], 
                date, 
                mock.address)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        })

        it("Should revert if amounts exceed max uint256", async () => {
            await mock.mint(owner.address, ethers.constants.MaxUint256);
            await mock.approve(lockPayments.address, ethers.constants.MaxUint256);
            let date = await getBlockTime() + 600;

            // Creating batch 0
            await expect(lockPayments.createBatch([addr1.address, addr2.address], [ethers.constants.MaxUint256, ethers.utils.parseEther("1")], date, mock.address))
                .to.be.reverted;
        })
    })

    describe("addOrderToBatch()", async () => {
        it("should add 2 addresses and 2 amounts to the orders in the batch", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("300000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("300000"));
            let date = await getBlockTime() + 600;
            
            // Creating batch
            await lockPayments.createBatch([addr1.address], [ethers.utils.parseEther("100000")], date, mock.address);

            // Adding order to batch
            await lockPayments.addOrderToBatch(0, [addr2.address, addr3.address], [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")]);

            // Add order to batch functionality testing
            const actualBatchAttributes = await lockPayments.getBatchAttributes(0);
            expect(actualBatchAttributes.addresses[0]).to.equal(addr1.address);
            expect(actualBatchAttributes.addresses[1]).to.equal(addr2.address);
            expect(actualBatchAttributes.addresses[2]).to.equal(addr3.address);
            expect(actualBatchAttributes.amounts[0]).to.equal(ethers.utils.parseEther("100000"));
            expect(actualBatchAttributes.amounts[1]).to.equal(ethers.utils.parseEther("100000"));
            expect(actualBatchAttributes.amounts[2]).to.equal(ethers.utils.parseEther("100000"));
            expect(actualBatchAttributes.dueDate).to.equal(date);
            expect(actualBatchAttributes.state).to.equal(0);
            expect(actualBatchAttributes.creationDate).to.be.closeTo(ethers.BigNumber.from(await getBlockTime()), 20);
            expect(actualBatchAttributes.releasedDate).to.equal(0);
            expect(actualBatchAttributes.paymentToken).to.equal(mock.address);
            expect(await lockPayments.totalBatches()).to.equal(1);
        })

        it("should revert when length of addresses and amounts aren't equal", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("200000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await lockPayments.createBatch([addr1.address], [ethers.utils.parseEther("100000")], date, mock.address);

            await expect(lockPayments.addOrderToBatch(
                0, 
                [addr4.address, addr5.address],
                [ethers.utils.parseEther("100000")]
            ))
            .to.be.revertedWith("Error: length of addresses and amounts must be equal");
        })

        it("should revert when batchId doesn't exist", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("200000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await lockPayments.createBatch([addr1.address], [ethers.utils.parseEther("100000")], date, mock.address);

            await expect(lockPayments.addOrderToBatch(
                2, 
                [addr4.address],
                [ethers.utils.parseEther("100000")]
            ))
            .to.be.revertedWith("Error: Invalid batchId (batch does not exist)");
        })

        it("should revert when using amount of zero", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("200000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await lockPayments.createBatch([addr1.address], [ethers.utils.parseEther("100000")], date, mock.address);

            await expect(lockPayments.addOrderToBatch(
                0, 
                [addr4.address],
                [ethers.utils.parseEther("0")]
            ))
            .to.be.revertedWith("Error: Invalid amount");
        })

        it("should revert when using zero address", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("200000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("200000"));
            let date = await getBlockTime() + 600;

            await lockPayments.createBatch([addr1.address], [ethers.utils.parseEther("100000")], date, mock.address);

            await expect(lockPayments.addOrderToBatch(
                0, 
                [ethers.constants.AddressZero],
                [ethers.utils.parseEther("100000")]
            ))
            .to.be.revertedWith("Error: Address cannot be zero address");
        })
    })

    describe("removeOrderFromBatch()", async () => {
        it("should remove 2 address and 2 amounts from the orders in the batch", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("300000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("300000"));
            let date = await getBlockTime() + 600;
            
            // Creating batch
            await lockPayments.createBatch([addr1.address, addr2.address, addr3.address], [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")], date, mock.address);

            // Create batch functionaliy testing
            expect(await mock.balanceOf(lockPayments.address)).to.equal(ethers.utils.parseEther("300000"));
            expect(await mock.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("0"));

            // Removing order from batch
            await lockPayments.removeOrderFromBatch(0, [addr1.address, addr2.address]);

            // Remove order from batch functionality testing
            const actualBatchAttributes = await lockPayments.getBatchAttributes(0);
            expect(actualBatchAttributes.addresses.length).to.equal(1);
            expect(actualBatchAttributes.amounts.length).to.equal(1);
            expect(actualBatchAttributes.addresses[0]).to.equal(addr3.address);
            expect(actualBatchAttributes.amounts[0]).to.equal(ethers.utils.parseEther("100000"));
            expect(actualBatchAttributes.dueDate).to.equal(date);
            expect(actualBatchAttributes.state).to.equal(0);
            expect(actualBatchAttributes.creationDate).to.be.closeTo(ethers.BigNumber.from(await getBlockTime()), 30);
            expect(actualBatchAttributes.releasedDate).to.equal(0);
            expect(actualBatchAttributes.paymentToken).to.equal(mock.address);
            expect(await lockPayments.totalBatches()).to.equal(1);

        })

        it("should revert if batch does not exist", async () => {
            await expect(lockPayments.removeOrderFromBatch(1, [addr1.address]))
                .to.be.revertedWith("Error: Invalid batchId (batch does not exist)");
        })

    })

    describe("removeBatch()", async () => {
        it("should remove an entire batch", async () =>  {
            await mock.mint(owner.address, ethers.utils.parseEther("300000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("300000"));
            let date = await getBlockTime() + 600;

            // Creating 3 batches
            await lockPayments.createBatch(
                [
                    addr1.address, 
                    addr2.address, 
                    addr3.address
                ], 
                [
                    ethers.utils.parseEther("100000"), 
                    ethers.utils.parseEther("100000"), 
                    ethers.utils.parseEther("100000")
                ], 
                date, 
                mock.address
            );

            // Removing entire batch
            await lockPayments.removeBatch(0);

            // Remove batch functionality testing
            expect(await mock.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("300000"));
            expect(await mock.balanceOf(lockPayments.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await (await lockPayments.getBatchAttributes(0)).state).to.equal(2);
            
        })

        it("should revert if batch does not exist", async () => {
            await expect(lockPayments.removeBatch(5))
                .to.revertedWith("Error: Invalid batchId (batch does not exist)");
        })
    })

    describe("desperseBatch()", async () => {
        it("Should revert if batch does not exist", async () => {
            await expect(lockPayments.disperseBatch(0))
                .to.be.revertedWith("Error: Invalid batchId (batch does not exist)") 
        });

        it("Should revert if state is Removed", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("900000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("900000"));
            let date = await getBlockTime() + 600;
            // Creating batch 0
            await lockPayments.createBatch([addr1.address, addr2.address, addr3.address], [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")], date, mock.address);
            await lockPayments.removeBatch(0);
            await increaseTime(700);
            await expect(lockPayments.disperseBatch(0)).to.be.revertedWith("Error: Invalid batchId (batch removed or completed)");
        })

        it("Should revert if state is Complete", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("900000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("900000"));
            let date = await getBlockTime() + 600;
            // Creating batch 0
            await lockPayments.createBatch([addr1.address, addr2.address, addr3.address], [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")], date, mock.address);
            await increaseTime(700);
            await lockPayments.disperseBatch(0);
            await expect(lockPayments.disperseBatch(0)).to.be.revertedWith("Error: Invalid batchId (batch removed or completed)");
        })

        it("Should revert if batch due date not met", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("900000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("900000"));
            let date = await getBlockTime() + 600;
            // Creating batch 0
            await lockPayments.createBatch([addr1.address, addr2.address, addr3.address], [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")], date, mock.address);
            await expect(lockPayments.disperseBatch(0)).to.be.revertedWith("Error: Batch due date not met");
        })

        it("Should disperse batch", async () => {
            await mock.mint(owner.address, ethers.utils.parseEther("900000"));
            await mock.approve(lockPayments.address, ethers.utils.parseEther("900000"));
            let date = await getBlockTime() + 600;
            // Creating batch 0
            await lockPayments.createBatch([addr1.address, addr2.address, addr3.address], [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")], date, mock.address);
            await increaseTime(700);
            await lockPayments.disperseBatch(0);
            const actualBatchAttributes = await lockPayments.getBatchAttributes(0);
            expect(actualBatchAttributes.state).to.equal(1);
            expect(actualBatchAttributes.releasedDate).to.be.closeTo(ethers.BigNumber.from(await getBlockTime()), 50);
            expect(await mock.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("100000"));
            expect(await mock.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther("100000"));
            expect(await mock.balanceOf(addr3.address)).to.equal(ethers.utils.parseEther("100000"));
            expect(await mock.balanceOf(lockPayments.address)).to.equals(0)

        })

    })
})