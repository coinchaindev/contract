import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export const setAutoMine = async (automine: boolean): Promise<void> => {
  await mineBlock();
  await ethers.provider.send("evm_setAutomine", [automine]);
};

export const mineBlock = async (): Promise<void> => {
  await ethers.provider.send("evm_mine", []);
};

export const increaseTime = async (sec: number): Promise<void> => {
  await ethers.provider.send("evm_increaseTime", [sec]);
  await mineBlock();
};

export const getBlockTime = async (): Promise<number> => {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp;
};

export const sumBigNumbers = (numbers: BigNumber[]): BigNumber => {
  return numbers.reduce((prev, curr) => prev.add(curr));
};
