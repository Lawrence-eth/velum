// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ISimulationReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @notice Sepolia demonstration only. Does not verify DON signatures or TEE execution.
/// @dev The owner pins the exact report hash because the public mock forwarder is unauthenticated.
contract SepoliaSimulationAdapter {
    address public immutable owner;
    address public immutable mockForwarder;
    bytes32 public immutable workflowId;
    address public receiver;
    bytes32 public expectedReportHash;
    bool public consumed;
    constructor(address owner_, address mockForwarder_, bytes32 workflowId_) {
        require(block.chainid == 11155111, "Sepolia only");
        require(owner_ != address(0) && mockForwarder_ != address(0) && workflowId_ != bytes32(0), "Invalid config");
        owner = owner_; mockForwarder = mockForwarder_; workflowId = workflowId_;
    }
    function authorize(address receiver_, bytes32 reportHash) external {
        require(msg.sender == owner && receiver == address(0), "Already configured or unauthorized");
        require(receiver_.code.length > 0 && reportHash != bytes32(0), "Invalid report target");
        receiver = receiver_; expectedReportHash = reportHash;
    }
    function onReport(bytes calldata, bytes calldata report) external {
        require(msg.sender == mockForwarder, "Mock forwarder only");
        require(receiver != address(0) && !consumed && keccak256(report) == expectedReportHash, "Unexpected report");
        consumed = true;
        ISimulationReceiver(receiver).onReport(abi.encodePacked(workflowId, bytes10(0), owner, bytes2(0)), report);
    }
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == ISimulationReceiver.onReport.selector;
    }
}
