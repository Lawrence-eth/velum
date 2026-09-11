// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice Experimental CRE-gated treasury. Test tokens only; unaudited.
/// @dev One active batch; complete ordered manifest; payments consume approval atomically.
contract BatchTreasury {
    address public immutable owner;
    address public immutable forwarder;
    bytes32 public immutable workflowId;
    bytes32 public activeBatch;
    bytes32 public activeManifest;
    uint256 public unsettled;
    bool public decided;
    bool private entered;
    enum Status { None, Pending, Approved, Rejected, Paid, Cancelled }
    struct Payment { bytes32 id; address recipient; address token; uint256 amount; uint64 expiresAt; }
    struct Record { Payment payment; bytes32 commitment; Status status; }
    struct Decision { bytes32 requestId; bytes32 commitment; bool approved; uint64 expiresAt; }
    mapping(bytes32 => Record) public records;
    mapping(bytes32 => bool) public usedBatches;
    bytes32[] public activeIds;
    event BatchOpened(bytes32 indexed batchId, bytes32 manifest, uint256 count);
    event BatchDecided(bytes32 indexed batchId, uint256 approvedCount);
    event PaymentSettled(bytes32 indexed requestId, address indexed recipient, address token, uint256 amount);
    event BatchClosed(bytes32 indexed batchId);

    constructor(address owner_, address forwarder_, bytes32 workflowId_) {
        require(owner_ != address(0) && forwarder_ != address(0) && workflowId_ != bytes32(0), "Invalid configuration");
        owner = owner_; forwarder = forwarder_; workflowId = workflowId_;
    }
    modifier onlyOwner() { require(msg.sender == owner, "Owner only"); _; }
    modifier nonReentrant() { require(!entered, "Reentrancy"); entered = true; _; entered = false; }

    function openBatch(bytes32 batchId, Payment[] calldata payments) external onlyOwner nonReentrant {
        require(activeBatch == bytes32(0), "Another batch active");
        require(batchId != bytes32(0) && !usedBatches[batchId], "Batch reused");
        require(payments.length > 0 && payments.length <= 20, "Invalid batch size");
        bytes32[] memory commitments = new bytes32[](payments.length);
        for (uint256 i; i < payments.length; ++i) {
            Payment calldata p = payments[i];
            require(p.id != bytes32(0) && records[p.id].status == Status.None, "Request reused");
            require(p.recipient != address(0) && p.token.code.length > 0 && p.amount > 0, "Invalid payment");
            require(p.expiresAt > block.timestamp && p.expiresAt <= block.timestamp + 1 days, "Invalid expiry");
            commitments[i] = keccak256(abi.encode(p.id, block.chainid, address(this), p.recipient, p.token, p.amount, p.expiresAt));
            records[p.id] = Record(p, commitments[i], Status.Pending);
            activeIds.push(p.id);
        }
        usedBatches[batchId] = true;
        activeBatch = batchId;
        activeManifest = keccak256(abi.encode(commitments));
        decided = false;
        emit BatchOpened(batchId, activeManifest, payments.length);
    }

    function onReport(bytes calldata metadata, bytes calldata report) external nonReentrant {
        require(msg.sender == forwarder, "Forwarder only");
        require(metadata.length >= 62 && bytes32(metadata[:32]) == workflowId, "Wrong workflow");
        (bytes32 batchId, bytes32 manifest, Decision[] memory decisions) = abi.decode(report, (bytes32, bytes32, Decision[]));
        require(activeBatch != bytes32(0) && batchId == activeBatch && !decided, "Batch not pending");
        require(manifest == activeManifest && decisions.length == activeIds.length, "Manifest mismatch");
        for (uint256 i; i < decisions.length; ++i) {
            Decision memory d = decisions[i];
            require(d.requestId == activeIds[i], "Decision order mismatch");
            Record storage r = records[d.requestId];
            require(r.status == Status.Pending && r.commitment == d.commitment && r.payment.expiresAt == d.expiresAt, "Payment mismatch");
            require(d.expiresAt > block.timestamp, "Expired report");
            r.status = d.approved ? Status.Approved : Status.Rejected;
            if (d.approved) ++unsettled;
        }
        decided = true;
        emit BatchDecided(batchId, unsettled);
    }

    function settle(bytes32 requestId) external onlyOwner nonReentrant {
        Record storage r = records[requestId];
        require(r.status == Status.Approved && r.payment.expiresAt > block.timestamp, "Payment not authorized");
        r.status = Status.Paid;
        --unsettled;
        Payment memory p = r.payment;
        // Effects and transfer are one transaction. A revert restores authorization and counters.
        (bool success, bytes memory result) = p.token.call(abi.encodeWithSignature("transfer(address,uint256)", p.recipient, p.amount));
        require(success && (result.length == 0 || (result.length == 32 && abi.decode(result, (bool)))), "Token transfer failed");
        emit PaymentSettled(requestId, p.recipient, p.token, p.amount);
    }

    function closeBatch() external onlyOwner nonReentrant {
        require(activeBatch != bytes32(0) && decided && unsettled == 0, "Batch incomplete");
        _close();
    }

    // Revocation cancels only unspent requests. Already-paid requests remain permanently consumed.
    function cancelBatch() external onlyOwner nonReentrant {
        require(activeBatch != bytes32(0), "No active batch");
        for (uint256 i; i < activeIds.length; ++i) {
            Record storage r = records[activeIds[i]];
            if (r.status == Status.Pending || r.status == Status.Approved) r.status = Status.Cancelled;
        }
        unsettled = 0;
        _close();
    }
    function _close() private {
        emit BatchClosed(activeBatch);
        activeBatch = bytes32(0); activeManifest = bytes32(0); decided = false; delete activeIds;
    }
    function status(bytes32 id) external view returns (Status) { return records[id].status; }
    function supportsInterface(bytes4 id) external pure returns (bool) { return id == 0x01ffc9a7 || id == this.onReport.selector; }
}
