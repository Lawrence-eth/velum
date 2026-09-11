// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice Prototype authorization registry, not a custody/payment contract.
/// @dev Only the configured treasury registers/consumes; only an authenticated CRE workflow decides.
contract InvoiceGate {
    address public immutable treasury;
    address public immutable forwarder;
    bytes32 public immutable workflowId;
    enum Status { None, Pending, Approved, Rejected, Consumed }
    struct Request { bytes32 commitment; uint64 expiresAt; Status status; }
    mapping(bytes32 => Request) public requests;
    event Registered(bytes32 indexed requestId, bytes32 commitment, uint64 expiresAt);
    event Decided(bytes32 indexed requestId, bool approved);
    event Consumed(bytes32 indexed requestId);

    constructor(address treasury_, address forwarder_, bytes32 workflowId_) {
        require(treasury_ != address(0) && forwarder_ != address(0) && workflowId_ != bytes32(0), "Invalid configuration");
        treasury = treasury_; forwarder = forwarder_; workflowId = workflowId_;
    }
    modifier onlyTreasury() { require(msg.sender == treasury, "Treasury only"); _; }

    function register(bytes32 id, address recipient, address token, uint256 amount, uint64 expiresAt) external onlyTreasury {
        require(id != bytes32(0) && requests[id].status == Status.None, "Duplicate or zero ID");
        require(recipient != address(0) && token != address(0) && amount > 0, "Invalid payment");
        require(expiresAt > block.timestamp && expiresAt <= block.timestamp + 1 days, "Invalid expiry");
        bytes32 commitment = keccak256(abi.encode(id, block.chainid, address(this), recipient, token, amount, expiresAt));
        requests[id] = Request(commitment, expiresAt, Status.Pending);
        emit Registered(id, commitment, expiresAt);
    }

    function onReport(bytes calldata metadata, bytes calldata report) external {
        require(msg.sender == forwarder, "Forwarder only");
        require(metadata.length >= 62 && bytes32(metadata[:32]) == workflowId, "Wrong workflow");
        (bytes32 id, bytes32 commitment, bool approved, uint64 expiresAt) = abi.decode(report, (bytes32, bytes32, bool, uint64));
        Request storage r = requests[id];
        require(r.status == Status.Pending, "Not pending");
        require(r.commitment == commitment && r.expiresAt == expiresAt, "Payment mismatch");
        require(expiresAt > block.timestamp, "Expired");
        r.status = approved ? Status.Approved : Status.Rejected;
        emit Decided(id, approved);
    }

    // A treasury integration consumes approval atomically with its payment.
    // This prototype deliberately holds/transfers no assets.
    function consume(bytes32 id) external onlyTreasury {
        Request storage r = requests[id];
        require(r.status == Status.Approved && r.expiresAt > block.timestamp, "Not authorized");
        r.status = Status.Consumed;
        emit Consumed(id);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == this.onReport.selector;
    }
}
