// SPDX-License-Identifier: MIT LICENSE

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

contract LockPayments is Ownable {
    using EnumerableMap for EnumerableMap.AddressToUintMap;

    /*///////////////////////////////////////////////////////////////
                    DATA STRUCTURES 
    //////////////////////////////////////////////////////////////*/

    enum State { Pending, Completed, Removed }

    struct Batch {
        EnumerableMap.AddressToUintMap orders;
        uint256 dueDate;
        State state;
        uint256 creationDate;
        uint256 releasedDate;
        address paymentToken;
    }

    /*///////////////////////////////////////////////////////////////
                    GLOBAL STATE
    //////////////////////////////////////////////////////////////*/

    uint256 public totalBatches = 0;
    mapping(uint256 => Batch) private batches;

    /*///////////////////////////////////////////////////////////////
                    VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the attributes of a specific batch ID
     * @param batchId The batch ID number
     * @return addresses List of addresses in a batch
     * @return amounts List of amounts in a batch
     * @return dueDate Date at whcih batch can be dispersed
     * @return state Current state of a batch
     * @return creationDate Date batch was created
     * @return releasedDate Date batch was released/dispersed
     * @return paymentToken Payment token of batch
     */
    function getBatchAttributes(uint256 batchId) external view returns (address[] memory addresses, uint256[] memory amounts, uint256 dueDate, State state, uint256 creationDate, uint256 releasedDate, address paymentToken) {
        addresses = new address[](batches[batchId].orders.length());
        amounts = new uint256[](batches[batchId].orders.length());
        for (uint256 i = 0; i < batches[batchId].orders.length(); i++) {
            (address addr, uint256 amount) = batches[batchId].orders.at(i);
            addresses[i] = addr;
            amounts[i] = amount;    
        }
        dueDate = batches[batchId].dueDate;
        state = batches[batchId].state;
        creationDate = batches[batchId].creationDate;
        releasedDate = batches[batchId].releasedDate;
        paymentToken = batches[batchId].paymentToken; 
    }

    /*///////////////////////////////////////////////////////////////
                    PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates a new batch with specified attributes
     * @param addresses The list of addresses that will receive tokens
     * @param amounts The list of token ammounts that will be distributed with respect to the list of addresses
     * @param dueDate The date which tokens are unlocked and can be dispersed
     * @param paymentToken The token address of token to lock up and disperse
     */
    function createBatch(address[] memory addresses, uint256[] memory amounts, uint256 dueDate, address paymentToken) external onlyOwner {
        require(dueDate > block.timestamp, "Error: Invalid Due Date");
        require(addresses.length == amounts.length, "Error: length of addresses and amounts must be equal");
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Error: Invalid amount");
            require(addresses[i] != address(0), "Error: Address cannot be zero address");
            require(batches[totalBatches].orders.set(addresses[i], amounts[i]));
            total += amounts[i];
        }
        batches[totalBatches].dueDate = dueDate;
        batches[totalBatches].state = State.Pending;
        batches[totalBatches].creationDate = block.timestamp;
        batches[totalBatches].paymentToken = paymentToken;
        require(IERC20(paymentToken).transferFrom(msg.sender, address(this), total));
        totalBatches += 1;
    }

    /**
     * @notice Adds the addresses/amounts passed to the enumerableMap (order) in the batch
     * @param batchId The batch ID number
     * @param addresses The list of addresses that will receive tokens
     * @param amounts The list of token ammounts that will be distributed with respect to the list of addresses
     */
    function addOrderToBatch(uint256 batchId, address[] memory addresses, uint256[] memory amounts) external onlyOwner {
        require(addresses.length == amounts.length, "Error: length of addresses and amounts must be equal");
        require(batchId < totalBatches, "Error: Invalid batchId (batch does not exist)");
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Error: Invalid amount");
            require(addresses[i] != address(0), "Error: Address cannot be zero address");
            require(batches[batchId].orders.set(addresses[i], amounts[i]));
            total += amounts[i];
        }
        require(IERC20(batches[batchId].paymentToken).transferFrom(msg.sender, address(this), total));
    }

    /**
     * @notice Removes the addresses/amounts passed from the enumerableMap (order) in the batch
     * @param batchId The batch ID number
     * @param addresses The list of addresses that will receive tokens
     */
    function removeOrderFromBatch(uint256 batchId, address[] memory addresses) external onlyOwner {
        require(batchId < totalBatches, "Error: Invalid batchId (batch does not exist)");
        uint256 total;
        for (uint256 i = 0; i < addresses.length; i++) {
            total += batches[batchId].orders.get(addresses[i]);
            batches[batchId].orders.remove(addresses[i]);
        }
        require(IERC20(batches[batchId].paymentToken).transfer(msg.sender, total));
    }

    /**
     * @dev "Removes" a batch from batches
     *
     * Solidity does not support deletion of structs with enumerableMaps so
     * we are changing state to "Removed" preventing batch from being 
     * dispersed 
     *
     * @notice Updates an existing batch with specified attributes
     * @param batchId The batch ID number
     */
    function removeBatch(uint256 batchId) external onlyOwner {
        require(batchId < totalBatches, "Error: Invalid batchId (batch does not exist)");
        uint256 total;
        for (uint256 i = 0; i < batches[batchId].orders.length(); i++) {
            (address addr, uint256 amount) = batches[batchId].orders.at(i);
            total += amount;    
        }
        batches[batchId].state = State.Removed;
        require(IERC20(batches[batchId].paymentToken).transfer(msg.sender, total));
    }

    /**
     * @notice Disperses respective token amounts to the addresses in the batch 
     * if due date is passed
     * 
     * @param batchId The batch ID number
     */
    function disperseBatch(uint256 batchId) external {
        require(batchId < totalBatches, "Error: Invalid batchId (batch does not exist)");
        require(batches[batchId].state == State.Pending, "Error: Invalid batchId (batch removed or completed)");
        require(block.timestamp >= batches[batchId].dueDate, "Error: Batch due date not met");
        for (uint256 i = 0; i < batches[batchId].orders.length(); i++) {
            (address addr, uint256 amount) = batches[batchId].orders.at(i);
            require(IERC20(batches[batchId].paymentToken).transfer(addr, amount));
        }
        batches[batchId].state = State.Completed;
        batches[batchId].releasedDate = block.timestamp;
    }

}
