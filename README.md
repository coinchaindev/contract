# CoinChain Token

## INTRODUCTION
Hardhat project that contains the contracts, unit tests and relevant scripts for the CoinChain token and LockPayments contracts. The CoinchainToken contract is an ERC20 token with anti-bot measures implemented and role-based access control to protect sensitive functions. The LockPayments contract is designed to lock core team tokens for a certain vesting period before they can be released to their respective owners and is managed in batches of orders that contain addresses and amounts with a respective due date when the tokens can be released.

## REQUIREMENTS
Nodejs and Node Package Manager(npm)

## INSALLATION
npm install

## NODE SCRIPTS
### Build
`npm run build`
- clears artifacts, cache, coverage and typechain
- compiles solidity contracts
- recompiles typechain
### Test
`npm test`
- runs all tests in test folder
### Coverage
`npm run coverage`
- runs [solidity-coverage](https://github.com/sc-forks/solidity-coverage) plugin
- generates coverage folder in the projects root directory with full test coverage report

## HARDHAT SCRIPTS
- hardhat scripts used to interact with deployed smart contracts
- scripts are stored in the scripts folder and can be run using the npx command:
    - `npx hardhat run --network [mainnet, goerli etc...] [scipts/path/to/script]`
### CoinChainToken
#### token scripts are stored in scripts/coinchainToken
- [deployToken.ts](scripts/coinchainToken/deployToken.ts)
    - deploys [CoinchainToken.sol](contracts/CoinchainToken.sol) to chosen network and writes contract address to console
    - verifies contract in etherscan
### LockPayments
#### lock payments scripts are stored in scripts/lockPayments
- [deployLockPayments.ts](scripts/lockPayments/deployLockPayments.ts)
    - deploys [LockPayments.sol](contracts/LockPayments.sol) to chosen network and writes contract addres to console
    - verifies contract in etherscan
- [createBatches.ts](scripts/lockPayments/createBatches.ts)
    - reades batches.json file for batch information and calls createBatch()
    - writes transaction hashes to the console
    - requires the signer to be the owner of lockPayments contract
    - requires the signer to own the tokens that will be transfered to the LockPayments contract

 


