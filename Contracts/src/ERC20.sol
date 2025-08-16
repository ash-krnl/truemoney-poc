// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {KRNL, KrnlPayload, KernelParameter, KernelResponse} from "./KRNL.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenContract is KRNL, ERC20 {

    address public contractOwner;
    
    // Token Authority public key as a constructor
    constructor(address _tokenAuthorityPublicKey) KRNL(_tokenAuthorityPublicKey) ERC20("TrueMoney", "TM") {
        contractOwner = msg.sender;
        _mint(msg.sender, 1000000 * 10**18); // Mint initial supply of 1 million tokens
    }

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not owner");
        _;
    }

    // Events for tracking transfers with risk assessment
    event TransferAssessed(
        address indexed from,
        address indexed to,
        uint256 amount,
        string status,
        bool allowed,
        uint256 timestamp
    );

    // Webhook response containing the actual decision
    struct WebhookResponse {
        string eventType; // "transaction.updated"
        WebhookPayload payload;
    }

    // The main payload with transaction decision - Sorted alphabetically for proper decoding
    struct WebhookPayload {
        // Fields must be in alphabetical order for proper decoding according to KRNL docs
        string createdAt;           // ISO format timestamp
        string customerId;          // UUID format
        string externalTransactionId; // Your original transaction ID
        string id;                  // Review ID
        string reason;              // Reason for the decision
        string riskLevel;           // "Low", "Medium", "High"
        uint256 riskScore;          // Risk score (0 if null/not available)
        string status;              // "pending", "approved", "rejected", "under_review"
        string transactionDate;     // ISO format timestamp
        string transactionId;       // ComPilot transaction ID
        string transactionType;     // "crypto" or "fiat"
        string updatedAt;           // ISO format timestamp
        string workspaceId;         // Workspace identifier
    }

    // Mapping to store transaction verification histories
    mapping(bytes32 => WebhookResponse) public transferAssessments;

    // Checks if a transfer is allowed based on KRNL payload
    function checkTransferAllowed(KrnlPayload memory krnlPayload, address from, address to, uint256 amount) internal returns (bool) {
        // Decode response from KRNL kernel
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        
        // Process the response
        for (uint i = 0; i < kernelResponses.length; i++) {
            // Replace with your actual Compilot kernel ID
            if (kernelResponses[i].kernelId == 1657) {
                // Decode the Compilot response
                WebhookResponse memory response = abi.decode(kernelResponses[i].result, (WebhookResponse));
                
                // Store the assessment for later reference using a unique hash
                bytes32 transferHash = keccak256(abi.encodePacked(from, to, amount, block.timestamp));
                transferAssessments[transferHash] = response;
                
                // Check if the transfer is allowed based on risk level
                bool allowed = false;
                if (keccak256(bytes(response.payload.status)) == keccak256(bytes("approved"))) {
                    allowed = true;
                }
                
                // Emit event to track the assessment
                emit TransferAssessed(from, to, amount, response.payload.status, allowed, block.timestamp);
                
                return allowed;
            }
        }
        
        return false;
    }

    // Get transfer assessment by hash
    function getTransferAssessment(bytes32 transferHash) external view returns (WebhookResponse memory) {
        return transferAssessments[transferHash];
    }
    
    // Admin function
    function setContractOwner(address _contractOwner) external onlyContractOwner {
        contractOwner = _contractOwner;
    }

    // Override ERC20 transfer function to ensure it's gatekept by KRNL
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        revert("Use transfer with KRNL payload");
    }
    
    // KRNL-gatekept transfer function
    function transferWithKRNL(address to, uint256 amount, KrnlPayload memory krnlPayload) external
        onlyAuthorized(krnlPayload, abi.encode(to, amount))
        returns (bool) {
        require(to != address(0), "ERC20: transfer to the zero address");
        
        // Check if the transfer is allowed based on risk assessment
        require(checkTransferAllowed(krnlPayload, _msgSender(), to, amount), "Transfer denied due to risk assessment");
        
        // Use the internal _transfer function from ERC20
        _transfer(_msgSender(), to, amount);
        return true;
    }
    
    // Override ERC20 transferFrom function to block direct transfers
    function transferFrom(address, address, uint256) public virtual override returns (bool) {
        revert("Use transferFrom with KRNL payload");
    }
    
    // KRNL-gatekept transferFrom function
    function transferFromWithKRNL(address from, address to, uint256 amount, KrnlPayload memory krnlPayload) external
        onlyAuthorized(krnlPayload, abi.encode(from, to, amount))
        returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        
        // Check if the transfer is allowed based on risk assessment
        require(checkTransferAllowed(krnlPayload, from, to, amount), "Transfer denied due to risk assessment");
        
        // Spend allowance before transfer
        _spendAllowance(from, _msgSender(), amount);
        
        // Use the internal _transfer function from ERC20
        _transfer(from, to, amount);
        return true;
    }
    
}