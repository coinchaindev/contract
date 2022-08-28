import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CoinchainToken } from "../typechain-types";
import { FACTORY_ADDRESS, INIT_CODE_HASH } from '@uniswap/sdk'
import { mineBlock, setAutoMine } from "./utils/helpers";
import { keccak256 } from "ethers/lib/utils";
import { config } from "dotenv";


describe("CoinchainToken", () => {
    let coinchainToken: CoinchainToken;
    let [deployer, addr1, addr2, mockPair, receiver]: SignerWithAddress[] = [];

    beforeEach(async () => {
        [deployer, addr1, addr2, mockPair, receiver] = await ethers.getSigners();

        coinchainToken = await(
            await ethers.getContractFactory("CoinchainToken")
        ).deploy("Coinchain", "CCH", ethers.utils.parseEther("200000000"), mockPair.address, receiver.address);
        await coinchainToken.deployed();
    })

    describe("constructor()", async () => {
        it("Should deploy with correct initial values", async () => {
            const expectedPairAddress = ethers.utils.getCreate2Address(
                FACTORY_ADDRESS,
                ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.solidityPack(['address', 'address'], [coinchainToken.address, mockPair.address])]),
                INIT_CODE_HASH
              )

            expect(await coinchainToken.name()).to.equal("Coinchain");
            expect(await coinchainToken.symbol()).to.equal("CCH");
            expect(await coinchainToken.decimals()).to.equal(18);
            expect(await coinchainToken.totalSupply()).to.equal(ethers.utils.parseEther("200000000"));
            expect(await coinchainToken.balanceOf(receiver.address)).to.equal(ethers.utils.parseEther("200000000"));
            expect(await coinchainToken.pairAddress()).to.equal(expectedPairAddress);
            expect(await coinchainToken.hasRole(await coinchainToken.DEFAULT_ADMIN_ROLE(), receiver.address)).to.be.true;
            expect(await coinchainToken.hasRole(await coinchainToken.OPERATOR_ROLE(), deployer.address)).to.be.true;
        })
    })

    describe("maxTransferLimit", async () => {
        it("Should revert if transaction exceeds limit", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            await coinchainToken.setTransferLimit(ethers.utils.parseEther("99"));
            await coinchainToken.setTransferLimitEnabled(true);
            await expect(coinchainToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100")))
                .to.be.revertedWith("Token transfer amount exceeds limit");
        });
        it("Should not revert if transaction does not exceed limit", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            await coinchainToken.setTransferLimit(ethers.utils.parseEther("101"));
            await coinchainToken.setTransferLimitEnabled(true);
            await expect(coinchainToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100")))
                .to.not.be.reverted;
        });
        it("Should not revert if flag is set to false", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            await coinchainToken.setTransferLimit(ethers.utils.parseEther("99"));
            await coinchainToken.setTransferLimitEnabled(false);
            await expect(coinchainToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100")))
                .to.not.be.reverted;
        });
    });

    describe("liquidity snipe protection", async () => {
        it("Should revert if transfer within same block as liquidity add", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            await setAutoMine(false);
            await coinchainToken.connect(receiver).transfer(await coinchainToken.pairAddress(), ethers.utils.parseEther("100000"));
            let botTx = await coinchainToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100"));
            await setAutoMine(true);
            await expect(botTx.wait()).to.be.reverted;
        });
        it("Should not revert if transfer in block after liquidity add", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            await setAutoMine(false);
            await coinchainToken.connect(receiver).transfer(await coinchainToken.pairAddress(), ethers.utils.parseEther("100000"));
            await mineBlock();
            let botTx = await coinchainToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100"));
            await setAutoMine(true);
            expect( botTx.wait()).to.not.be.reverted;
        });
    });

    describe("mint", async () => {
        it("Should revert if caller does not have minter role", async ()=> {
            await expect(coinchainToken.connect(addr1).mint(addr1.address, ethers.utils.parseEther("1000000")))
                .to.be.reverted;
        })

        it("Should revert if caller has different role", async () => {
            expect(await coinchainToken.hasRole(await coinchainToken.OPERATOR_ROLE(), deployer.address)).to.be.true;
            expect(await coinchainToken.hasRole(await coinchainToken.MINTER_ROLE(), deployer.address)).to.be.false;
            await expect(coinchainToken.connect(deployer).mint(addr1.address, ethers.utils.parseEther("1000000")))
                .to.be.reverted;
        })

        it("Should revert if minter role has been revoked", async () => {
            const minterRole = await coinchainToken.MINTER_ROLE();
            await coinchainToken.connect(receiver).grantRole(minterRole, addr1.address);
            await coinchainToken.connect(addr1).mint(addr1.address, ethers.utils.parseEther("1000000"));
            expect(await coinchainToken.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("1000000"));
            await coinchainToken.connect(receiver).revokeRole(minterRole, addr1.address);
            await expect(coinchainToken.mint(addr1.address, ethers.utils.parseEther("1000000")))
                .to.be.reverted;
        })

        it("Should mint 1000000 tokens to given address", async () => {
            await coinchainToken.connect(receiver).grantRole(await coinchainToken.MINTER_ROLE(), addr1.address);
            await coinchainToken.connect(addr1).mint(addr1.address, ethers.utils.parseEther("1000000"));
            expect(await coinchainToken.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("1000000"));
        })

    })

    describe("burn", async () => {
        it("Should revert if caller does not own tokens", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            await expect(coinchainToken.connect(addr2).burnFrom(addr1.address, ethers.utils.parseEther("100")))
                .to.be.reverted;
        });

        it("Should burn 100 tokens", async () => {
            await coinchainToken.connect(receiver).transfer(addr1.address, ethers.utils.parseEther("100"));
            expect(await coinchainToken.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("100"));
            await coinchainToken.connect(addr1).burn(ethers.utils.parseEther("100"));
            expect(await coinchainToken.balanceOf(addr1.address)).to.equal(0);
        })
    })

    describe("rbac", async () => {
        it("Should initialize roles correctly", async () => {
            const defaultAdminRole = await coinchainToken.DEFAULT_ADMIN_ROLE();
            const adminRole = await coinchainToken.OPERATOR_ROLE();
            const minterRole = await coinchainToken.MINTER_ROLE();
            expect(await coinchainToken.getRoleMemberCount(defaultAdminRole)).to.equal(1);
            expect(await coinchainToken.getRoleMemberCount(adminRole)).to.equal(1);
            expect(await coinchainToken.getRoleMemberCount(minterRole)).to.equal(0);
            expect(await coinchainToken.hasRole(defaultAdminRole, receiver.address)).to.be.true;
            expect(await coinchainToken.hasRole(adminRole, deployer.address)).to.be.true;
        });

        it("Should revert if caller does not have default admin rol", async () => {
            await expect(coinchainToken.connect(deployer).grantMinterRole(addr1.address))
                .to.be.reverted;
            await expect(coinchainToken.connect(deployer).grantOperatorRole(addr1.address))
                .to.be.reverted;
        });

        it("Should grant the MINTER_ROLE", async () => {
            const minterRole = await coinchainToken.MINTER_ROLE();
            await coinchainToken.connect(receiver).grantMinterRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(minterRole)).to.equal(1);
            expect(await coinchainToken.hasRole(minterRole, addr1.address)).to.be.true;
        });

        it("Should revoke the MINTER_ROLE", async () => {
            const minterRole = await coinchainToken.MINTER_ROLE();
            await coinchainToken.connect(receiver).grantMinterRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(minterRole)).to.equal(1);
            expect(await coinchainToken.hasRole(minterRole, addr1.address)).to.be.true;
            await coinchainToken.connect(receiver).revokeMinterRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(minterRole)).to.equal(0);
            expect(await coinchainToken.hasRole(minterRole, addr1.address)).to.be.false;
        });

        it("Should grant the OPERATOR_ROLE", async () => {
            const operatorRole = await coinchainToken.OPERATOR_ROLE();
            await coinchainToken.connect(receiver).grantOperatorRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(operatorRole)).to.equal(2);
            expect(await coinchainToken.hasRole(operatorRole, addr1.address)).to.be.true;
        });

        it("Should revoke the OPERATOR_ROLE", async () => {
            const operatorRole = await coinchainToken.OPERATOR_ROLE();
            await coinchainToken.connect(receiver).grantOperatorRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(operatorRole)).to.equal(2);
            expect(await coinchainToken.hasRole(operatorRole, addr1.address)).to.be.true;
            await coinchainToken.connect(receiver).revokeOperatorRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(operatorRole)).to.equal(1);
            expect(await coinchainToken.hasRole(operatorRole, addr1.address)).to.be.false;
        });

        it("Should revert when attempting to revoke without default admin role", async () => {
            const operatorRole = await coinchainToken.OPERATOR_ROLE();
            const minterRole = await coinchainToken.MINTER_ROLE();
            await coinchainToken.connect(receiver).grantMinterRole(addr1.address);
            await coinchainToken.connect(receiver).grantOperatorRole(addr1.address);
            expect(await coinchainToken.getRoleMemberCount(minterRole)).to.equal(1);
            expect(await coinchainToken.hasRole(minterRole, addr1.address)).to.be.true;
            expect(await coinchainToken.getRoleMemberCount(operatorRole)).to.equal(2);
            expect(await coinchainToken.hasRole(operatorRole, addr1.address)).to.be.true;
            await expect(coinchainToken.connect(deployer).revokeMinterRole(addr1.address))
                .to.be.reverted;
            await expect(coinchainToken.connect(deployer).revokeOperatorRole(addr1.address))
                .to.be.reverted;
        });
    })
})